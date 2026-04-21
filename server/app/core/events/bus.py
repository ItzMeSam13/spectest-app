"""
Event bus abstraction.

Will implement:
- publish(event)
- subscribe(run_id) -> async iterator / queue

This decouples services (producer) from SSE (consumer).
"""

