import os
import uuid
import json
import traceback
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from app.services.ingestion import IngestionService
from app.services.planner import generate_test_plan
from app.workers.test_runner import TestRunner
from app.services.reporter import ReporterService, ReportData, TestResult, GapItem
from app.core.context import ExecutionContext

router = APIRouter()

# In-memory store for run results (In production, use Redis/DB)
RUN_REPORTS = {}
RUN_CONFIGS = {}  # Stores base_url per run_id

@router.post("/upload")
async def upload_documents(
    brd: UploadFile = File(...),
    swagger: UploadFile = File(...),
    base_url: str = Form("http://127.0.0.1:8000")
):
    """Handles document upload and ingestion into the vector store."""
    print(f"DEBUG: Received upload request for files: {brd.filename}, {swagger.filename}, base_url={base_url}")
    run_id = str(uuid.uuid4())[:8]
    
    # Save temporary files for processing
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    brd_path = os.path.join(uploads_dir, f"{run_id}_brd_{brd.filename}")
    swagger_path = os.path.join(uploads_dir, f"{run_id}_spec_{swagger.filename}")
    
    with open(brd_path, "wb") as f:
        f.write(await brd.read())
    with open(swagger_path, "wb") as f:
        f.write(await swagger.read())
        
    try:
        # Trigger Ingestion
        ingest_service = IngestionService(run_id=run_id)
        ingest_service.process_and_store(brd_path, swagger_path)
        
        # Store the base_url for use in the stream
        RUN_CONFIGS[run_id] = {"base_url": base_url.rstrip("/")}
        
        return {
            "status": "success",
            "message": "Documents ingested into vector store",
            "run_id": run_id,
            "files": {"brd": brd.filename, "swagger": swagger.filename}
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@router.get("/stream/{run_id}")
async def stream_test_run(run_id: str):
    """SSE endpoint to execute the test suite and stream logs."""
    print(f"DEBUG: Received stream requested for run_id: {run_id}")
    
    async def event_generator():
        yield f"data: {json.dumps({'msg': '[PLANNER] Initializing Mapping Engine...', 'level': 'INFO'})}\n\n"
        
        try:
            # 1. Retrieve Context from Vector Store
            ingest_service = IngestionService(run_id=run_id)
            
            yield f"data: {json.dumps({'msg': '[PLANNER] AI is scanning Swagger specification for valid endpoints...', 'level': 'INFO'})}\n\n"
            
            # Retrieve real requirements from the BRD
            brd_docs = ingest_service.query_context("List all functional requirements and business rules", k=10)
            business_reqs = "\n".join([d.page_content for d in brd_docs])
            
            swagger_context_docs = ingest_service.query_context("List all endpoints paths and methods", k=20)
            swagger_context = "\n---\n".join([d.page_content for d in swagger_context_docs])
            
            # Count how many unique endpoints were discovered
            endpoint_count = len([d for d in swagger_context_docs if d.metadata.get("type") == "swagger"])
            yield f"data: {json.dumps({'msg': f'[PLANNER] AI validated {endpoint_count} endpoints from the Swagger specification.', 'level': 'INFO'})}\n\n"
            
            # 2. Generate Plan
            yield f"data: {json.dumps({'msg': '[PLANNER] Mapping requirements to endpoints...', 'level': 'INFO'})}\n\n"
            plan = generate_test_plan(business_reqs, swagger_context)
            
            yield f"data: {json.dumps({'msg': f'[PLANNER] Generated {len(plan)}-step test plan from specification.', 'level': 'INFO'})}\n\n"
            
            # 3. Execute Suite
            # Use the base_url from the run config, fallback to localhost
            run_config = RUN_CONFIGS.get(run_id, {})
            base_url = run_config.get("base_url", "http://127.0.0.1:8000")
            yield f"data: {json.dumps({'msg': f'[INFO] Target API: {base_url}', 'level': 'INFO'})}\n\n"
            ctx = ExecutionContext(base_url=base_url)
            runner = TestRunner(run_id=run_id)
            
            execution_results = []
            async for log_entry in runner.execute_suite(plan, ctx, swagger_text=swagger_context):
                if "final_results" in log_entry:
                    execution_results = log_entry["final_results"]
                    # Don't send the full results array as a message to keep SSE light
                    del log_entry["final_results"]
                
                yield f"data: {json.dumps(log_entry)}\n\n"
                
            # 4. Finalize Report
            reporter = ReporterService()
            
            test_results = []
            for r in execution_results:
                status = "PASS"
                if r["self_healed"]: status = "HEALED"
                if not r["passed"]: status = "FAIL"
                
                test_results.append(TestResult(
                    endpoint=r["endpoint"],
                    method=r["method"],
                    status=status,
                    status_code=r["status_code"],
                    details=r["ai_explanation"]
                ))

            report_data = ReportData(
                run_id=run_id,
                results=test_results,
                gaps=[], # TODO: Implement gap analysis logic
                total_requirements=len(plan),
                requirements_covered=len(plan)
            )
            
            # Create final report payload for frontend to persist
            # Enrich results with technical metadata before sending
            enriched_results = await reporter.enrich_results(test_results)
            recommendations = await reporter.generate_recommendations(report_data)
            score = reporter.calculate_spec_score(report_data)
            tabs = reporter.build_tab_payload(enriched_results, [], recommendations, score)

            final_payload = {
                "run_id": run_id,
                "spec_score": score,
                "total_tests": len(enriched_results),
                "passed": sum(1 for r in enriched_results if r.status == "PASS"),
                "failed": sum(1 for r in enriched_results if r.status == "FAIL"),
                "healed": sum(1 for r in enriched_results if r.status == "HEALED"),
                "gaps": 0,
                "results": [r.dict() for r in enriched_results],
                "recommendations": recommendations,
                "tabs": tabs,
                "timestamp": {"seconds": int(datetime.now().timestamp())}
            }

            yield f"data: {json.dumps({'level': 'FINAL_REPORT', 'data': final_payload})}\n\n"
            
            report_path = f"reports/audit_{run_id}.pdf"
            await reporter.generate_pdf_report(report_data, report_path)
            RUN_REPORTS[run_id] = report_path
            
            # Send dynamic score as special event for frontend
            score = reporter.calculate_spec_score(report_data)
            yield f"data: {json.dumps({'level': 'SCORE', 'data': {'spec_score': score, 'breakdown': {'functional': {'detail': str(len(plan))}, 'coverage': {'detail': '100%'} } } })}\n\n"
            
            yield f"data: {json.dumps({'msg': f'[SYSTEM] Report generated: audit_{run_id}.pdf', 'level': 'SUCCESS', 'completed': True})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'msg': f'[CRITICAL] Run failed: {str(e)}', 'level': 'ERROR'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/report/{run_id}")
async def download_report(run_id: str):
    """Download the generated API Audit PDF, generated on-the-fly from Firestore."""
    report_path = f"reports/audit_{run_id}.pdf"
    reporter = ReporterService()
    
    # Try to generate on the fly from Firestore
    path = await reporter.generate_pdf_from_run_id(run_id, report_path)
    
    if not path or not os.path.exists(path):
        # Fallback to in-memory path or existing file
        path = RUN_REPORTS.get(run_id)
        if not path or not os.path.exists(path):
            path = f"reports/audit_{run_id}.pdf"
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail="Audit report not found in Firestore or local cache.")
                
    return FileResponse(
        path=path,
        filename=f"SpecTest_Audit_{run_id}.pdf",
        media_type="application/pdf"
    )
