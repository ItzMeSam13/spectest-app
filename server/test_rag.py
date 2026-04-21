import sys
import os
import json
sys.path.append(os.path.dirname(__file__))

print("=" * 50)
print("TESTING RAG PIPELINE")
print("=" * 50)

# ---- FAKE REQUIREMENTS TEXT ----
fake_requirements = b"""
REQ-01: The user must be able to login with email and password.
REQ-02: The user must be able to get their profile information.
REQ-03: The user must be able to create a new order.
REQ-04: Admin must be able to delete any user.
REQ-05: The system must return a JWT token on successful login.
"""

# ---- FAKE SWAGGER JSON ----
fake_swagger = json.dumps({
    "openapi": "3.0.0",
    "info": {"title": "Test API", "version": "1.0"},
    "paths": {
        "/auth/login": {
            "post": {
                "summary": "Login with email and password",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "properties": {
                                    "email": {"type": "string"},
                                    "password": {"type": "string"}
                                }
                            }
                        }
                    }
                },
                "responses": {"200": {}, "401": {}}
            }
        },
        "/users/me": {
            "get": {
                "summary": "Get current user profile",
                "security": [{"bearerAuth": []}],
                "responses": {"200": {}, "401": {}}
            }
        },
        "/orders": {
            "post": {
                "summary": "Create a new order",
                "security": [{"bearerAuth": []}],
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "properties": {
                                    "user_id": {"type": "integer"},
                                    "items": {"type": "array"}
                                }
                            }
                        }
                    }
                },
                "responses": {"201": {}, "400": {}, "401": {}}
            }
        }
    }
}).encode('utf-8')

# ============================================
# TEST 1: Vector Store
# ============================================
print("\n[TEST 1] Vector store setup...")
try:
    from core.processor import get_vectorstore, reset_vector_store
    reset_vector_store()
    print("✅ reset_vector_store works")
except Exception as e:
    print(f"❌ Vector store failed: {e}")

# ============================================
# TEST 2 & 3: Load Requirements & Swagger
# ============================================
print("\n[TEST 2] Loading documents...")
try:
    from core.processor import load_swagger, add_to_vector_store, get_doc_count, REQUIREMENTS_SPLITTER
    from langchain_core.documents import Document
    
    # PyPDFLoader doesn't work on raw text, so we mock the parsing and just chunk it in the test
    raw_doc = [Document(page_content=fake_requirements.decode('utf-8'), metadata={"source": "requirements", "filename": "mock.txt"})]
    req_docs = REQUIREMENTS_SPLITTER.split_documents(raw_doc)
    print(f"✅ load_requirements mocked! Chunks created: {len(req_docs)}")
    
    # load_swagger expects file_bytes, filename
    sw_docs = load_swagger(fake_swagger, "swagger.json")
    print(f"✅ load_swagger works! Chunks created: {len(sw_docs)}")
    
    add_to_vector_store(req_docs + sw_docs)
    print(f"✅ add_to_vector_store works! Total docs in store: {get_doc_count()}")
except Exception as e:
    print(f"❌ Document loading failed: {e}")
    import traceback
    traceback.print_exc()

# ============================================
# TEST 5: RAG Chain
# ============================================
print("\n[TEST 5] RAG chain mapping...")
try:
    from core.processor import get_rag_chain
    from api.routes import _build_llm
    
    llm = _build_llm()
    chain = get_rag_chain(llm)
    print(f"✅ get_rag_chain works")

    test_query = (
        "Map this requirement to the best-matching HTTP method + path from the Swagger spec:\n"
        "  - REQ-01: User must login with email and password\n\n"
        "Output format: {\"REQ-ID\": \"METHOD /path\"}"
    )
    print(f"   Testing query...")
    result = chain.invoke({"query": test_query})
    print(f"✅ RAG chain returned result!\n   Result: {str(result)[:200]}")
except Exception as e:
    print(f"❌ RAG chain failed: {e}")
    print("   (This needs GOOGLE_API_KEY in .env)")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 50)
print("TEST COMPLETE")
print("=" * 50)