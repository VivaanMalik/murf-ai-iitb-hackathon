import base64
import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import pygame     # tmp
from app.services import generate_murf_speech, get_llm_response
from typing import Optional

app = FastAPI(
    title="Murf Voice Agent API",
    description="Backend for conversational agent using Murf TTS and LLMs",
    version="1.0.0"
)

chat_mem = {}

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://lovable.dev",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    user_message: str
    user_id: Optional[str] = "default_user"

class ChatResponse(BaseModel):
    agent_text: str
    audio_base64: Optional[str] = None  # base64 murf audio
    status: str

# for basic server data
@app.get("/")
async def health_check():
    """Simple health check to verify backend is running."""
    return {"status": "active", "service": "Murf Voice Agent"}

# the avtual chat
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main conversational loop
    """

    # def users
    user_id = request.user_id
    user_text = request.user_message
    if user_id not in chat_mem:
        chat_mem[user_id] = []
    chat_mem[user_id].append({"role": "user", "content": user_text})

    print(f"📩 Received user message: {chat_mem[user_id]}")

    agent_text_response = get_llm_response(chat_mem[user_id])
    # agent_text_response = f"no, you {request.user_message}"

    chat_mem[user_id].append({"role": "assistant", "content": agent_text_response})

    audio_b64 = generate_murf_speech(agent_text_response)
    audio_bytes = base64.b64decode(audio_b64)

    temp_filename = "../assets/tmp_audio.mp3"
    with open(temp_filename, "wb") as f:
        f.write(audio_bytes)

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
    except:
        print("couldnt delete tmp file...")    

    return ChatResponse(
        agent_text=agent_text_response,
        audio_base64=audio_b64,
        status="success"
    )

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