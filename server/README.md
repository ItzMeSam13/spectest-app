# SpecTest Backend (Server)

This folder contains the FastAPI backend for SpecTest.

**Intentional note:** this is a skeleton only (no implementation yet). Files contain
only short comments describing what should live there.

## High-level layout

- `app/main.py`: FastAPI app entrypoint (app factory, router mounting, middleware).
- `app/api/`: HTTP layer (routes, request/response schemas, dependency injection).
- `app/services/`: agent orchestration (ingestion, mapping, test generation, execution, scoring).
- `app/core/`: shared execution context + eventing (SSE streaming).
- `app/db/`: SQLAlchemy models + session + migrations.
- `app/workers/`: background run orchestration (thread/task queue later).

