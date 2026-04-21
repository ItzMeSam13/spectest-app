"""
main.py
-------
Entry point for the API-testing RAG Agent backend.
Includes global exception handling and CORS.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from api.routes import router
from utils.logger import sse_event

app = FastAPI(
    title="SpecTest RAG Backend",
    version="2.0.0",
    description="RAG-based API Testing Agent"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow your frontend to see the results
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches any unhandled RAG or Execution errors globally and sends them 
    as a clean JSON log through the SSE stream instead of crashing with a 500 text.
    """
    async def error_stream():
        yield sse_event(f"❌ Fatal System Error: {str(exc)}", "ERROR")
        
    return StreamingResponse(error_stream(), media_type="text/event-stream")

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
