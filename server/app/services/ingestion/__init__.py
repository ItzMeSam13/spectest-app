import os
import shutil
import json
import yaml
from typing import List, Dict, Any, Optional
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

class IngestionService:
    """
    Handles parsing, chunking, and embedding of Business Requirements (BRDs)
    and API specifications (Swagger/OpenAPI) into a persistent ChromaDB.
    """
    
    def __init__(self, run_id: str, db_parent: str = "app/db/vector_store"):
        self.run_id = run_id
        self.db_dir = os.path.abspath(os.path.join(db_parent, run_id))
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self._vectorstore: Optional[Chroma] = None

    def _get_vectorstore(self) -> Chroma:
        """Lazily initialize or load the vector store."""
        if self._vectorstore is None:
            self._vectorstore = Chroma(
                persist_directory=self.db_dir,
                embedding_function=self.embeddings,
                collection_name="spectest_collection",
                # Handle possible SQLite thread safety issues on Windows
                collection_metadata={"hnsw:space": "cosine"} 
            )
        return self._vectorstore

    def load_brd(self, file_path: str) -> List[Document]:
        """Loads and chunks a Business Requirements Document (.pdf, .docx, .txt)."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
        elif ext == ".docx":
            loader = Docx2txtLoader(file_path)
        else:
            loader = TextLoader(file_path)
            
        docs = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        return splitter.split_documents(docs)

    def load_swagger(self, file_path: str) -> List[Document]:
        """
        Parses a Swagger/OpenAPI file and flattens every endpoint into a single chunk
        to preserve context for the search engine.
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            if file_path.endswith(('.yaml', '.yml')):
                spec = yaml.safe_load(f)
            else:
                spec = json.load(f)
        
        documents = []
        paths = spec.get("paths", {})
        servers = spec.get("servers", [{"url": "/"}])
        base_url = servers[0].get("url", "/")
        
        for path, methods in paths.items():
            for method, details in methods.items():
                if method.lower() not in ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']:
                    continue
                
                summary = details.get("summary", "No summary provided")
                description = details.get("description", "")
                operation_id = details.get("operationId", "N/A")
                
                # Create a flattened, highly searchable string for this endpoint
                flattened = (
                    f"ENDPOINT: {method.upper()} {path}\n"
                    f"BASE_URL: {base_url}\n"
                    f"SUMMARY: {summary}\n"
                    f"DESCRIPTION: {description}\n"
                    f"OP_ID: {operation_id}\n"
                )
                
                # Add request body info if available
                if "requestBody" in details:
                    flattened += f"HAS_REQ_BODY: True\n"
                
                documents.append(Document(
                    page_content=flattened,
                    metadata={"source": file_path, "type": "swagger", "path": path, "method": method}
                ))
                
        return documents

    def process_and_store(self, brd_path: str, swagger_path: str):
        """Prepares the database and ingests both documents."""
        os.makedirs(self.db_dir, exist_ok=True)
        
        # Reset internal state
        self._vectorstore = None
        
        # Load documents
        brd_docs = self.load_brd(brd_path)
        swagger_docs = self.load_swagger(swagger_path)
        
        # Add to vector store
        all_docs = brd_docs + swagger_docs
        vs = self._get_vectorstore()
        vs.add_documents(all_docs)
        print(f"✓ Ingested {len(all_docs)} chunks into ChromaDB at {self.db_dir}")

    def query_context(self, query: str, k: int = 5) -> List[Document]:
        """Retrieves top-K relevant chunks for a given query."""
        vs = self._get_vectorstore()
        return vs.similarity_search(query, k=k)
