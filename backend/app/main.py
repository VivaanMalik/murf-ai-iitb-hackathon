import base64
import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# import time
# import pygame     # tmp
from fastapi.responses import StreamingResponse
from app.services import stream_audio_from_list, get_llm_response, get_deepgram_transcription
from typing import Optional

app = FastAPI(
    title="Murf Voice Agent API",
    description="Backend for conversational agent using Murf TTS and LLMs",
    version="1.0.0"
)

chat_mem = {}
user_configs = {}

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
        user_configs[user_id] = {"rate": 0, "pitch": 0, "style": "Conversational"}
    chat_mem[user_id].append({"role": "user", "content": user_text})

    llm_response = get_llm_response(chat_mem[user_id], user_configs[user_id])

    agent_text_response = llm_response.get("text", ["Sorry, I broke."])
    new_config = llm_response.get("config", {})

    if new_config:
        user_configs[user_id].update(new_config)

    full_response_text = " ".join(agent_text_response)
    chat_mem[user_id].append({"role": "assistant", "content": full_response_text})

    return StreamingResponse(
        stream_audio_from_list(agent_text_response, user_configs[user_id]),
        media_type="application/x-ndjson"
    )

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Receives an audio file (blob) from the microphone, 
    sends it to Deepgram/AssemblyAI, and returns text.
    """
    audio_bytes = await file.read()
    
    transcribed_text = get_deepgram_transcription(audio_bytes)
    
    if not transcribed_text:
        # Fallback if silence
        transcribed_text = ""
        
    return {"transcription": transcribed_text}

if __name__ == "__main__":
    import uvicorn
    # Reload=True allows you to change code without restarting
    uvicorn.run(app, host="0.0.0.0", port=8000)