from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional
from contextlib import asynccontextmanager
from app.storage import init_db
from app.services import stream_audio_from_list, get_llm_response, get_deepgram_transcription, stream_deepgram_transcription, ingest_pdf, summarise_history, find_pdf_links, ingest_pdf_from_url
from app.routes_knowledge import router as knowledge_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    print("Database initialized")

    yield  # App runs here

    # Shutdown
    print("App shutting down...")

app = FastAPI(
    title="Murf Voice Agent API",
    description="Backend for conversational agent using Murf TTS and LLMs",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(knowledge_router)

chat_mem = {}
user_configs = {}
convo_summaries = {}

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
@app.post("/api/chat")
async def chat_endpoint(request: Request, body: ChatRequest, background_tasks: BackgroundTasks,):
    """
    Main conversational loop
    """

    pdf_urls = await find_pdf_links(body.user_message)
    for url in pdf_urls:
        background_tasks.add_task(ingest_pdf_from_url, url)

    # def users
    user_id = body.user_id
    user_text = body.user_message

    if user_id not in chat_mem:
        chat_mem[user_id] = []
        convo_summaries[user_id] = ""
        user_configs[user_id] = {
            "rate": 0,
            "pitch": 0,
            "style": "Conversational",
            "temperature": 0.5,
            "accent_color": "brand-blue",
        }

    MAX_MESSAGES = 20  # 10 user + 10 agent, tweak as you like
    msg_history_for_llm = []

    chat_mem[user_id].append({"role": "user", "content": user_text})
    short_history = chat_mem[user_id][-MAX_MESSAGES:]

    if convo_summaries[user_id]:
        msg_history_for_llm.append({
            "role": "system",
            "content": f"Conversation so far (summary): {convo_summaries[user_id]}"
        })

    msg_history_for_llm.extend(short_history)

    llm_response = get_llm_response(msg_history_for_llm, user_configs[user_id])

    agent_text_response = llm_response.get("text", "Sorry, I broke.")
    new_config = llm_response.get("config", {})

    if new_config:
        user_configs[user_id].update(new_config)

    chat_mem[user_id].append({"role": "assistant", "content": agent_text_response})

    if len(chat_mem[user_id]) % 5 == 0:
        convo_summaries[user_id] = summarise_history(
            chat_mem[user_id],
            existing_summary=convo_summaries[user_id]
        )

    chat_mem[user_id] = chat_mem[user_id][-MAX_MESSAGES:]
    
    async def event_stream():
        for chunk in stream_audio_from_list(
            agent_text_response,
            user_configs[user_id]
        ):
            if await request.is_disconnected():
                print(f"Client {user_id} disconnected, stopping stream")
                break
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
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

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await stream_deepgram_transcription(websocket)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WS Error: {e}")

@app.post("/api/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files allowed"}

    pdf_bytes = await file.read()

    result = ingest_pdf(
        pdf_bytes=pdf_bytes,
        title=file.filename,
        doc_id="pdf:" + file.filename
    )

    return {"status": "ok", "stored": result}

if __name__ == "__main__":
    import uvicorn
    # Reload=True allows you to change code without restarting
    uvicorn.run(app, host="0.0.0.0", port=8000)