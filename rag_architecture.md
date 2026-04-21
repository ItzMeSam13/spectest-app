# SpecTest AI RAG Architecture

SpecTest is an autonomous API testing platform that uses a **Retrieval-Augmented Generation (RAG)** pipeline to bridge the gap between business requirements and technical API execution.

## 🏗️ The 4-Phase Core Pipeline

### 1. Ingestion (The "Memory" Phase)
- **Input**: BRD (PDF/DOCX) + Swagger (JSON/YAML).
- **Process**:
  - Documents are segmented into high-context semi-structured chunks.
  - **HuggingFace Embeddings** (`all-MiniLM-L6-v2`) transform text into mathematical vectors.
  - Vectors are stored in a local **ChromaDB** instance (persistent in `app/db/vector_store`).
- **Purpose**: Allows the system to "search" for technical endpoints using natural language requirements.

### 2. Planning (The "Architect" Phase)
- **Process**:
  - The system queries ChromaDB: *"What endpoints satisfy the requirement 'User should be able to log in'?"*
  - **Gemini 1.5 Flash** receives the top relevant Swagger snippets and requirements.
  - It constructs a dependency-aware **Test Plan** (JSON), identifying where variable extraction (e.g., tokens) is needed.
- **Outcome**: A deterministic sequence of HTTP steps.

### 3. Execution & Self-Healing (The "Operator" Phase)
- **Process**:
  - `TestRunner` executes the plan using `httpx`.
  - **Self-Healing**: If a step fails with a schema error (e.g., 400 Bad Request), the specific error and failed payload are sent back to Gemini.
  - Gemini diagnoses the "Payload Drift" and generates a corrected JSON body immediately.
- **Outcome**: Tests that fix themselves instead of just failing.

### 4. Reporting & Analysis (The "Auditor" Phase)
- **Process**:
  - Aggregates pass/fail rates and calculates the **SpecScore™**.
  - **Firestore** persists the "Mission History" for tracking trends over time.
  - **Sanitizer Engine** generates a professional PDF audit report.

---

## 🛑 Root Cause of the Current Issue: `503 UNAVAILABLE`

The `503` error is an **External Capacity Error** from Google.
- **The Cause**: The SpecTest engine relies on Gemini to make complex decisions at every phase. When Google's "Flash" models experience massive global spikes, they temporarily throttle requests.
- **The Fix**: 
  1. **Model Consolidation**: We've switched all engine services to `gemini-1.5-flash`, which has the highest throughput and stability.
  2. **Retry Resiliency**: Implemented a `max_retries=10` policy with exponential backoff to "wait out" the spikes automatically.
