"""
SSE (Server-Sent Events) API.

Will contain endpoints like:
- GET /api/sse/runs/{run_id}

The stream will push:
- agent thoughts ("Refactoring for dependency chaining...")
- per-test lifecycle events (started/finished)
- run summary completion event
"""

