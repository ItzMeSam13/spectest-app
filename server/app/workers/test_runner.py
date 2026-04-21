import json
import asyncio
import httpx
import re
import os
from typing import List, Dict, Any, AsyncGenerator, Optional
from app.core.context import ExecutionContext
from app.services.ingestion import IngestionService
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

class TestRunner:
    """
    Executes a sequence of API test steps, handles variable injection,
    streams real-time logs, and performs Gemini-driven self-healing.
    """
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.llm = ChatOllama(
            model="llama3.2",
            base_url="http://localhost:11434",
            temperature=0.1
        )
        self.swagger_endpoints = [] # List of valid endpoints from the spec
        self.ingest_service = IngestionService(run_id=run_id)

    def _inject_variables(self, data: Any, vars: Dict[str, Any]) -> Any:
        """
        Recursively replaces {{var_name}} placeholders in strings 
        with actual values from the execution context.
        """
        if isinstance(data, str):
            # Simple regex search for {{variable_name}}
            pattern = re.compile(r"\{\{(.*?)\}\}")
            def replacer(match):
                var_name = match.group(1).strip()
                return str(vars.get(var_name, match.group(0)))
            return pattern.sub(replacer, data)
        elif isinstance(data, list):
            return [self._inject_variables(item, vars) for item in data]
        elif isinstance(data, dict):
            return {k: self._inject_variables(v, vars) for k, v in data.items()}
        return data

    async def _heal_payload(self, step: Dict[str, Any], error_msg: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calls Gemini to diagnose why a request failed and suggest a fixed JSON payload.
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert API Debugger. A test step failed. Diagnose the error and fix the JSON payload."),
            ("human", (
                "ENDPOINT: {method} {endpoint}\n"
                "EXPECTED SCHEMA: {schema}\n"
                "FAILED PAYLOAD: {payload}\n"
                "ERROR MESSAGE: {error}\n\n"
                "Provide ONLY the corrected JSON payload. Do not include triple backticks or explanations.\n"
                "CRITICAL: Output ONLY raw JSON. No conversational text, no markdown blocks, no explanations."
            ))
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({
            "method": step.get("method"),
            "endpoint": step.get("endpoint"),
            "schema": json.dumps(step.get("payload_schema", {})),
            "payload": json.dumps(payload),
            "error": error_msg
        })
        
        try:
            # Clean possible markdown/text around JSON
            clean_json = response.content.strip().replace("```json", "").replace("```", "")
            return json.loads(clean_json)
        except:
            return payload # Fallback to original if healing fails

    async def _heal_path_via_rag(self, failed_path: str, method: str) -> Optional[str]:
        """Queries ChromaDB to see if the failed path has a correct counterpart in the spec."""
        query = f"ENDPOINT: {method} {failed_path}. What is the correct path in the swagger spec?"
        search_results = self.ingest_service.query_context(query, k=3)
        
        if not search_results:
            return None, []
            
        context_text = "\n".join([doc.page_content for doc in search_results])
        return_sources = [doc.metadata.get("path", "?") for doc in search_results]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an API Spec Analyst. A 404 occurred. Use the provided SWAGGER context to find the correct path."),
            ("human", (
                "FAILED PATH: {method} {path}\n"
                "SWAGGER CONTEXT:\n{context}\n\n"
                "If the path in the spec is different (e.g., /api/login vs /login), provide ONLY the corrected path string (e.g., /users/1).\n"
                "CRITICAL: Do NOT include the method (GET, POST, etc.) in your output. Just the path.\n"
                "If the path is missing from the spec entirely, output 'MISSING'."
            ))
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({
            "method": method,
            "path": failed_path,
            "context": context_text
        })
        
        # Task 4: Sanitize Input (Strip methods if model outputted them)
        clean_path = response.content.strip()
        for v in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
            clean_path = clean_path.replace(f"{v} ", "").replace(v, "")
        
        clean_path = clean_path.strip().split("\n")[0]
        
        if "MISSING" in clean_path.upper() or len(clean_path) > 100:
            return None, return_sources
            
        return clean_path, return_sources

    async def _fetch_live_schema(self, base_url: str) -> Optional[str]:
        """Attempts to fetch openapi.json or swagger.json from the target."""
        async with httpx.AsyncClient() as client:
            for path in ["/openapi.json", "/swagger.json", "/api/v1/openapi.json"]:
                try:
                    url = f"{base_url.rstrip('/')}{path}"
                    resp = await client.get(url)
                    if resp.is_success:
                        return resp.text
                except:
                    continue
        return None

    def _join_url(self, base: str, endpoint: str) -> str:
        return f"{base.rstrip('/')}/{endpoint.lstrip('/')}"

    async def execute_suite(self, plan: List[Dict[str, Any]], context: ExecutionContext, swagger_text: str = "") -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes the entire test suite while yielding structured log messages.
        """
        # Extract endpoints from swagger for Task 4 context
        if swagger_text:
            self.swagger_endpoints = re.findall(r'"([^"]*/[^"]*)"', swagger_text) # Simple heuristic

        results = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Task 1: Pre-flight Connectivity Check
            try:
                yield {"msg": "[INFO] Performing Pre-flight Connectivity Check...", "level": "INFO"}
                preflight = await client.get(context.base_url)
                if preflight.status_code not in [200, 404]:
                     yield {"msg": "[CRITICAL] Target API unreachable or misconfigured (Status: {preflight.status_code})", "level": "ERROR"}
                     # We continue but the warning is logged
            except Exception as e:
                yield {"msg": f"[CRITICAL] Target API unreachable: {str(e)}", "level": "ERROR"}

            for step in plan:
                step_num = step.get("step_number")
                method = step.get("method", "GET").upper()
                endpoint = step.get("endpoint", "")
                
                # Task 4: Sanitize Input (Safety check for double-verbs in the plan itself)
                for v in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    endpoint = endpoint.replace(f"{v} ", "").replace(v, "")
                endpoint = endpoint.strip()
                
                # Task 2: Dynamic URL Injection & Sanitization
                url = self._join_url(context.base_url, endpoint)
                
                # Task 3: Clean Logging
                yield {"msg": f"[INFO] Step {step_num}: Executing {method} {endpoint}...", "level": "INFO"}
                
                payload = self._inject_variables(step.get("payload_schema", {}), context.captured_vars)
                headers = context.get_auth_header(endpoint)
                
                test_result = {
                    "method": method,
                    "endpoint": endpoint,
                    "passed": False,
                    "self_healed": False,
                    "status_code": 0,
                    "response_time_ms": 0,
                    "ai_explanation": ""
                }
                
                try:
                    start_time = asyncio.get_event_loop().time()
                    response = await client.request(method, url, json=payload, headers=headers)
                    end_time = asyncio.get_event_loop().time()
                    test_result["response_time_ms"] = int((end_time - start_time) * 1000)
                    test_result["status_code"] = response.status_code
                    
                    if response.is_error:
                        yield {"msg": f"[ERROR] Step {step_num} failed with {response.status_code}", "level": "ERROR"}
                        
                        # Task 4 & Spec-First Path Healing
                        if response.status_code == 404:
                            yield {"msg": f"[INFO] 404 on {method} {endpoint}. Querying vector store for correct path...", "level": "INFO"}
                            corrected_path, rag_matches = await self._heal_path_via_rag(endpoint, method)
                            
                            if rag_matches:
                                yield {"msg": f"[INFO] RAG matched spec paths: {', '.join(rag_matches[:3])}", "level": "INFO"}
                            
                            if corrected_path and corrected_path != endpoint:
                                yield {"msg": f"[HEAL] AI found path correction in spec: {endpoint} → {corrected_path}", "level": "WARN"}
                                endpoint = corrected_path.strip()
                                # Task 1 & 4 double-check
                                for v in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                                    endpoint = endpoint.replace(f"{v} ", "").replace(v, "")
                                
                                url = self._join_url(context.base_url, endpoint)
                                response = await client.request(method, url, json=payload, headers=headers)
                                test_result["status_code"] = response.status_code
                                test_result["endpoint"] = endpoint
                                if response.is_success:
                                    test_result["self_healed"] = True
                                    test_result["ai_explanation"] = f"Path automatically corrected from spec: {corrected_path}"
                            else:
                                is_in_spec = any(endpoint in e for e in self.swagger_endpoints)
                                if is_in_spec:
                                    yield {"msg": f"[GAP FOUND] '{endpoint}' exists in spec but is MISSING from live target environment.", "level": "ERROR"}
                                else:
                                    yield {"msg": f"[INFO] '{endpoint}' was not found in the Swagger spec — this may be an undocumented path.", "level": "WARN"}
                        
                        if response.is_error:
                            yield {"msg": f"[HEAL] Attempting payload healing with AI...", "level": "WARN"}
                            healed_payload = await self._heal_payload(step, response.text, payload)
                            yield {"msg": f"[HEAL] Retrying with corrected payload...", "level": "INFO"}
                            response = await client.request(method, url, json=healed_payload, headers=headers)
                            test_result["status_code"] = response.status_code
                            if response.is_success:
                                test_result["self_healed"] = True
                                test_result["ai_explanation"] = "Payload automatically corrected to match API schema."

                    if response.is_success:
                        test_result["passed"] = True
                        yield {"msg": f"[SUCCESS] Step {step_num} PASSED ({response.status_code})", "level": "SUCCESS"}
                        
                        for var_name in step.get("extract_and_save", []):
                            data = response.json()
                            if var_name in data:
                                val = data[var_name]
                                context.save_variable(var_name, val)
                                yield {"msg": f"[INFO] Captured {var_name}={val}", "level": "INFO"}
                                if var_name == "access_token":
                                    context.set_global_auth(val)
                                    yield {"msg": "[INFO] Automatically updated Global Auth Token", "level": "INFO"}
                    else:
                        yield {"msg": f"[FAIL] Step {step_num} could not be healed.", "level": "ERROR"}
                        test_result["ai_explanation"] = f"API returned {response.status_code}: {response.text[:100]}"
                        
                except Exception as e:
                    yield {"msg": f"[CRITICAL] Connection error: {str(e)}", "level": "ERROR"}
                    test_result["ai_explanation"] = f"Network Error: {str(e)}"
                
                results.append(test_result)
                await asyncio.sleep(0.5)

        yield {"msg": "[DONE] Test suite execution finished.", "level": "INFO", "final_results": results}
