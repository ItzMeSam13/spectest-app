import asyncio
import json
from app.core.context import ExecutionContext
from app.workers.test_runner import TestRunner
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
import threading
import time

from dotenv import load_dotenv
import os

# Load env from project root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# 1. Setup Mock API
app = FastAPI()

@app.post("/login")
async def login(request: Request):
    data = await request.json()
    if data.get("email") == "test@example.com":
        return {"access_token": "secret_token_123", "user_id": "user_99"}
    return JSONResponse(status_code=400, content={"error": "Invalid email"})

@app.get("/me")
async def get_me(request: Request):
    auth = request.headers.get("Authorization")
    if auth == "Bearer secret_token_123":
        return {"id": "user_99", "name": "Test User"}
    return JSONResponse(status_code=401, content={"error": "Unauthorized"})

def run_mock_api():
    uvicorn.run(app, host="127.0.0.1", port=9999)

# 2. Run Verification
async def verify_runner():
    print("--- Testing TestRunner with Mock API ---")
    
    # Start mock server in background
    thread = threading.Thread(target=run_mock_api, daemon=True)
    thread.start()
    time.sleep(2) # Wait for server to start

    ctx = ExecutionContext(base_url="http://127.0.0.1:9999")
    runner = TestRunner()
    
    # Mock plan
    plan = [
        {
            "step_number": 1,
            "endpoint": "/login",
            "method": "POST",
            "payload_schema": {"email": "test@example.com", "password": "pass"},
            "requires_auth": False,
            "extract_and_save": ["access_token"]
        },
        {
            "step_number": 2,
            "endpoint": "/me",
            "method": "GET",
            "payload_schema": {},
            "requires_auth": True,
            "extract_and_save": ["name"]
        }
    ]

    print("\nStarting execution...")
    async for log_line in runner.execute_suite(plan, ctx):
        # Parse and print logs
        if log_line.startswith("data: "):
            data = json.loads(log_line[6:])
            print(f"> {data['msg']}")

    assert ctx.get_variable("access_token") == "secret_token_123"
    assert ctx.get_variable("name") == "Test User"
    print("\n✓ Runner execution and variable capture passed!")

if __name__ == "__main__":
    asyncio.run(verify_runner())
