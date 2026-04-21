import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

# Load env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.services.reporter import ReporterService, ReportData, TestResult, GapItem

async def verify_reporter():
    print("--- Testing Reporter Service ---")
    
    # 1. Setup Mock Data
    data = ReportData(
        run_id="run_12345678",
        results=[
            TestResult(endpoint="/login", method="POST", status="PASS", status_code=200),
            TestResult(endpoint="/me", method="GET", status="HEALED", status_code=200, details="Fixed missing field"),
            TestResult(endpoint="/logout", method="POST", status="FAIL", status_code=500),
        ],
        gaps=[
            GapItem(requirement_id="REQ-09", requirement_text="User should be able to delete account.")
        ],
        total_requirements=4,
        requirements_covered=3
    )
    
    reporter = ReporterService()
    
    # 2. Test Scoring
    score = reporter.calculate_spec_score(data)
    print(f"Calculated SpecScore: {score}")
    # (2/3 * 0.6) + (3/4 * 0.4) = (0.66*0.6) + (0.75*0.4) = 0.4 + 0.3 = 0.7 (70%)
    assert score > 60
    
    # 3. Test PDF Generation
    output_pdf = "temp/audit_report_test.pdf"
    print(f"Generating PDF to {output_pdf}...")
    await reporter.generate_pdf_report(data, output_pdf)
    
    if os.path.exists(output_pdf):
        print("✓ PDF generated successfully!")
        print(f"File size: {os.path.getsize(output_pdf)} bytes")
    else:
        print("✗ PDF generation failed.")

if __name__ == "__main__":
    asyncio.run(verify_reporter())
