import os
from fpdf import FPDF

def generate_pdf_report(run_id: str, results_data: dict, spec_score: int) -> str:
    pdf = FPDF()
    pdf.add_page("P")
    
    # Cyberpunk background
    pdf.set_fill_color(15, 15, 20)
    pdf.rect(0, 0, 210, 297, "F")
    
    pdf.set_font("helvetica", "B", 26)
    pdf.set_text_color(0, 212, 255) # Cyan
    pdf.cell(190, 20, txt="SpecTest Run Report", new_x="LMARGIN", new_y="NEXT", align="C")
    
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(180, 180, 180)
    pdf.cell(190, 10, txt=f"Run ID: {run_id}", new_x="LMARGIN", new_y="NEXT", align="C")
    
    # Grade
    grade = "A"
    color = (0, 255, 0)
    if spec_score < 90:
        grade = "B"
        color = (255, 255, 0)
    if spec_score < 70:
        grade = "C"
        color = (255, 100, 0)
    
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 20)
    pdf.set_text_color(*color)
    pdf.cell(190, 10, txt=f"SpecScore: {spec_score} / 100 (Grade {grade})", new_x="LMARGIN", new_y="NEXT", align="C")
    
    pdf.ln(15)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 212, 255)
    pdf.cell(190, 10, txt="Functional Health", new_x="LMARGIN", new_y="NEXT", align="L")
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(255, 255, 255)
    
    for r in results_data.get("results", []):
        st = "PASS" if r.get("passed") else "FAIL"
        if r.get("self_healed"): st += " (Healed)"
        pdf.cell(190, 10, txt=f"[{st}] {r.get('method')} {r.get('endpoint')} -> HTTP {r.get('status_code')}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(10)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 212, 255)
    pdf.cell(190, 10, txt="Security Vulnerabilities", new_x="LMARGIN", new_y="NEXT", align="L")
    pdf.set_font("helvetica", "", 12)
    
    vulns = results_data.get("security", [])
    if not any(v.get("vulnerable") for v in vulns):
        pdf.set_text_color(0, 255, 0)
        pdf.cell(190, 10, txt="Safe - No vulnerabilities detected.", new_x="LMARGIN", new_y="NEXT")
    else:
        for v in vulns:
            if v.get("vulnerable"):
                pdf.set_text_color(255, 50, 50)
                pdf.cell(190, 10, txt=f"[VULNERABILITY] {v.get('attack_type')} on {v.get('endpoint')} ({v.get('severity')})", new_x="LMARGIN", new_y="NEXT")
                pdf.set_text_color(200, 200, 200)
                if "description" in v:
                    pdf.multi_cell(190, 8, txt=f"   {v['description']}", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 212, 255)
    pdf.cell(190, 10, txt="Recommendations", new_x="LMARGIN", new_y="NEXT", align="L")
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(255, 255, 255)
    
    for rec in results_data.get("recommendations", []):
        pdf.multi_cell(190, 8, txt=f"- {rec}", new_x="LMARGIN", new_y="NEXT")
    
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "exports"))
    os.makedirs(out_dir, exist_ok=True)
    filepath = os.path.join(out_dir, f"spectest_{run_id}.pdf")
    
    pdf.output(filepath)
    return filepath
