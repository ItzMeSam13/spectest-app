"""
core/executor.py
----------------
HTTP execution, auto-token injection, self-healing with Gemini.
"""
import json
import os
import re
from typing import Any, AsyncGenerator, Dict, List, Optional
import requests
from dotenv import load_dotenv
from utils.logger import sse_event

load_dotenv()
context_store: Dict[str, Any] = {}

def reset_context() -> None:
    context_store.clear()

def _get_llm(temperature: float = 0.3):
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not set.")
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=temperature,
    )

def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    return raw.strip()

def generate_payload_with_gemini(method: str, path: str, swagger_context: str = "") -> Optional[Dict]:
    if method.upper() in ("GET", "DELETE", "HEAD", "OPTIONS"):
        return None
    try:
        from langchain_core.messages import HumanMessage
        llm = _get_llm(0.3)
        ctx_hint = f"\nSwagger context:\n{swagger_context}" if swagger_context else ""
        prompt = (f"Generate a realistic, minimal JSON request body for:\n"
                  f"  Method: {method.upper()}  Path: {path}{ctx_hint}\n"
                  f"Session context: {json.dumps(context_store)}\n"
                  f"Output ONLY valid JSON. No markdown.")
        raw = llm.invoke([HumanMessage(content=prompt)]).content
        return json.loads(_strip_fences(raw))
    except Exception as e:
        return {"error": f"Payload generation failed: {e}"}

def self_heal(method: str, path: str, original_payload: Optional[Dict], error_response: Any, swagger_context: str = "") -> Optional[Dict]:
    try:
        from langchain_core.messages import HumanMessage
        llm = _get_llm(0.2)
        ctx_hint = f"\nSwagger context:\n{swagger_context}" if swagger_context else ""
        prompt = (f"An API request failed. Help me fix the request body.\n\n"
                  f"Endpoint: {method.upper()} {path}{ctx_hint}\n"
                  f"Original payload sent:\n{json.dumps(original_payload, indent=2)}\n\n"
                  f"Error response from API:\n{json.dumps(error_response, indent=2) if isinstance(error_response, dict) else str(error_response)}\n\n"
                  f"Based on this error, what is the correct JSON request body? Output ONLY valid JSON. No markdown. No explanation.")
        raw = llm.invoke([HumanMessage(content=prompt)]).content
        return json.loads(_strip_fences(raw))
    except Exception:
        return None

class TestExecutor:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def _raw_request(self, method: str, path: str, payload: Optional[Dict] = None, headers_extra: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json"}
        if "token" in context_store:
            headers["Authorization"] = f"Bearer {context_store['token']}"
        if headers_extra:
            headers.update(headers_extra)
        try:
            resp = requests.request(method.upper(), url, json=payload, headers=headers, timeout=15)
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            if isinstance(body, dict):
                for key in ("token", "access_token", "accessToken", "jwt"):
                    if key in body:
                        context_store["token"] = body[key]
                        break
                if "id" in body:
                    seg = path.rstrip("/").split("/")[-1]
                    if seg.startswith("{"): seg = path.rstrip("/").split("/")[-2]
                    context_store[f"{seg}_id"] = body["id"]
                if "refresh_token" in body:
                    context_store["refresh_token"] = body["refresh_token"]
            return {"status": resp.status_code, "body": body, "success": resp.status_code < 400, "url": url, "method": method.upper()}
        except requests.exceptions.Timeout:
            return {"status": 408, "body": "Timed out after 15s", "success": False, "url": url, "method": method.upper()}
        except Exception as e:
            return {"status": 500, "body": str(e), "success": False, "url": url, "method": method.upper()}

    def execute_test(self, method: str, path: str, payload: Optional[Dict] = None, headers_extra: Optional[Dict] = None) -> Dict:
        return self._raw_request(method, path, payload, headers_extra)

    async def stream_suite(self, mapping: Dict[str, str], swagger_context: str = "") -> AsyncGenerator[str, None]:
        yield sse_event("🧠 Execution engine started.", "PLANNER")
        results: List[Dict] = []
        healed_count = 0

        for req_id, endpoint_info in mapping.items():
            parts = str(endpoint_info).strip().split(" ", 1)
            if len(parts) != 2 or endpoint_info == "UNKNOWN":
                yield sse_event(f"⚠️  {req_id}: No valid endpoint ('{endpoint_info}') — skipping.", "PLANNER", req_id)
                results.append({"req_id": req_id, "endpoint": endpoint_info, "status": 0, "success": False, "skipped": True})
                continue
            method, path = parts[0].upper(), parts[1]

            yield sse_event(f"🔍 {req_id}: Generating payload for {method} {path}...", "EXECUTOR", req_id)
            payload = generate_payload_with_gemini(method, path, swagger_context)
            if payload:
                yield sse_event(f"📦 {req_id}: Payload ready.", "EXECUTOR", req_id, data={"payload": payload})

            yield sse_event(f"🚀 {req_id}: Firing {method} {path}...", "EXECUTOR", req_id)
            result = self._raw_request(method, path, payload)

            if result["status"] in (400, 422):
                yield sse_event(f"🔧 {req_id}: HTTP {result['status']} — activating self-heal...", "REVIEWER", req_id, data={"original_error": result["body"]})
                fixed_payload = self_heal(method, path, payload, result["body"], swagger_context)
                if fixed_payload:
                    yield sse_event(f"🧪 {req_id}: Retrying with healed payload...", "REVIEWER", req_id, data={"healed_payload": fixed_payload})
                    healed_result = self._raw_request(method, path, fixed_payload)
                    if healed_result["success"]:
                        healed_count += 1
                        yield sse_event(f"[REVIEWER] ↻ Self-healed: Documentation drift detected and corrected. {method} {path} → HTTP {healed_result['status']}", "REVIEWER", req_id, data=healed_result)
                        result = healed_result
                    else:
                        yield sse_event(f"[REVIEWER] ↻ Self-heal attempted but API still returned {healed_result['status']}.", "REVIEWER", req_id, data=healed_result)
                        result = healed_result
                else:
                    yield sse_event(f"⚠️ {req_id}: Gemini could not produce a healing payload.", "REVIEWER", req_id)

            icon = "✅" if result["success"] else "❌"
            yield sse_event(f"{icon} {req_id}: {method} {path} → HTTP {result['status']}", "RESULT", req_id, data=result)
            results.append({"req_id": req_id, "endpoint": endpoint_info, "healed": healed_count > 0, **result})

        self._last_results = results
        self._healed_count = healed_count
        passed = sum(1 for r in results if r.get("success"))
        total = len(results)
        yield sse_event(f"🏁 Functional suite complete: {passed}/{total} passed. ({healed_count} self-healed)", "PLANNER", data={"summary": {"passed": passed, "failed": total - passed, "total": total, "healed": healed_count}, "context_snapshot": dict(context_store), "results": results})
