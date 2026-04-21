"""
HTTP client wrapper used by the executor.

Will contain:
- httpx/requests client configuration (timeouts, retries, base_url)
- request/response capture hooks for persistence and debugging
"""

