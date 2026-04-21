"""
document_processor.py
---------------------
Core RAG utility for the API-testing agent.
Handles document loading, chunking, embedding, and vector store management.
"""

import json
import os
import tempfile
from typing import List, Optional

import yaml  # PyYAML — already installed

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

# ──────────────────────────────────────────────
# Global in-memory state
# ──────────────────────────────────────────────
_vectorstore: Optional[Chroma] = None
_all_docs: List[Document] = []
_swagger_flat_text: str = ""  # Human-readable flattened swagger for payload generation

# Shared embedding model (loaded once at module import)
EMBEDDING_MODEL = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)


# ──────────────────────────────────────────────
# Text splitters
# ──────────────────────────────────────────────
REQUIREMENTS_SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " ", ""],
)

SWAGGER_SPLITTER = RecursiveCharacterTextSplitter(
    # Keep small so individual endpoints stay in their own chunk
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", " ", ""],
)


# ──────────────────────────────────────────────
# Loaders
# ──────────────────────────────────────────────

def load_requirements(file_bytes: bytes, filename: str) -> List[Document]:
    """
    Load a Business Requirements Document (PDF or DOCX).
    Returns chunked Documents tagged with source='requirements'.
    """
    suffix = _get_suffix(filename)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if suffix == ".pdf":
            loader = PyPDFLoader(tmp_path)
        elif suffix in (".docx", ".doc"):
            loader = Docx2txtLoader(tmp_path)
        else:
            raise ValueError(f"Unsupported requirements format: {filename}")

        raw_docs = loader.load()
        chunks = REQUIREMENTS_SPLITTER.split_documents(raw_docs)

        # Tag metadata
        for chunk in chunks:
            chunk.metadata["source"] = "requirements"
            chunk.metadata["filename"] = filename

        return chunks
    finally:
        os.unlink(tmp_path)


def load_swagger(file_bytes: bytes, filename: str) -> List[Document]:
    """
    Load a Swagger / OpenAPI spec (JSON or YAML).
    Pre-processes the spec into human-readable endpoint strings BEFORE chunking,
    so retrievals are clean and endpoints never span chunk boundaries.
    Returns Documents tagged with source='swagger'.
    """
    global _swagger_flat_text

    suffix = _get_suffix(filename)
    if suffix not in (".json", ".yaml", ".yml"):
        raise ValueError(f"Unsupported swagger format: {filename}")

    raw_text = file_bytes.decode("utf-8", errors="replace")

    # ── Smart Pre-Processor ────────────────────────────────────────────
    # Attempt to flatten the swagger JSON/YAML into readable endpoint lines.
    # Falls back to raw text if parsing fails.
    flattened = _flatten_swagger(raw_text, suffix)
    _swagger_flat_text = flattened  # Expose for payload generation

    doc = Document(
        page_content=flattened,
        metadata={"source": "swagger", "filename": filename},
    )
    chunks = SWAGGER_SPLITTER.split_documents([doc])

    for chunk in chunks:
        chunk.metadata["source"] = "swagger"
        chunk.metadata["filename"] = filename

    return chunks


def get_swagger_flat_text() -> str:
    """Return the pre-processed, human-readable swagger text for payload generation."""
    return _swagger_flat_text


def _flatten_swagger(raw_text: str, suffix: str) -> str:
    """
    Parse the Swagger/OpenAPI spec and convert each endpoint into a single
    structured line:
      Endpoint: POST /auth/login | Summary: User Login | Params: email, password | Tags: auth

    This prevents chunking from splitting a path from its parameters,
    making vector search 10x more accurate.
    """
    try:
        if suffix == ".json":
            spec = json.loads(raw_text)
        else:
            spec = yaml.safe_load(raw_text)

        if not isinstance(spec, dict):
            return raw_text  # Fallback

        paths = spec.get("paths", {})
        if not paths:
            return raw_text  # Fallback

        lines = []

        # Include top-level info for context
        info = spec.get("info", {})
        if info.get("title"):
            lines.append(f"API Title: {info['title']}")
        if info.get("description"):
            lines.append(f"API Description: {info['description']}")
        lines.append("")

        for path, methods in paths.items():
            if not isinstance(methods, dict):
                continue
            for method, operation in methods.items():
                if method.lower() in ("parameters", "summary", "description"):
                    continue
                if not isinstance(operation, dict):
                    continue

                parts = [f"Endpoint: {method.upper()} {path}"]

                if operation.get("summary"):
                    parts.append(f"Summary: {operation['summary']}")
                if operation.get("description"):
                    desc = operation["description"].replace("\n", " ")[:120]
                    parts.append(f"Description: {desc}")
                if operation.get("tags"):
                    parts.append(f"Tags: {', '.join(operation['tags'])}")
                if operation.get("operationId"):
                    parts.append(f"OperationId: {operation['operationId']}")

                # Extract parameter names
                params = operation.get("parameters", [])
                path_params = spec.get("paths", {}).get(path, {}).get("parameters", [])
                all_params = params + path_params
                param_names = [p.get("name", "") for p in all_params if isinstance(p, dict)]
                if param_names:
                    parts.append(f"Params: {', '.join(filter(None, param_names))}")

                # Extract request body schema field names
                req_body = operation.get("requestBody", {})
                if req_body:
                    try:
                        schema = (req_body.get("content", {})
                                  .get("application/json", {})
                                  .get("schema", {}))
                        props = schema.get("properties", {})
                        if props:
                            parts.append(f"Body fields: {', '.join(props.keys())}")
                    except Exception:
                        pass

                # Response codes
                responses = operation.get("responses", {})
                if responses:
                    parts.append(f"Responses: {', '.join(str(k) for k in responses.keys())}")

                lines.append(" | ".join(parts))

        return "\n".join(lines) if lines else raw_text

    except Exception:
        # If parsing fails entirely, fall back to raw text chunking
        return raw_text


# ──────────────────────────────────────────────
# Vector Store Management
# ──────────────────────────────────────────────

def add_to_vector_store(new_docs: List[Document]) -> None:
    """Append documents to the global in-memory Chroma vector store."""
    global _vectorstore, _all_docs

    _all_docs.extend(new_docs)

    if _vectorstore is None:
        _vectorstore = Chroma.from_documents(
            documents=_all_docs,
            embedding=EMBEDDING_MODEL,
            persist_directory="data",
        )
    else:
        # Add incrementally
        _vectorstore.add_documents(new_docs)


def reset_vector_store() -> None:
    """Wipe the in-memory store so a new test run can start fresh."""
    global _vectorstore, _all_docs
    if _vectorstore is not None:
        _vectorstore.delete_collection()
    _vectorstore = None
    _all_docs = []


def get_vectorstore() -> Optional[Chroma]:
    return _vectorstore


def get_doc_count() -> int:
    return len(_all_docs)


# ──────────────────────────────────────────────
# RAG Chain
# ──────────────────────────────────────────────

_MAPPER_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are an expert API analyst. Your job is to map business requirements to API endpoints.

You are given these retrieved Swagger/OpenAPI snippets:
-----------
{context}
-----------

Task: {question}

Instructions:
- For EACH requirement listed, find the single best-matching HTTP method + path from the Swagger context.
- If no match is found, use "UNKNOWN".
- Output ONLY a valid JSON object — no markdown, no explanation.
- Format: {{"REQ-ID": "METHOD /path", ...}}

JSON output:""",
)


def get_rag_chain(llm) -> RetrievalQA:
    """
    Build a RetrievalQA chain that searches only swagger chunks.
    The LLM is injected by the caller so consumers can swap models freely.
    """
    if _vectorstore is None:
        raise RuntimeError("Vector store is empty. Upload documents first.")

    # Filter retriever to swagger chunks only for precision
    retriever = _vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 5,
            "filter": {"source": "swagger"},
        },
    )

    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": _MAPPER_PROMPT},
        return_source_documents=False,
    )
    return chain


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _get_suffix(filename: str) -> str:
    _, ext = os.path.splitext(filename.lower())
    return ext
