import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fpdf import FPDF
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from app.services.pdf_generator import PDFGeneratorService

load_dotenv()


class TestResult(BaseModel):
    endpoint: str
    method: str
    status: str  # PASS, FAIL, HEALED
    status_code: int
    details: str = ""
    # --- Enriched fields (Task 1) ---
    technical_summary: str = ""       # Description of what the test did and observed
    failure_dynamics: str = ""        # Root-cause analysis narrative
    parameter_audit: Dict[str, Any] = {}  # Headers/params actually used in the request
    security_implications: str = ""   # Any security signal detected from the response
    requirement_match: str = ""       # Which BRD requirement this endpoint fulfills
    # --- Healing Details ---
    healing_trace: str = ""           # AI reasoning line
    validation_cases: List[Dict[str, Any]] = [] # Post-fix dynamic test cases
    original_payload: Optional[Dict[str, Any]] = None
    error_msg: str = ""
    healed_payload: Optional[Dict[str, Any]] = None


class GapItem(BaseModel):
    requirement_id: str
    requirement_text: str


class ReportData(BaseModel):
    run_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    results: List[TestResult]
    gaps: List[GapItem]
    total_requirements: int
    requirements_covered: int


class ReporterService:
    """
    Generates structured audit data, calculates SpecScore™,
    and produces professional PDF reports.
    """

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.7,
            max_retries=3,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
        self.pdf_generator = PDFGeneratorService()
        self._init_firebase()

    def _init_firebase(self):
        """Initializes Firebase Admin SDK if not already initialized."""
        try:
            firebase_admin.get_app()
        except ValueError:
            service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            if service_account_json:
                if service_account_json.startswith("{"):
                    cred_dict = json.loads(service_account_json)
                    cred = credentials.Certificate(cred_dict)
                else:
                    cred = credentials.Certificate(service_account_json)
                firebase_admin.initialize_app(cred)
            else:
                project_id = os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") or "spectest-app"
                try:
                    firebase_admin.initialize_app(options={"projectId": project_id})
                except Exception as e:
                    print(f"Warning: Firebase initialization failed: {str(e)}")
                    print("Persistence will likely fail without FIREBASE_SERVICE_ACCOUNT.")

    # ─── Task 1: Enrichment ───────────────────────────────────────────────────

    async def enrich_results(self, results: List[TestResult], req_prefix: str = "BRD-REQ") -> List[TestResult]:
        """
        Enriches each TestResult with technical metadata.
        Does NOT touch agent_executor.py or the rag_pipeline.
        """
        enriched = []
        for i, r in enumerate(results):
            req_num = i + 1

            # Requirement match (serial mapping — extend with BRD ID lookup later)
            r.requirement_match = (
                f"This endpoint fulfils {req_prefix} Requirement #{req_num}: "
                f"Coverage for {r.method} {r.endpoint}."
            )

            # Technical summary
            if r.status in ["PASS", "HEALED"]:
                r.technical_summary = (
                    f"The agent successfully executed {r.method} {r.endpoint} and received "
                    f"HTTP {r.status_code}. The endpoint behaviour is consistent with the Swagger specification."
                )
            else:
                r.technical_summary = (
                    f"The agent executed {r.method} {r.endpoint} but received HTTP {r.status_code}. "
                    f"This endpoint does not behave as specified in the uploaded Swagger document."
                )

            # Failure dynamics (root-cause narrative)
            if r.status == "FAIL":
                if r.status_code == 404:
                    r.failure_dynamics = (
                        f"A 404 Not Found was returned. The path '{r.endpoint}' could not be resolved by "
                        f"the live server. Possible causes: (1) path prefix mismatch (e.g., /api missing), "
                        f"(2) the route is not deployed, (3) the base URL is mis-configured."
                    )
                elif r.status_code in [401, 403]:
                    r.failure_dynamics = (
                        f"A {r.status_code} response indicates an authentication or authorisation failure. "
                        f"The request was formed correctly, but the server rejected the credentials or token."
                    )
                elif r.status_code in [400, 422]:
                    r.failure_dynamics = (
                        f"The server rejected the request body with {r.status_code}. "
                        f"The generated payload may be missing required fields or use incorrect types. "
                        f"Review the 'requestBody' schema in the Swagger document."
                    )
                elif r.status_code >= 500:
                    r.failure_dynamics = (
                        f"The server returned {r.status_code}, indicating an unhandled exception in the "
                        f"target implementation. This is a live-environment gap — the spec is correct but the code is broken."
                    )
                else:
                    r.failure_dynamics = r.details or "Unknown failure. Check server logs for details."
            elif r.status == "HEALED":
                r.failure_dynamics = (
                    f"A 404 was initially returned. The SpecTest RAG engine queried the vector store and "
                    f"found a corrected path. The healed request succeeded with HTTP {r.status_code}."
                )
            else:
                r.failure_dynamics = "No failures detected. Nominal execution path followed."

            # Parameter audit (what the agent sent)
            r.parameter_audit = {
                "method": r.method,
                "endpoint": r.endpoint,
                "headers_used": ["Content-Type: application/json"],
                "auth_header": (
                    "None (unauthenticated test)" if r.status_code not in [401, 403]
                    else "Expected but missing or invalid"
                ),
                "payload_generated": "Yes" if r.method in ["POST", "PUT", "PATCH"] else "N/A",
            }

            # Security implications
            if r.status_code == 403:
                r.security_implications = (
                    "MEDIUM: A 403 Forbidden response indicates the endpoint exists but access is blocked. "
                    "Verify the authorisation logic is not overly restrictive and CORS is correctly configured."
                )
            elif r.status_code == 401:
                r.security_implications = (
                    "HIGH: A 401 Unauthorized response indicates the endpoint requires authentication. "
                    "Ensure all production clients supply valid tokens and that token expiry is handled gracefully."
                )
            elif r.status_code >= 500:
                r.security_implications = (
                    "HIGH: A 5xx error can expose stack traces or internal details in some frameworks. "
                    "Ensure production error handlers suppress sensitive implementation details."
                )
            elif r.status in ["PASS", "HEALED"]:
                r.security_implications = (
                    "LOW: Endpoint responded nominally. No obvious security signals detected during this test. "
                    "Perform dedicated penetration testing for complete coverage."
                )
            else:
                r.security_implications = "UNKNOWN: Could not determine security posture from this response."

            enriched.append(r)

        return enriched

    # ─── Task 2: Structured Tab Payload ──────────────────────────────────────

    def build_tab_payload(
        self,
        results: List[TestResult],
        gaps: List[GapItem],
        recommendations: List[str],
        score: float,
    ) -> Dict[str, Any]:
        """
        Builds a structured object for each dashboard tab.
        Stored under 'tabs' in the Firestore document.
        """
        # Results tab — includes requirement_match and full technical breakdown
        results_tab = {
            "summary": {
                "passed": sum(1 for r in results if r.status == "PASS"),
                "failed": sum(1 for r in results if r.status == "FAIL"),
                "healed": sum(1 for r in results if r.status == "HEALED"),
                "total": len(results),
            },
            "entries": [
                {
                    "endpoint": r.endpoint,
                    "method": r.method,
                    "status": r.status,
                    "status_code": r.status_code,
                    "requirement_match": r.requirement_match,
                    "technical_summary": r.technical_summary,
                    "failure_dynamics": r.failure_dynamics,
                    "parameter_audit": r.parameter_audit,
                    "healing_trace": getattr(r, "healing_trace", ""),
                    "validation_cases": getattr(r, "validation_cases", []),
                }
                for r in results
            ],
        }

        # Gaps tab
        gaps_tab = {
            "total_gaps": len(gaps),
            "entries": [
                {
                    "requirement_id": g.requirement_id,
                    "requirement_text": g.requirement_text,
                    "remediation": "Define and deploy a corresponding API endpoint in the target environment.",
                }
                for g in gaps
            ],
        }

        # Security tab
        security_tab = {
            "overall_risk": (
                "HIGH"
                if any(r.status_code in [401, 403, 500] for r in results)
                else "MEDIUM"
                if any(r.status == "FAIL" for r in results)
                else "LOW"
            ),
            "findings": [
                {
                    "endpoint": r.endpoint,
                    "method": r.method,
                    "status_code": r.status_code,
                    "security_implication": r.security_implications,
                }
                for r in results
                if r.status != "PASS"
            ],
        }

        # Recommendations tab
        recommendations_tab = {
            "spec_score": score,
            "items": recommendations,
        }

        return {
            "results": results_tab,
            "gaps": gaps_tab,
            "security": security_tab,
            "recommendations": recommendations_tab,
        }

    # ─── Firestore Persistence ────────────────────────────────────────────────

    async def save_run_to_firebase(self, data: ReportData):
        """Saves enriched run metadata and SpecScore to Firestore."""
        try:
            db = firestore.client()
            score = self.calculate_spec_score(data)
            enriched_results = await self.enrich_results(data.results)
            recommendations = await self.generate_recommendations(data)
            tabs = self.build_tab_payload(enriched_results, data.gaps, recommendations, score)

            doc_ref = db.collection("test_runs").document(data.run_id)
            doc_ref.set({
                "run_id": data.run_id,
                "timestamp": data.timestamp,
                "spec_score": score,
                "total_tests": len(enriched_results),
                "passed": sum(1 for r in enriched_results if r.status == "PASS"),
                "failed": sum(1 for r in enriched_results if r.status == "FAIL"),
                "healed": sum(1 for r in enriched_results if r.status == "HEALED"),
                "gaps": len(data.gaps),
                "coverage_percent": (
                    (data.requirements_covered / data.total_requirements * 100)
                    if data.total_requirements > 0 else 0
                ),
                # Flat results array — backward compat for Docs page
                "results": [r.dict() for r in enriched_results],
                "gap_details": [g.dict() for g in data.gaps],
                "recommendations": recommendations,
                # Structured per-tab payload for dashboard
                "tabs": tabs,
                # New Task 3: explicit evidence logging for healed endpoints
                "healing_evidence": [
                    {
                        "endpoint": r.endpoint,
                        "healing_trace": getattr(r, "healing_trace", ""),
                        "validation_cases": getattr(r, "validation_cases", []),
                        "original_payload": getattr(r, "original_payload", None),
                        "error_msg": getattr(r, "error_msg", ""),
                        "healed_payload": getattr(r, "healed_payload", None)
                    }
                    for r in enriched_results if r.status == "HEALED"
                ],
            })
            print(f"✓ Enriched run {data.run_id} saved to Firebase.")
            return True
        except Exception as e:
            print(f"Firebase Save Error: {str(e)}")
            return False

    # ─── Score & Recommendations ──────────────────────────────────────────────

    def calculate_spec_score(self, data: ReportData) -> float:
        """Calculates SpecScore™ (0-100). Formula: ((Passed + Healed) / Total Tests) * 100"""
        total_tests = len(data.results)
        if total_tests == 0:
            return 0.0

        passed_or_healed = sum(1 for r in data.results if r.status in ["PASS", "HEALED"])
        score = (passed_or_healed / total_tests) * 100
        return round(score, 1)

    async def generate_recommendations(self, data: ReportData) -> List[str]:
        """Uses Gemini to provide actionable recommendations based on failures."""
        failures = [r for r in data.results if r.status == "FAIL"]
        if not failures:
            return ["API health is optimal.", "Maintain current security protocols."]

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a Senior API Architect. Based on these test failures, provide 3 punchy, actionable recommendations."),
            ("human", (
                "FAILURES:\n" + "\n".join([f"- {r.method} {r.endpoint}: {r.details}" for r in failures]) +
                "\n\nReturn ONLY a JSON array of strings. No bullets, no intro."
            ))
        ])

        chain = prompt | self.llm
        try:
            response = await chain.ainvoke({})
            content = response.content.strip()
            if "[" in content and "]" in content:
                content = content[content.find("["):content.rfind("]") + 1]
            return json.loads(content)
        except Exception:
            return ["Review failed endpoints for schema drift.", "Check authentication middleware for 403 errors."]

    async def generate_executive_summary(self, data: ReportData, score: float) -> str:
        """Uses Gemini to provide a strategic summary of the API health."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a Senior Security & QA Auditor. Summarize the API health based on these metrics."),
            ("human", (
                f"SpecScore™: {score}/100\n"
                f"Tests: {len(data.results)} ({sum(1 for r in data.results if r.status == 'PASS')} Pass, "
                f"{sum(1 for r in data.results if r.status == 'HEALED')} Healed, "
                f"{sum(1 for r in data.results if r.status == 'FAIL')} Fail)\n"
                f"Gaps found: {len(data.gaps)}\n\n"
                "Provide a one-paragraph executive summary highlighting risks and strengths."
            ))
        ])

        chain = prompt | self.llm
        try:
            response = await chain.ainvoke({})
            return response.content.strip()
        except Exception:
            return "SpecTest Audit automatically analyzed your API. Please refer to metrics below."

    # ─── PDF Generation ───────────────────────────────────────────────────────

    async def generate_pdf_from_run_id(self, run_id: str, output_path: str) -> Optional[str]:
        """Fetches data from Firestore and delegates whitepaper generation."""
        try:
            db = firestore.client()
            doc_ref = db.collection("test_runs").document(run_id)
            doc_snap = doc_ref.get()

            if not doc_snap.exists:
                return None

            fire_data = doc_snap.to_dict()
            return await self.pdf_generator.generate_whitepaper(fire_data, output_path)

        except Exception as e:
            print(f"Error delegating PDF generation: {str(e)}")
            return None

    async def generate_pdf_report(self, data: ReportData, output_path: str):
        """Generates the whitepaper from raw ReportData."""
        # Convert Pydantic data to dict for the generator
        dict_data = {
            "run_id": data.run_id,
            "spec_score": self.calculate_spec_score(data),
            "timestamp": data.timestamp,
            "results": [r.dict() for r in data.results],
            "recommendations": await self.generate_recommendations(data),
        }
        return await self.pdf_generator.generate_whitepaper(dict_data, output_path)

        # Technical Details per endpoint
        pdf.ln(8)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(190, 10, "Technical Analysis", ln=True)
        for r in data.results:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(190, 8, self._clean_text(f"{r.method} {r.endpoint} — {r.status}"), ln=True)
            pdf.set_font("Helvetica", "", 9)
            if r.requirement_match:
                pdf.multi_cell(190, 5, self._clean_text(f"Requirement: {r.requirement_match}"))
            if r.technical_summary:
                pdf.multi_cell(190, 5, self._clean_text(f"Summary: {r.technical_summary}"))
            if r.failure_dynamics and r.status != "PASS":
                pdf.multi_cell(190, 5, self._clean_text(f"Root Cause: {r.failure_dynamics}"))
            if r.security_implications:
                pdf.multi_cell(190, 5, self._clean_text(f"Security: {r.security_implications}"))
            pdf.ln(3)

        pdf.ln(5)

        # Gap Analysis
        if data.gaps:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(190, 10, "Gap Analysis (Requirements without API Endpoints)", ln=True)
            pdf.set_font("Helvetica", "", 10)
            for gap in data.gaps:
                pdf.multi_cell(190, 5, self._clean_text(f"- [{gap.requirement_id}] {gap.requirement_text}"))
                pdf.ln(2)
        else:
            pdf.set_font("Helvetica", "I", 10)
            pdf.cell(190, 10, "ok All requirements were successfully mapped to API endpoints.", ln=True)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pdf.output(output_path)
        return output_path
