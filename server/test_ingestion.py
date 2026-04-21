import os
import shutil
from app.services.ingestion import IngestionService

def test_ingestion():
    print("--- Testing Ingestion Layer ---")
    
    # Setup paths
    temp_dir = "temp_test_data"
    os.makedirs(temp_dir, exist_ok=True)
    
    brd_path = os.path.join(temp_dir, "reqs.txt")
    with open(brd_path, "w") as f:
        f.write("The system must allow users to login via /api/v1/auth and then check their dashboard.")

    swagger_path = os.path.join(temp_dir, "spec.json")
    spec = {
        "openapi": "3.0.0",
        "paths": {
            "/api/v1/auth": {
                "post": {"summary": "User Login Endpoint", "description": "Returns a JWT token"}
            },
            "/api/v1/dashboard": {
                "get": {"summary": "View User Stats"}
            }
        }
    }
    import json
    with open(swagger_path, "w") as f:
        json.dump(spec, f)

    # Run ingestion
    service = IngestionService(db_dir="app/db/test_vector_store")
    service.process_and_store(brd_path, swagger_path)
    
    # Verify retrieval
    print("\nQuery: 'login endpoint'")
    results = service.query_context("login endpoint", k=2)
    for i, doc in enumerate(results):
        print(f"Result {i+1}: {doc.page_content[:100]}...")
        
    assert any("/api/v1/auth" in doc.page_content for doc in results)
    print("\n✓ Ingestion and retrieval verification passed!")

    # Cleanup test DB if desired (keeping it for now to prove persistence)
    # shutil.rmtree(temp_dir)

if __name__ == "__main__":
    test_ingestion()
