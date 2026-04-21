"""
core/fuzzer.py
--------------
Security scanning logic (Module 9).
"""

import json
from typing import Any, AsyncGenerator, Dict, Optional
import requests
from utils.logger import sse_event

_SQL_PAYLOADS = [
    "' OR '1'='1",
    "1; DROP TABLE users--",
    "' UNION SELECT null,null,null--",
]
_XSS_PAYLOADS = [
    "<script>alert('xss')</script>",
    "\"><img src=x onerror=alert(1)>",
    "javascript:alert(document.cookie)",
]

class SecurityScanner:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._vuln_count = 0
        self._total_checks = 0

    def _fire(self, method: str, path: str, payload: Optional[Dict], headers: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}{path}"
        h = {"Content-Type": "application/json"}
        if headers:
            h.update(headers)
        try:
            resp = requests.request(method.upper(), url, json=payload, headers=h, timeout=10)
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            return {"status": resp.status_code, "body": body}
        except Exception as e:
            return {"status": 0, "body": str(e)}

    async def scan(self, mapping: Dict[str, str]) -> AsyncGenerator[str, None]:
        vulnerabilities = []
        total_checks = 0
        vuln_count = 0

        yield sse_event("🔐 Security Scanner starting adversarial pass...", "SECURITY")

        for req_id, endpoint_info in mapping.items():
            parts = str(endpoint_info).strip().split(" ", 1)
            if len(parts) != 2 or endpoint_info == "UNKNOWN":
                continue

            method, path = parts[0].upper(), parts[1]
            yield sse_event(f"🔍 [SECURITY] Scanning {method} {path}...", "SECURITY")

            # SQL Injection
            for sql in _SQL_PAYLOADS[:1]:
                total_checks += 1
                fuzz_payload = {"id": sql, "username": sql, "email": sql, "query": sql, "name": sql, "input": sql}
                r = self._fire(method, path, fuzz_payload if method not in ("GET", "DELETE") else None)
                if r["status"] == 500:
                    vuln_count += 1
                    vulnerabilities.append({"type": "SQL_INJECTION", "endpoint": f"{method} {path}", "status": r["status"], "payload": fuzz_payload})
                    yield sse_event(f"🚨 [SECURITY] SQL Injection — {method} {path} returned 500!", "SECURITY", vuln=True, data={"attack": "SQL_INJECTION", "payload": sql, "response_status": r["status"]})
                else:
                    yield sse_event(f"✅ [SECURITY] SQLi safe ({r['status']}) on {path}", "SECURITY")

            # XSS
            for xss in _XSS_PAYLOADS[:1]:
                total_checks += 1
                fuzz_payload = {"name": xss, "title": xss, "comment": xss, "description": xss, "body": xss}
                r = self._fire(method, path, fuzz_payload if method not in ("GET", "DELETE") else None)
                if r["status"] == 500:
                    vuln_count += 1
                    vulnerabilities.append({"type": "XSS", "endpoint": f"{method} {path}", "status": r["status"]})
                    yield sse_event(f"🚨 [SECURITY] XSS — {method} {path} returned 500!", "SECURITY", vuln=True, data={"attack": "XSS", "payload": xss, "response_status": r["status"]})
                else:
                    yield sse_event(f"✅ [SECURITY] XSS safe ({r['status']}) on {path}", "SECURITY")

            # No-Auth
            total_checks += 1
            r_no_auth = self._fire(method, path, None, headers={"Authorization": ""})
            if r_no_auth["status"] == 200:
                vuln_count += 1
                vulnerabilities.append({"type": "NO_AUTH_BYPASS", "endpoint": f"{method} {path}", "status": r_no_auth["status"]})
                yield sse_event(f"🚨 [SECURITY] No-Auth bypass — {method} {path} returned 200 without auth!", "SECURITY", vuln=True, data={"attack": "NO_AUTH_BYPASS", "response_status": 200})
            else:
                yield sse_event(f"✅ [SECURITY] Auth enforced ({r_no_auth['status']}) on {path}", "SECURITY")

        safe_checks = total_checks - vuln_count
        yield sse_event(
            f"🏁 Security scan complete: {safe_checks}/{total_checks} checks passed, {vuln_count} vulnerabilit{'y' if vuln_count == 1 else 'ies'} found.",
            "SECURITY", vuln=vuln_count > 0,
            data={"security_summary": {"total_checks": total_checks, "passed": safe_checks, "vulnerabilities_found": vuln_count, "details": vulnerabilities}}
        )
        self._vuln_count = vuln_count
        self._total_checks = total_checks
