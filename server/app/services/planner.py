import json
import os
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

class TestCase(BaseModel):
    """Schema for a single automated test case step."""
    step_number: int = Field(description="The order in which to execute this step.")
    endpoint: str = Field(description="The API endpoint path (e.g., /api/v1/login).")
    method: str = Field(description="The HTTP method (GET, POST, PUT, DELETE, etc.).")
    purpose: str = Field(description="Brief explanation of what this step validates.")
    payload_schema: Dict[str, Any] = Field(description="A dictionary representing the required JSON fields and types.")
    requires_auth: bool = Field(description="Does this step require an Authorization header?")
    extract_and_save: List[str] = Field(description="List of field names to extract from the response and save for future steps.")

class TestSuite(BaseModel):
    """Container for the generated list of test cases."""
    steps: List[TestCase]

def generate_test_plan(business_req_text: str, swagger_text: str) -> List[Dict[str, Any]]:
    """
    Uses Gemini 2.5 Flash to map natural language requirements to technical Swagger endpoints.
    Handles dependency chaining (e.g., login -> get profile).
    """
    llm = ChatOllama(
        model="llama3.2",
        base_url="http://localhost:11434",
        temperature=0.1
    )

    parser = PydanticOutputParser(pydantic_object=TestSuite)

    system_prompt = (
        "You are a Senior QA Automation Architect. Your task is to generate a logical sequence of API tests "
        "by mapping high-level business requirements to a technical Swagger/OpenAPI specification.\n\n"
        "GOALS:\n"
        "1. Real-world mapping: Correctly identify which Swagger endpoint satisfies which business requirement.\n"
        "2. Dependency Chaining: Identify steps that produce tokens or IDs (e.g., login) and ensure they come "
        "before steps that require them.\n"
        "3. Payload Inference: Based on the Swagger schema, define the minimal required fields for the request bodies.\n"
        "4. Variable Extraction: Identify which fields from a response (like 'access_token' or 'id') must be saved "
        "to satisfy the dependencies of future steps.\n\n"
        "SPEC-FIRST VALIDATION:\n"
        "- Before adding a step, you MUST verify that the endpoint path and method exist in the provided SWAGGER SPEC.\n"
        "- If a requirement cannot be fulfilled by any endpoint in the spec, DO NOT guess a path. Skip that step or map it to the closest available endpoint.\n"
        "- Only output endpoints that are EXPLICITLY defined in the .json spec.\n\n"
        "RULES:\n"
        "- Step numbers must be sequential starting from 1.\n"
        "- If an endpoint requires an ID from a previous step, use the field name in the path or payload like '{{user_id}}'.\n"
        "- Strictly enforce Data Types: 'totalprice' MUST be an Integer, 'depositpaid' MUST be a Boolean.\n"
        "- Strictly enforce Date Format: dates in 'bookingdates' MUST be in the format 'YYYY-MM-DD'.\n"
        "- Do NOT add fields (like userId) that are not explicitly documented in the Swagger schema's required fields.\n\n"
        "CRITICAL: Output ONLY raw JSON. No conversational text, no markdown blocks, no explanations.\n\n"
        "{format_instructions}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "BUSINESS REQUIREMENTS:\n{requirements}\n\nSWAGGER / OPENAPI SPEC:\n{swagger}")
    ]).partial(format_instructions=parser.get_format_instructions())

    chain = prompt | llm | parser

    result = chain.invoke({
        "requirements": business_req_text,
        "swagger": swagger_text
    })

    # Return as list of dictionaries for easier downstream JSON serialization
    return [step.model_dump() for step in result.steps]
