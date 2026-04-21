import asyncio
import os
import sys
from datetime import datetime

root_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(root_dir, "server")
sys.path.insert(0, server_dir)

from app.services.pdf_generator import PDFGeneratorService

async def test_mock_pdf():
    generator = PDFGeneratorService()
    
    mock_data = {
        "run_id": "test_mock_run_999",
        "spec_score": 75,
        "timestamp": datetime.now(),
        "results": [
            {
                "endpoint": "/api/v1/users",
                "method": "GET",
                "status": "PASS",
                "status_code": 200,
                "technical_summary": "Validated the retrieval of user list. Execution context confirmed pagination headers and record count consistency.",
                "failure_dynamics": "Runtime execution was nominal. Latency within acceptable 50ms window.",
                "security_implications": "Standard RBAC checks applied. Sensitive fields (password, hash) excluded from payload.",
                "requirement_match": "BRD-REQ-01: System must provide paginated user listing."
            },
            {
                "endpoint": "/api/v1/auth/login",
                "method": "POST",
                "status": "FAIL",
                "status_code": 403,
                "technical_summary": "Attempted authentication with standard credentials. Server rejected the request definitively.",
                "failure_dynamics": "Factor Analysis: The 'csrf-token' header was missing from the POST payload, causing an immediate middle-tier rejection.",
                "security_implications": "HIGH Mismatch: Possible unauthorized access block, but inconsistent with spec which doesn't mandate CSRF for this public route.",
                "requirement_match": "BRD-REQ-05: System must support secure user authentication.",
                "details": "Update the client to fetch CSRF token prior to POST /login or adjust server-side middleware to exempt the login route."
            },
            {
                "endpoint": "/api/v1/posts/1",
                "method": "PUT",
                "status": "HEALED",
                "status_code": 200,
                "technical_summary": "Self-healing agent detected path drift. Original spec called for /posts/{id}, but environment used /post/{id}.",
                "failure_dynamics": "Path healing was successful via RAG lookup in ChromaDB.",
                "security_implications": "Low risk, healed route still enforces POST ownership.",
                "requirement_match": "BRD-REQ-07: Post modification functional check.",
                "details": "RAG corrected /post/1 to /posts/1 automatically."
            }
        ],
        "recommendations": [
            "Sync environment with Swagger spec to avoid path drift in /posts.",
            "Standardize CSRF requirements across authentication endpoints.",
            "Implement rate limiting on the GET /users endpoint."
        ]
    }
    
    output_dir = os.path.join(root_dir, "tmp")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "SpecTest_Mock_Audit.pdf")
    
    print("Generating Mock Whitepaper (LLM analysis in progress)...")
    result = await generator.generate_whitepaper(mock_data, output_path)
    
    if result:
        print(f"Success! Mock PDF generated at: {os.path.abspath(result)}")
    else:
        print("Failed to generate Mock PDF.")

if __name__ == "__main__":
    asyncio.run(test_mock_pdf())
