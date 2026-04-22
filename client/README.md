🤖 SpecTest AI: The Autonomous Bridge for API Quality Assurance
SpecTest AI is an advanced, autonomous API testing platform designed to entirely bridge the gap between abstract business logic and deterministic technical execution. By leveraging a Retrieval-Augmented Generation (RAG) pipeline and local LLM intelligence, SpecTest contextually links natural language requirements to precise API interactions, executes them, and automatically heals drifting endpoints in real-time.

💡 Why SpecTest? (The Problem Statement)
In modern software development, QA Automation Engineers face three primary bottlenecks that SpecTest AI eliminates:

The Maintenance Debt: Manual mapping of requirements to HTTP requests is time-consuming. SpecTest offers Zero-Code Test Generation, bypassing the need for manual setup logic or authentication handlers.

Payload Drift: API mutations (schema changes) break pre-written integration tests. SpecTest uses an Autonomous Self-Healing mechanism to diagnose "payload drift," patch JSON structures immediately, and retry tests.

The Fuzzing Gap: Comprehensive security and boundary testing often take days to write. SpecTest operates a "6-case test suite" for every endpoint, including functional paths, dynamic boundary checks, and deep security fuzzing (XSS, Injection profiling).

🚀 Key Features
Intelligence-Driven Planning: Uses RAG to map requirements from BRDs directly to technical Swagger specifications.

6-Case Comprehensive Matrix: Every requirement is tested against 1x Functional, 2x Boundary, and 3x Security/Exploitation techniques.

Self-Healing Runner: Automatically intercepts 400/500 errors, introspects the schema using Llama 3.2, and corrects payloads on the fly.

Cyberpunk Dashboard: A high-density UI providing real-time SSE (Server-Sent Events) logs and technical audit trails.

SpecScore™ & Reporting: Professional, boardroom-ready PDF reports that translate complex test results into verifiable business readiness benchmarks.

🛠️ The Tech Stack
Frontend (The UI)
Framework: Next.js 14 (App Router).

Styling: Tailwind CSS with custom Framer Motion animations.

Components: shadcn/ui & Radix UI for professional, high-fidelity layouts.

Metrics: Recharts for historical trend mapping and SpecScore™ visualization.

Backend (The Intelligence)
Engine: FastAPI for high-throughput, real-time streaming.

Database: Firestore for persistence and ChromaDB for vector-based RAG memory.

LLM Core: Local Llama 3.2 (via Ollama) ensuring 100% data privacy and zero cloud latency.

Vector Embeddings: HuggingFace all-MiniLM-L6-v2 for efficient geometric spatial mapping.

🧠 The 4-Phase AI Architecture
Ingestion (Memory): BRDs and Swagger mappings are parsed and converted into semantic numerical vectors stored in ChromaDB.

Planning (Architect): Llama 3.2 queries the vector store to infer technical constraints and builds a dependency-aware Test Plan JSON structure.

Execution & Healing (Operator): Background workers execute HTTP requests. Runtime rejections trigger the Self-Healing agent to adjust definitions autonomously.

Reporting (Auditor): Aggregates execution matrices into a unified SpecScore™ and generates professional PDF audit whitepapers.

⚙️ Installation & Setup
Prerequisites
Python 3.10+

Node.js 18+

Ollama (with Llama 3.2 model downloaded)

Firebase Account (for Authentication and Firestore)

Backend Setup
Bash
cd server
pip install -r requirements.txt
# Set your .env variables (FIREBASE_ADMIN_SDK, CHROMA_DB_PATH, etc.)
uvicorn main:app --reload
Frontend Setup
Bash
cd client
npm install
# Set your .env variables (NEXT_PUBLIC_FIREBASE_CONFIG)
npm run dev
🗺️ Page Mapping
/dashboard: 3-step wizard (Upload ➡️ Configure ➡️ Launch) to parameterize test scenarios.

/run: Live execution center showing real-time AI decision inferences.

/analytics: High-level metrics view showing long-term trends and failure hotspots.

/history: Library of past audit runs with SpecScore™ tracking.

/docs: AI-generated technical whitepapers and documentation repository.

🔒 Privacy & Local Intelligence
SpecTest AI is designed with a Privacy-First mindset. By utilizing local LLM execution via Llama 3.2 on your internal hardware (e.g., RTX 4050), sensitive business logic and API data never leave your local environment.

🤝 Credits & Team
Developed with ❤️ by Pratham Honawarkar and team (Sampreet Kalkundrikar and Prathamesh Naik) as an autonomous solution for modern software quality assurance.

