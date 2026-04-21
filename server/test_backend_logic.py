import os
import json
from dotenv import load_dotenv

# Load env from project root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.context import ExecutionContext
from app.services.planner import generate_test_plan

def test_context():
    print("--- Testing ExecutionContext ---")
    ctx = ExecutionContext(base_url="https://api.example.com")
    
    # Test variables
    ctx.save_variable("user_id", "12345")
    assert ctx.get_variable("user_id") == "12345"
    print("✓ Variable saving/retrieval passed")
    
    # Test auth
    ctx.set_global_auth("global-secret")
    assert ctx.get_auth_header()["Authorization"] == "Bearer global-secret"
    
    ctx.set_endpoint_auth("/secure", "secure-secret")
    assert ctx.get_auth_header("/secure")["Authorization"] == "Bearer secure-secret"
    print("✓ Auth header logic passed")
    
    print("Context snapshot:", json.dumps(ctx.get_all_context(), indent=2))

def test_planner():
    print("\n--- Testing Gemini Planner ---")
    reqs = """
    1. User should be able to login with email and password.
    2. After login, the user should be able to fetch their profile details.
    3. The user should be able to logout.
    """
    
    swagger = """
    openapi: 3.0.0
    info:
      title: Auth API
    paths:
      /login:
        post:
          summary: Login
          requestBody:
            content:
              application/json:
                schema:
                  properties:
                    email: { type: string }
                    password: { type: string }
          responses:
            '200':
              content:
                application/json:
                  schema:
                    properties:
                      access_token: { type: string }
      /me:
        get:
          summary: Get Profile
          responses:
            '200':
              content:
                application/json:
                  schema:
                    properties:
                      id: { type: string }
                      name: { type: string }
      /logout:
        post:
          summary: Logout
          responses:
            '204':
              description: No Content
    """
    
    try:
        plan = generate_test_plan(reqs, swagger)
        print("Generated Plan:")
        print(json.dumps(plan, indent=2))
        
        # Basic validation
        assert len(plan) >= 2
        assert plan[0]["endpoint"] == "/login"
        assert "access_token" in plan[0]["extract_and_save"]
        print("\n✓ Planner mapping and dependency logic passed")
    except Exception as e:
        print(f"✗ Planner failed: {e}")

if __name__ == "__main__":
    test_context()
    test_planner()
