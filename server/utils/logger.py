"""
utils/logger.py
---------------
Formatting utilities for Server-Sent Events (SSE).
"""

import json
from typing import Any

def sse_event(msg: str, level: str, req_id: str = "", vuln: bool = False, data: Any = None) -> str:
    """
    Format a message as an SSE event string.
    JSON shape: { "msg": "...", "level": "...", "req_id"?: "...", "vulnerable"?: bool, "data"?: {...} }
    """
    payload = {"msg": msg, "level": level}
    if req_id:
        payload["req_id"] = req_id
    if vuln:
        payload["vulnerable"] = True
    if data is not None:
        payload["data"] = data
    return f"data: {json.dumps(payload)}\n\n"
