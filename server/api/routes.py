from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import os
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI

import core.processor as dp
import core.executor as ex
import core.fuzzer as fuzzer
import utils.scoring as ss
from utils.logger import sse_event

router = APIRouter()

class MapRequest(BaseModel):
    requirements: list[str]

class MapResponse(BaseModel):
    mapping: dict

class RunSuiteRequest(BaseModel):
    requirements: list[str] = []
    base_url: str


def _build_llm():
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is not set.")
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=0.0,
    )

def _check_extension(filename: str, allowed: set) -> str:
    _, ext = os.path.splitext(filename.lower())
    if ext not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{ext}' not supported. Allowed: {allowed}",
        )
    return ext


@router.post("/upload/requirements", tags=["Ingestion"])
async def upload_requirements(file: UploadFile = File(...)):
    _check_extension(file.filename, {".pdf", ".docx", ".doc", ".txt"})
    content = await file.read()
    chunks = dp.load_requirements(content, file.filename)
    dp.add_to_vector_store(chunks)
    return {"message": "Requirements loaded successfully", "chunks_added": len(chunks), "total_docs": dp.get_doc_count()}


@router.post("/upload/swagger", tags=["Ingestion"])
async def upload_swagger(file: UploadFile = File(...)):
    _check_extension(file.filename, {".json", ".yaml", ".yml"})
    content = await file.read()
    chunks = dp.load_swagger(content, file.filename)
    dp.add_to_vector_store(chunks)
    return {"message": "Swagger/OpenAPI loaded successfully", "chunks_added": len(chunks), "total_docs": dp.get_doc_count()}


@router.post("/map", response_model=MapResponse, tags=["RAG"])
def map_requirements(body: MapRequest):
    if dp.get_vectorstore() is None:
        raise HTTPException(status_code=400, detail="Vector store is empty.")
    if not body.requirements:
        raise HTTPException(status_code=400, detail="No requirements provided.")
    llm = _build_llm()
    chain = dp.get_rag_chain(llm)
    req_block = "\n".join(f"  - {r}" for r in body.requirements)
    query = (f"Map each requirement to the best-matching HTTP method + path from the Swagger spec:\n"
             f"{req_block}\n\nOutput format: {{\"REQ-ID\": \"METHOD /path\", ...}}\n"
             f"Return ONLY a valid JSON object. No markdown.")
    try:
        result = chain.invoke({"query": query})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    raw = result.get("result", "") if isinstance(result, dict) else str(result)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.lower().startswith("json"): raw = raw[4:]
    try:
        mapping = json.loads(raw.strip())
    except json.JSONDecodeError:
        mapping = {"raw_response": raw}
    return MapResponse(mapping=mapping)


def _demo_events():
    import time
    demo = [
        {"msg": "🧠 [PLANNER] RAG analysis starting...", "level": "PLANNER"},
        {"msg": "✅ [PLANNER] Mapping complete.", "level": "PLANNER", "data": {"mapping": {"REQ-01": "POST /auth/login", "REQ-02": "GET /users/me", "REQ-03": "DELETE /users/{id}", "REQ-04": "PUT /posts/{id}"}}},
        {"msg": "🧠 Execution engine started.", "level": "PLANNER"},
        {"msg": "📦 REQ-01: Payload ready.", "level": "EXECUTOR", "req_id": "REQ-01", "data": {"payload": {"email": "demo@test.com", "password": "Passw0rd!"}}},
        {"msg": "🚀 REQ-01: Firing POST /auth/login...", "level": "EXECUTOR", "req_id": "REQ-01"},
        {"msg": "✅ REQ-01: POST /auth/login → HTTP 200", "level": "RESULT", "req_id": "REQ-01", "data": {"status": 200, "success": True, "body": {"token": "eyJhbGciOiJSUzI1..."}}},
        {"msg": "🚀 REQ-02: Firing GET /users/me...", "level": "EXECUTOR", "req_id": "REQ-02"},
        {"msg": "✅ REQ-02: GET /users/me → HTTP 200", "level": "RESULT", "req_id": "REQ-02", "data": {"status": 200, "success": True}},
        {"msg": "🚀 REQ-03: Firing DELETE /users/{id}...", "level": "EXECUTOR", "req_id": "REQ-03"},
        {"msg": "🔧 REQ-03: HTTP 422 — activating self-heal...", "level": "REVIEWER", "req_id": "REQ-03"},
        {"msg": "[REVIEWER] ↻ Self-healed: Documentation drift detected and corrected. DELETE /users/{id} → HTTP 204", "level": "REVIEWER", "req_id": "REQ-03", "data": {"status": 204, "success": True}},
        {"msg": "🚀 REQ-04: Firing PUT /posts/{id}...", "level": "EXECUTOR", "req_id": "REQ-04"},
        {"msg": "✅ REQ-04: PUT /posts/{id} → HTTP 200", "level": "RESULT", "req_id": "REQ-04", "data": {"status": 200, "success": True}},
        {"msg": "🏁 Functional suite complete: 4/4 passed. (1 self-healed)", "level": "PLANNER"},
        {"msg": "🔐 Security Scanner starting adversarial pass...", "level": "SECURITY"},
        {"msg": "✅ [SECURITY] SQLi safe (400) on /auth/login", "level": "SECURITY", "vulnerable": False},
        {"msg": "✅ [SECURITY] XSS safe (400) on /auth/login", "level": "SECURITY", "vulnerable": False},
        {"msg": "✅ [SECURITY] Auth enforced (401) on /users/me", "level": "SECURITY", "vulnerable": False},
        {"msg": "🏁 Security scan complete: 8/9 checks passed, 1 vulnerability found.", "level": "SECURITY", "vulnerable": True, "data": {"security_summary": {"total_checks": 9, "passed": 8, "vulnerabilities_found": 1, "details": [{"type": "NO_AUTH_BYPASS", "endpoint": "GET /public/health", "status": 200}]}}},
        {"msg": "🥈 Silver SpecScore™: 82/100 (Grade B)", "level": "SCORE", "data": {"spec_score": 82, "grade": "B", "badge": "🥈 Silver", "breakdown": {"coverage": {"score": 100, "label": "Requirement Coverage", "detail": "4/4 mapped", "weight": "30%"}, "functional": {"score": 100, "label": "Functional Health", "detail": "4/4 passed (1 self-healed)", "weight": "35%"}, "security": {"score": 89, "label": "Security Posture", "detail": "8/9 checks passed", "weight": "25%"}, "documentation": {"score": 85, "label": "Documentation Health", "detail": "1 issue (drift)", "weight": "10%"}}, "gaps": [], "vulnerabilities": [{"type": "NO_AUTH_BYPASS", "endpoint": "GET /public/health"}], "healed_count": 1}},
    ]
    for event in demo:
        yield f"data: {json.dumps(event)}\n\n"


@router.post("/run-full-suite", tags=["RAG"])
async def run_full_suite(body: RunSuiteRequest):
    if body.base_url != "DEMO":
        store = dp.get_vectorstore()
        if store is None:
            raise HTTPException(status_code=400, detail="Vector store is empty.")
        
        if not body.requirements:
            # Dynamically pull all uploaded requirements chunks directly from DB context
            docs = store.get(where={"source": "requirements"})
            if docs and docs.get("documents"):
                body.requirements = docs["documents"]

        if not body.requirements:
            raise HTTPException(status_code=400, detail="No requirements provided or found in DB.")

    async def event_generator():
        if body.base_url == "DEMO":
            for event in _demo_events(): yield event
            return

        yield sse_event("🧠 [PLANNER] RAG analysis starting...", "PLANNER")
        try:
            llm = _build_llm()
            chain = dp.get_rag_chain(llm)
            req_block = "\n".join(f"  - {r}" for r in body.requirements)
            query = (f"Map each requirement to the best-matching HTTP method + path from the Swagger spec:\n"
                     f"{req_block}\n\nOutput format: {{\"REQ-ID\": \"METHOD /path\", ...}}\nReturn ONLY a valid JSON object. No markdown.")
            rag_result = chain.invoke({"query": query})
        except Exception as e:
            # Re-raise to let the global exception handler catch and stream an ERROR event
            raise e

        raw = rag_result.get("result", "") if isinstance(rag_result, dict) else str(rag_result)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.lower().startswith("json"): raw = raw[4:]
        try:
            mapping = json.loads(raw.strip())
        except json.JSONDecodeError:
            yield sse_event(f"⚠️ Could not parse mapping JSON. Raw output: {raw}", "ERROR")
            return

        yield sse_event("✅ [PLANNER] Mapping complete.", "PLANNER", data={"mapping": mapping})

        swagger_context = dp.get_swagger_flat_text()
        executor = ex.TestExecutor(body.base_url)
        async for event in executor.stream_suite(mapping, swagger_context):
            yield event

        functional_results = getattr(executor, "_last_results", [])

        security_summary: Dict[str, Any] = {"total_checks": 0, "passed": 0, "vulnerabilities_found": 0, "details": []}
        scanner = fuzzer.SecurityScanner(body.base_url)
        async for event in scanner.scan(mapping):
            yield event
            try:
                parsed = json.loads(event.replace("data: ", "").strip())
                if "data" in parsed and "security_summary" in parsed["data"]:
                    security_summary = parsed["data"]["security_summary"]
            except Exception: pass

        score_data = ss.compute_spec_score(mapping, functional_results, security_summary)
        yield sse_event(f"{score_data['badge']} SpecScore™: {score_data['spec_score']}/100 (Grade {score_data['grade']})", "SCORE", data=score_data)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/cleanup", tags=["System"])
def cleanup():
    dp.reset_vector_store()
    ex.reset_context()
    return {"message": "Vector store and context store cleared. Ready for a new test run."}

@router.get("/health", tags=["System"])
def health_check():
    store = dp.get_vectorstore()
    docs = dp.get_doc_count()
    return {
        "status": "ok",
        "vector_store_ready": store is not None,
        "docs_loaded": docs,
    }

@router.get("/results/{run_id}/export", tags=["Reports"])
def export_results_pdf(run_id: str):
    from fastapi.responses import FileResponse
    from utils.reporter import generate_pdf_report
    
    mock_results = {
        "spec_score": 82,
        "results": [
            {"passed": True, "method": "POST", "endpoint": "/auth/login", "status_code": 200},
            {"passed": True, "method": "GET", "endpoint": "/users/me", "status_code": 200},
            {"self_healed": True, "passed": True, "method": "DELETE", "endpoint": "/users/{id}", "status_code": 204},
            {"passed": True, "method": "PUT", "endpoint": "/posts/{id}", "status_code": 200},
        ],
        "security": [
            {"vulnerable": False, "attack_type": "SQL Injection", "severity": "pass", "endpoint": "/auth/login"},
            {"vulnerable": False, "attack_type": "XSS", "severity": "pass", "endpoint": "/auth/login"},
            {"vulnerable": False, "attack_type": "No Auth", "severity": "pass", "endpoint": "/users/me"},
            {"vulnerable": True, "attack_type": "No Auth", "severity": "high", "endpoint": "GET /public/health", "description": "Bypassed missing auth header completely"}
        ],
        "recommendations": [
            "Add Authentication to GET /public/health endpoints.",
            "Fix Swagger documentation drift on DELETE /users/{id}. Server currently rejects documented payload but accepts corrected payload.",
            "Great overall score!"
        ]
    }
    
    pdf_path = generate_pdf_report(run_id, mock_results, mock_results["spec_score"])
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF generation failed")
    
    return FileResponse(pdf_path, media_type='application/pdf', filename=f"spectest_{run_id}.pdf")

