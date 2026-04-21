import asyncio
import os
import sys
import traceback
from dotenv import load_dotenv

root_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(root_dir, "server")
sys.path.insert(0, server_dir)

# Load environment variables FIRST
load_dotenv(os.path.join(root_dir, ".env"))

from app.services.reporter import ReporterService

async def test_pdf():
    try:
        reporter = ReporterService()
        
        from firebase_admin import firestore
        db = firestore.client()
        docs = list(db.collection("test_runs").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(1).get())
        
        if not docs:
            print("No runs found in Firestore.")
            return
        
        run_id = docs[0].id
        print(f"Testing PDF generation for Run ID: {run_id}")
        
        output_dir = os.path.join(root_dir, "tmp")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"SpecTest_Audit_Test_{run_id}.pdf")
        
        print("Generating PDF (this includes an LLM call)...")
        result = await reporter.generate_pdf_from_run_id(run_id, output_path)
        
        if result:
            print(f"Success! PDF generated at: {os.path.abspath(result)}")
        else:
            print("Failed to generate PDF.")
    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_pdf())
