"""
Shared context store.

Will contain:
- an in-memory store keyed by run_id (initially)
- optional persistence hooks/snapshots (later) for resilience
"""

