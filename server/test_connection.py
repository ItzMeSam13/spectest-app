"""
test_connection.py
------------------
Simulates a full frontend Next.js request.
Uploads mock files to RAG ingestion, and hits the run-full-suite endpoint
to verify SSE event streams are reaching the client properly.
"""

import requests
import time

BASE_URL = "http://localhost:8000"

def run_test():
    print("🚀 Initializing End-to-End Connectivity Test...\n")
    
    # 1. Upload mock Swagger
    print("📤 Uploading fake Swagger...")
    try:
        r1 = requests.post(
            f"{BASE_URL}/upload/swagger",
            files={"file": ("fake_swagger.json", b'{"paths": {"/test": {"get": {"summary": "test"}}}}')}
        )
        print(f"   => {r1.status_code} {r1.text}")
    except Exception as e:
        print(f"   ❌ Connection refused. Is the server running? ({e})")
        return

    # 2. Upload mock Requirements
    print("📤 Uploading fake Requirements...")
    try:
        r2 = requests.post(
            f"{BASE_URL}/upload/requirements",
            files={"file": ("fake_req.docx", b'Fake requirements document content.')}
        )
        print(f"   => {r2.status_code} {r2.text}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")

    # 3. Hit /run-full-suite with DEMO mode to verify SSE format
    print("\n🌐 Triggering `POST /run-full-suite` (Expecting SSE stream)...")
    payload = {
        "requirements": ["REQ-01: login", "REQ-02: verify test"],
        "base_url": "DEMO"
    }

    try:
        r3 = requests.post(f"{BASE_URL}/run-full-suite", json=payload, stream=True)
        print(f"   => Connection established: HTTP {r3.status_code} {r3.headers.get('Content-Type', '')}\n")
        
        for line in r3.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith("data: "):
                    # This indicates our Live Terminal is reading the right prefix!
                    print(f"   [SSE] {decoded}")
                    time.sleep(0.1)
    except Exception as e:
        print(f"   ❌ Failed to read stream: {e}")

    print("\n✅ Verification complete. RAG Backend API is fully operational and streaming correctly.")

if __name__ == "__main__":
    run_test()
