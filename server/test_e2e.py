import requests
import json
import tempfile
import os
import time

BASE = "http://localhost:8000"

print("=" * 50)
print("END TO END PIPELINE TEST")
print("=" * 50)

# Step 1: Health
print("\n[1] Health check...")
try:
    r = requests.get(BASE + "/health")
    print(f"✅ Server OK: {r.json()}")
except Exception as e:
    print(f"❌ Server not running: {e}")
    exit()

# Step 2: Read actual routes
print("\n[2] Available docs...")
try:
    r = requests.get(BASE + "/docs")
    print(f"✅ Docs available at {BASE}/docs")
except:
    pass

# Step 3: Create test files
req_text = b"""
REQ-01: User must login with email and password
REQ-02: User must view their profile  
REQ-03: User must create an order
REQ-04: Admin must delete users
REQ-05: System returns JWT on successful login
"""

swagger_json = json.dumps({
    "openapi": "3.0.0",
    "info": {"title": "Test API", "version": "1.0"},
    "paths": {
        "/auth/login": {
            "post": {
                "summary": "Login user",
                "requestBody": {"content": {
                    "application/json": {"schema": {
                        "properties": {
                            "email": {"type": "string"},
                            "password": {"type": "string"}
                        }
                    }}
                }},
                "responses": {"200": {}, "401": {}}
            }
        },
        "/users/me": {
            "get": {
                "summary": "Get user profile",
                "security": [{"bearerAuth": []}],
                "responses": {"200": {}, "401": {}}
            }
        },
        "/orders": {
            "post": {
                "summary": "Create order",
                "security": [{"bearerAuth": []}],
                "requestBody": {"content": {
                    "application/json": {"schema": {
                        "properties": {
                            "user_id": {"type": "integer"},
                            "items": {"type": "array"}
                        }
                    }}
                }},
                "responses": {"201": {}, "400": {}}
            }
        }
    }
}).encode()

# Write temp files
with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
    f.write(req_text)
    req_path = f.name

with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
    f.write(swagger_json)
    sw_path = f.name

# Step 4: Correctly hit specific endpoints
print("\n[3] Testing upload endpoints...")

try:
    with open(req_path, 'rb') as rf:
        # Note: endpoint expects {"file": file_obj} and valid extensions (.docx, .pdf)
        r1 = requests.post(BASE + "/upload/requirements", files={"file": ("req.docx", rf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
        print(f"\nTried POST /upload/requirements => Status: {r1.status_code}")
        if r1.status_code == 200:
            print("✅ SUCCESS!")
        else:
            print(f"❌ ERROR: {r1.text}")

    with open(sw_path, 'rb') as sf:
        r2 = requests.post(BASE + "/upload/swagger", files={"file": ("swagger.json", sf, "application/json")})
        print(f"\nTried POST /upload/swagger => Status: {r2.status_code}")
        if r2.status_code == 200:
            print("✅ SUCCESS!")
        else:
            print(f"❌ ERROR: {r2.text}")

    # Finally run full suite which expects JSON, not files
    print("\n[4] Triggering RAG Pipeline /run-full-suite ...")
    r3 = requests.post(
        BASE + "/run-full-suite", 
        json={"requirements": ["REQ-01: User must login with email and password", "REQ-02: User must view profile"], "base_url": "DEMO"},
        stream=True
    )
    print(f"\nTried POST /run-full-suite => Status: {r3.status_code}")
    if r3.status_code == 200:
        print("✅ SUCCESS! Reading stream:")
        for line in r3.iter_lines():
            if line:
                print(line.decode('utf-8'))
                time.sleep(0.05)
    else:
        print(f"❌ ERROR: {r3.text}")

except Exception as e:
    print(f"Error: {e}")

os.unlink(req_path)
os.unlink(sw_path)

print("\n" + "=" * 50)
print("E2E TEST COMPLETE")
print("=" * 50)
