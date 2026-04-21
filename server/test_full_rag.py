import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.services.ingestion import IngestionService
from app.services.planner import generate_test_plan

def test_full_rag_pipeline():
    print("--- Testing Full SpecTest RAG Pipeline ---")
    
    # 1. SETUP MOCK DATA
    temp_dir = "rag_test_data"
    os.makedirs(temp_dir, exist_ok=True)
    
    brd_path = os.path.join(temp_dir, "business_requirements.txt")
    with open(brd_path, "w") as f:
        f.write("# SpecTest Business Requirements\n")
        f.write("REQ-01: The system must allow a user to login with valid credentials.\n")
        f.write("REQ-02: After login, users must be able to retrieve their private profile data.\n")
        f.write("REQ-03: Users should be able to update their email address in their profile.\n")

    swagger_path = os.path.join(temp_dir, "api_spec.json")
    spec = {
        "openapi": "3.0.0",
        "info": {"title": "SpecTest Demo API", "version": "1.0.0"},
        "servers": [{"url": "https://api.spectest.ai/v1"}],
        "paths": {
            "/login": {
                "post": {
                    "summary": "User Login",
                    "requestBody": {"content": {"application/json": {"schema": {"properties": {"email": {"type": "string"}, "password": {"type": "string"}}}}}},
                    "responses": {"200": {"content": {"application/json": {"schema": {"properties": {"access_token": {"type": "string"}}}}}}}
                }
            },
            "/profile": {
                "get": {
                    "summary": "Get User Profile",
                    "responses": {"200": {"content": {"application/json": {"schema": {"properties": {"id": {"type": "string"}, "email": {"type": "string"}}}}}}}
                },
                "patch": {
                    "summary": "Update Profile",
                    "requestBody": {"content": {"application/json": {"schema": {"properties": {"email": {"type": "string"}}}}}},
                    "responses": {"200": {"description": "Updated"}}
                }
            }
        }
    }
    with open(swagger_path, "w") as f:
        json.dump(spec, f)

    # 2. INGESTION
    print("\n[Phase 1] Processing documents and populating Vector Store...")
    ingest_service = IngestionService(db_dir="app/db/full_rag_test_store")
    ingest_service.process_and_store(brd_path, swagger_path)

    # 3. CONTEXT RETRIEVAL
    print("\n[Phase 2] Retrieving context for Planning...")
    # We query the store to see what the Planner would see
    relevant_chunks = ingest_service.query_context("User login and profile update details", k=5)
    context_text = "\n---\n".join([doc.page_content for doc in relevant_chunks])
    print(f"✓ Retrieved {len(relevant_chunks)} relevant chunks from ChromaDB.")

    # 4. AI PLANNING (The 'G' in RAG)
    print("\n[Phase 3] Generating Test Plan using Gemini 2.5 Flash...")
    try:
        # We pass the original requirements and the Swagger context to Gemini
        # In a real run, the 'swagger_text' passed to generate_test_plan would be 
        # the relevant context retrieved from ChromaDB.
        test_plan = generate_test_plan(
            business_req_text="REQ-01: Login, REQ-02: Get Profile, REQ-03: Update Email",
            swagger_text=context_text # This is the "Augmented" part
        )
        
        print("\n✨ FINAL GENERATED TEST PLAN:")
        print(json.dumps(test_plan, indent=2))
        
        # Validation
        assert len(test_plan) >= 3
        # Check if chained correctly (login should be first)
        assert "/login" in test_plan[0]["endpoint"]
        assert "access_token" in test_plan[0]["extract_and_save"]
        print("\n✅ End-to-End RAG Pipeline Verified Successfully!")
        
    except Exception as e:
        print(f"\n❌ Pipeline failed at Planning phase: {e}")

if __name__ == "__main__":
    test_full_rag_pipeline()
