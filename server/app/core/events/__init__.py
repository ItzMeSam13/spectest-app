"""
Eventing primitives used by the backend.

Used to publish:
- "agent thought" events
- mapper/generator progress
- per-test execution updates

API/SSE layer subscribes and streams these out to the UI.
"""

