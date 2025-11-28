import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# 1. Initialize the App
app = FastAPI(
    title="Murf Voice Agent API",
    description="Backend for conversational agent using Murf TTS and LLMs",
    version="1.0.0"
)

# 2. CORS Configuration (CRITICAL for Lovable Integration)
# Lovable's preview runs in your browser, so it needs permission to hit localhost.
origins = [
    "http://localhost:5173",  # Standard Vite/Lovable local port
    "http://localhost:3000",  # Standard React port
    "https://lovable.dev",    # Production Lovable domain
    "*"                       # Allow all for development (restrict in production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Pydantic Models (This tells Lovable what data to send/expect)
class ChatRequest(BaseModel):
    user_message: str
    user_id: Optional[str] = "default_user"

class ChatResponse(BaseModel):
    agent_text: str
    audio_base64: Optional[str] = None  # Base64 string of the Murf audio
    status: str

# 4. Endpoints

@app.get("/")
async def health_check():
    """Simple health check to verify backend is running."""
    return {"status": "active", "service": "Murf Voice Agent"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main conversational loop:
    1. Receive text from Lovable frontend.
    2. (TODO) Send to LLM (OpenAI/Groq).
    3. (TODO) Send LLM response to Murf Falcon TTS.
    4. Return text + audio to frontend.
    """
    
    # --- PLACEHOLDER LOGIC ---
    # In a real app, you would call your LLM and Murf API here.
    fake_llm_response = f"I received your message: '{request.user_message}'. This is a placeholder response."
    
    return ChatResponse(
        agent_text=fake_llm_response,
        audio_base64=None, # You will fill this with Murf's audio bytes
        status="success"
    )

# 5. Audio Upload Endpoint (If you want to support voice input)
@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Receives an audio file (blob) from the microphone, 
    sends it to Deepgram/AssemblyAI, and returns text.
    """
    return {"transcription": "This is a placeholder for ASR output."}

if __name__ == "__main__":
    import uvicorn
    # Reload=True allows you to change code without restarting
    uvicorn.run(app, host="0.0.0.0", port=8000)