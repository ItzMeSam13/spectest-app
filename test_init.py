import os
from langchain_google_genai import ChatGoogleGenerativeAI

try:
    print("Attempting to initialize ChatGoogleGenerativeAI...")
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY", "dummy"),
        temperature=0.7
    )
    print("Success!")
except Exception as e:
    print(f"Error: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
