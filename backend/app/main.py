import base64
import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import pygame     # tmp
from app.services import generate_murf_speech
from typing import Optional

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
    Main conversational loop
    """
    print(f"📩 Received user message: {request.user_message}")

    # 1. (TODO) Call LLM here later
    # For now, we just repeat what the user said to test the voice.
    agent_text_response = f"no, you {request.user_message}"

    audio_b64 = generate_murf_speech(agent_text_response)
    audio_bytes = base64.b64decode(audio_b64)

    temp_filename = "../assets/tmp_audio.mp3"
    with open(temp_filename, "wb") as f:
        f.write(audio_bytes)
    print(f"🔊 Playing audio locally from {temp_filename}...")

    # use pygame to play audio
    # temp until i have frontend
    pygame.mixer.init()
    pygame.mixer.music.load(temp_filename)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        time.sleep(0.1)
    pygame.mixer.quit()

    try:
        os.remove(temp_filename)
        print("🧹 6. DELETED TEMP FILE")
    except:
        print("⚠️ Could not delete temp file (might be locked)")         

    return ChatResponse(
        agent_text=agent_text_response,
        audio_base64=audio_b64,
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