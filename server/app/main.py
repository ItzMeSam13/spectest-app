"""
FastAPI entrypoint.

Will contain:
- FastAPI app factory / app instance
- Router mounting (e.g., /api/projects, /api/runs, /api/sse)
- Middleware (CORS, request IDs, logging)
- Lifespan hooks (DB init, event bus init)
"""

