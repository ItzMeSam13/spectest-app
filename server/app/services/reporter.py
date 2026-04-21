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

class TestResult(BaseModel):
    endpoint: str
    method: str
    status: str  # PASS, FAIL, HEALED
    status_code: int
    details: str = ""

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
            model="gemini-2.5-flash",
            temperature=0.7,
            max_retries=3,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
        self._init_firebase()

    def _init_firebase(self):
        """Initializes Firebase Admin SDK if not already initialized."""
        try:
            firebase_admin.get_app()
        except ValueError:
            service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            if service_account_json:
                if service_account_json.startswith("{"):
                    import json
                    cred_dict = json.loads(service_account_json)
                    cred = credentials.Certificate(cred_dict)
                else:
                    cred = credentials.Certificate(service_account_json)
                firebase_admin.initialize_app(cred)
            else:
                # Fallback to PROJECT_ID from environment if possible
                project_id = os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") or "spectest-app"
                try:
                    # This may still fail if no ADC is present, but it's a better attempt
                    firebase_admin.initialize_app(options={'projectId': project_id})
                except Exception as e:
                    print(f"Warning: Firebase initialization failed: {str(e)}")
                    print("Persistence will likely fail without FIREBASE_SERVICE_ACCOUNT.")

    async def save_run_to_firebase(self, data: ReportData):
        """Saves run metadata and SpecScore to Firestore."""
        try:
            db = firestore.client()
            score = self.calculate_spec_score(data)
            
            doc_ref = db.collection("test_runs").document(data.run_id)
            doc_ref.set({
                "run_id": data.run_id,
                "timestamp": data.timestamp,
                "spec_score": score,
                "total_tests": len(data.results),
                "passed": sum(1 for r in data.results if r.status == "PASS"),
                "failed": sum(1 for r in data.results if r.status == "FAIL"),
                "healed": sum(1 for r in data.results if r.status == "HEALED"),
                "gaps": len(data.gaps),
                "coverage_percent": (data.requirements_covered / data.total_requirements * 100) if data.total_requirements > 0 else 0,
                "results": [r.dict() for r in data.results],
                "gap_details": [g.dict() for g in data.gaps],
                "recommendations": await self.generate_recommendations(data)
            })
            print(f"✓ Run {data.run_id} saved to Firebase.")
            return True
        except Exception as e:
            print(f"Firebase Save Error: {str(e)}")
            return False

    def calculate_spec_score(self, data: ReportData) -> float:
        """
        Calculates SpecScore™ (0-100).
        Formula: (Pass Rate * 0.6) + (Coverage * 0.4)
        """
        total_tests = len(data.results)
        if total_tests == 0:
            return 0.0
            
        passed_tests = sum(1 for r in data.results if r.status in ["PASS", "HEALED"])
        pass_rate = (passed_tests / total_tests) * 100
        
        coverage = (data.requirements_covered / data.total_requirements) * 100 if data.total_requirements > 0 else 0
        
        score = (pass_rate * 0.6) + (coverage * 0.4)
        return round(score, 1)

    async def generate_recommendations(self, data: ReportData) -> List[str]:
        """Uses Gemini to provide actionable recommendations based on failures."""
        failures = [r for r in data.results if r.status == "FAIL"]
        if not failures:
            return ["API health is optimal.", "Maintain current security protocols."]
            
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a Senior API Architect. Based on these test failures, provide 3 punchy, actionable recommendations."),
            ("human", (
                f"FAILURES:\n" + "\n".join([f"- {r.method} {r.endpoint}: {r.details}" for r in failures]) +
                "\n\nReturn ONLY a JSON array of strings. No bullets, no intro."
            ))
        ])
        
        chain = prompt | self.llm
        try:
            response = await chain.ainvoke({})
            # Naive extraction if it's not perfect JSON
            content = response.content.strip()
            if "[" in content and "]" in content:
                content = content[content.find("["):content.rfind("]")+1]
            return json.loads(content)
        except:
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
        except:
            return "SpecTest Audit automatically analyzed your API. Please refer to metrics below."

    async def generate_pdf_from_run_id(self, run_id: str, output_path: str) -> Optional[str]:
        """Fetches data from Firestore and generates a PDF on the fly."""
        try:
            db = firestore.client()
            doc_ref = db.collection("test_runs").document(run_id)
            doc_snap = doc_ref.get()
            
            if not doc_snap.exists:
                return None
                
            fire_data = doc_snap.to_dict()
            
            # Map Firestore data back to ReportData
            results = [
                TestResult(
                    endpoint=r.get("endpoint", ""),
                    method=r.get("method", ""),
                    status=r.get("status", ""),
                    status_code=r.get("status_code", 0),
                    details=r.get("details", "")
                ) for r in fire_data.get("results", [])
            ]
            
            gaps = [
                GapItem(
                    requirement_id=g.get("requirement_id", ""),
                    requirement_text=g.get("requirement_text", "")
                ) for g in fire_data.get("gap_details", [])
            ]
            
            report_data = ReportData(
                run_id=run_id,
                timestamp=fire_data.get("timestamp", datetime.now()),
                results=results,
                gaps=gaps,
                total_requirements=fire_data.get("total_tests", len(results)),
                requirements_covered=fire_data.get("total_tests", len(results)) # Fallback
            )
            
            return await self.generate_pdf_report(report_data, output_path)
            
        except Exception as e:
            print(f"Error generating PDF from Firestore: {str(e)}")
            return None

    def _clean_text(self, text: str) -> str:
        """Sanitizes text for FPDF to prevent Unicode encoding errors."""
        if not text:
            return ""
        # Replace common problematic characters
        replacements = {
            "™": "(TM)",
            "—": "-",
            "–": "-",
            "•": "*",
            "\u201c": '"',
            "\u201d": '"',
            "\u2018": "'",
            "\u2019": "'",
            "✓": "ok"
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        # Remove any other non-latin1 characters to be safe
        return text.encode('latin-1', 'ignore').decode('latin-1')

    async def generate_pdf_report(self, data: ReportData, output_path: str):
        """Generates a professional PDF report."""
        score = self.calculate_spec_score(data)
        summary = await self.generate_executive_summary(data, score)
        
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_fill_color(10, 14, 26) # Dark background
        pdf.rect(0, 0, 210, 40, 'F')
        pdf.set_font("Helvetica", "B", 24)
        pdf.set_text_color(0, 212, 255) # Cyan
        pdf.cell(190, 20, "SpecTest API Audit Report", ln=True, align='C')
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(123, 141, 176) # Gray
        pdf.cell(190, 10, self._clean_text(f"Run ID: {data.run_id} | Date: {data.timestamp.strftime('%Y-%m-%d %H:%M')}"), ln=True, align='C')
        
        pdf.ln(10)
        
        # SpecScore Section
        pdf.set_fill_color(240, 248, 255)
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(10, 14, 26)
        pdf.cell(190, 10, self._clean_text(f"Overall SpecScore(TM): {score}/100"), ln=True, align='C')
        pdf.ln(5)
        
        # Summary
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(190, 10, "Executive Summary", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(190, 5, self._clean_text(summary))
        pdf.ln(10)
        
        # Endpoints Table
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(190, 10, "Endpoint Status Report", ln=True)
        pdf.set_font("Helvetica", "B", 10)
        
        # Table Header
        pdf.set_fill_color(30, 45, 74)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(120, 10, "Endpoint", 1, 0, 'C', True)
        pdf.cell(30, 10, "Method", 1, 0, 'C', True)
        pdf.cell(40, 10, "Status", 1, 1, 'C', True)
        
        # Table Content
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(0, 0, 0)
        for r in data.results:
            pdf.cell(120, 8, self._clean_text(r.endpoint), 1)
            pdf.cell(30, 8, self._clean_text(r.method), 1, 0, 'C')
            
            # Color coding status
            if r.status == "PASS":
                pdf.set_text_color(0, 128, 0)
            elif r.status == "HEALED":
                pdf.set_text_color(255, 128, 0)
            else:
                pdf.set_text_color(255, 0, 0)
                
            pdf.cell(40, 8, self._clean_text(r.status), 1, 1, 'C')
            pdf.set_text_color(0, 0, 0)

        pdf.ln(10)
        
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
