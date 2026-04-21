import os
import json
from fpdf import FPDF
from datetime import datetime
from typing import List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

class PDFGeneratorService:
    """
    Generates a high-density technical whitepaper (PDF) for SpecTest audits.
    Supports two-column layouts, enriched fields, and LLM-driven analysis.
    """

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.4,
            max_retries=3,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )

    def _clean_text(self, text: str) -> str:
        """Sanitizes text for FPDF to prevent Unicode encoding errors."""
        if not text:
            return ""
        replacements = {
            "™": "(TM)", "—": "-", "–": "-", "•": "*",
            "\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'", "✓": "ok",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        # Fallback for other characters
        return text.encode("latin-1", "ignore").decode("latin-1")

    async def generate_executive_analysis(self, score: float, results_summary: str) -> str:
        """Generates a 2-paragraph executive assessment via Gemini."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a Senior API Architect and Security Auditor. Provide a high-level technical assessment for an audit whitepaper. You must respond with EXACTLY two professional paragraphs. No more, no less."),
            ("human", f"SpecScore: {score}/100\nResults Summary: {results_summary}\n\nFocus on technical assessment and strategic remediation. Use a formal tone.")
        ])
        
        chain = prompt | self.llm
        try:
            response = await chain.ainvoke({})
            return response.content.strip()
        except Exception as e:
            print(f"PDF LLM Analysis Error: {str(e)}")
            return "The SpecScore reflects a benchmark of runtime compliance against the provided specification. Strategic remediation is recommended for any identified logic drifts."

    async def generate_whitepaper(self, data: dict, output_path: str) -> Optional[str]:
        """Creates the professional high-density PDF."""
        try:
            # Prepare summary for LLM
            results = data.get("results", [])
            passed = sum(1 for r in results if r.get("status") == "PASS")
            healed = sum(1 for r in results if r.get("status") == "HEALED")
            failed = sum(1 for r in results if r.get("status") == "FAIL")
            score = data.get("spec_score", 0)
            
            results_summary = f"{passed} Passed, {healed} Healed, {failed} Failed out of {len(results)} tests."
            executive_summary = await self.generate_executive_analysis(score, results_summary)

            pdf = FPDF()
            pdf.add_page()
            
            # --- Header Block ---
            pdf.set_fill_color(10, 14, 26)
            pdf.rect(0, 0, 210, 45, "F")
            
            pdf.set_font("Helvetica", "B", 24)
            pdf.set_text_color(0, 212, 255)
            pdf.set_xy(10, 12)
            pdf.cell(190, 15, "SpecTest Technical Audit", ln=True, align="L")
            
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(123, 141, 176)
            run_id_short = data.get("run_id", "UNKNOWN")[:8]
            ts = data.get("timestamp")
            if isinstance(ts, dict): # Handle Firestore dict-like timestamp
                date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            elif isinstance(ts, datetime):
                date_str = ts.strftime("%Y-%m-%d %H:%M:%S")
            else:
                date_str = str(ts)
                
            pdf.set_xy(10, 27)
            pdf.cell(190, 5, f"Mission ID: {data.get('run_id')} | Generated: {date_str}", ln=True)
            
            # --- Vitals Dashboard ---
            pdf.set_xy(150, 15)
            pdf.set_font("Helvetica", "B", 30)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(50, 15, f"{score}", ln=True, align="C")
            pdf.set_xy(150, 30)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(123, 141, 176)
            pdf.cell(50, 5, "SPECSCORE(TM)", ln=True, align="C")
            
            pdf.set_y(55)
            
            # --- I. Executive Analysis ---
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(10, 14, 26)
            pdf.cell(190, 10, "I. Executive Analysis", ln=True)
            
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(60, 60, 60)
            pdf.multi_cell(190, 6, self._clean_text(executive_summary))
            pdf.ln(8)
            
            # --- II. Full Technical Audit ---
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(10, 14, 26)
            pdf.cell(190, 10, "II. Detailed Specification Analysis", ln=True)
            pdf.ln(2)

            for i, r in enumerate(results):
                # Page Break handling (approximate)
                if pdf.get_y() > 240:
                    pdf.add_page()
                    pdf.set_y(20)

                # Endpoint Header
                pdf.set_font("Helvetica", "B", 12)
                method = r.get("method", "GET")
                endpoint = r.get("endpoint", "/")
                status = r.get("status", "FAIL")
                
                # Colors based on status
                if status == "PASS": pdf.set_text_color(0, 150, 80)
                elif status == "HEALED": pdf.set_text_color(200, 120, 0)
                else: pdf.set_text_color(200, 0, 0)
                
                pdf.cell(190, 10, self._clean_text(f"{method} {endpoint} [{status} - {r.get('status_code')}]"), ln=True)
                
                # Reset color for content
                pdf.set_text_color(60, 60, 60)
                pdf.set_font("Helvetica", "", 10)
                
                start_y = pdf.get_y()
                
                # --- Column 1: Execution & Requirement ---
                pdf.set_font("Helvetica", "B", 9)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(90, 5, "EXECUTION LOGIC", ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(60, 60, 60)
                logic_text = r.get("technical_summary") or "Evaluation of runtime adherence to OpenAPI specification and business requirements."
                pdf.multi_cell(90, 5, self._clean_text(logic_text))
                
                logic_end_y = pdf.get_y()
                
                req_match = r.get("requirement_match")
                if req_match:
                    pdf.ln(2)
                    pdf.set_font("Helvetica", "BI", 9)
                    pdf.set_text_color(123, 97, 255)
                    pdf.multi_cell(90, 4, self._clean_text(req_match))
                
                col1_end_y = pdf.get_y()
                
                # --- Column 2: Factors & Security ---
                pdf.set_xy(105, start_y)
                pdf.set_font("Helvetica", "B", 9)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(90, 5, "ENVIRONMENTAL FACTORS", ln=True)
                pdf.set_xy(105, pdf.get_y())
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(60, 60, 60)
                factor_text = r.get("failure_dynamics") or "Nominal execution environment. No interference detected."
                pdf.multi_cell(90, 5, self._clean_text(factor_text))
                
                pdf.set_x(105)
                pdf.ln(2)
                pdf.set_x(105)
                pdf.set_font("Helvetica", "B", 9)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(90, 5, "SECURITY IMPLICATIONS", ln=True)
                pdf.set_xy(105, pdf.get_y())
                pdf.set_font("Helvetica", "", 10)
                security_text = r.get("security_implications") or "No immediate security signals identified."
                pdf.multi_cell(90, 5, self._clean_text(security_text))
                
                col2_end_y = pdf.get_y()
                
                # Find Max Y
                max_y = max(col1_end_y, col2_end_y)
                pdf.set_y(max_y + 4)
                
                # --- Resolution Path (Highlighted Box if FAIL/HEALED) ---
                if status != "PASS":
                    res_path = r.get("details") or "N/A"
                    pdf.set_fill_color(255, 248, 240) if status == "HEALED" else pdf.set_fill_color(255, 240, 240)
                    pdf.set_draw_color(255, 180, 0) if status == "HEALED" else pdf.set_draw_color(255, 0, 0)
                    
                    pdf.set_font("Helvetica", "B", 10)
                    pdf.cell(190, 6, "RESOLUTION PATH", 0, 1, "L", True)
                    pdf.set_font("Helvetica", "", 10)
                    pdf.multi_cell(190, 5, self._clean_text(res_path), "LRB", "L", True)
                    pdf.ln(4)
                
                pdf.set_draw_color(230, 230, 230)
                pdf.line(10, pdf.get_y(), 200, pdf.get_y())
                pdf.ln(6)

            # --- III. Strategic Roadmap ---
            recs = data.get("recommendations", [])
            if recs:
                if pdf.get_y() > 220: pdf.add_page()
                pdf.set_font("Helvetica", "B", 14)
                pdf.set_text_color(10, 14, 26)
                pdf.cell(190, 10, "III. Strategic Remediation Roadmap", ln=True)
                pdf.ln(2)
                
                pdf.set_font("Helvetica", "", 11)
                pdf.set_text_color(60, 60, 60)
                for i, rec in enumerate(recs):
                    pdf.multi_cell(180, 6, f"{i+1}. {self._clean_text(rec)}")
                    pdf.ln(2)

            # Footer on each page
            total_pages = pdf.page_no()
            for p in range(1, total_pages + 1):
                pdf.page = p
                pdf.set_y(-15)
                pdf.set_font("Helvetica", "I", 8)
                pdf.set_text_color(150, 150, 150)
                pdf.cell(0, 10, f"Proprietary SpecTest Audit Report - Page {p} of {total_pages}", 0, 0, "C")

            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            pdf.output(output_path)
            return output_path

        except Exception as e:
            print(f"Whitepaper Generation Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
