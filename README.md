# VOX - Voice Ontology eXpert

VOX is a real-time conversational voice agent featuring live transcription, streaming TTS, PDF ingestion, retrieval-augmented responses, diagram generation, web searches, patent searces, research paper searches and a modern audio-reactive interface. Built using Murf Falcon - the consistently fastest TTS API.

## Features

- Real-time, interruptible, bidirectional voice chat  
- Streaming Murf Falcon TTS  
- Live speech-to-text (WebSocket + non-streaming)  
- PDF ingestion → text extraction → chunking → embedding → ChromaDB storage  
- Knowledge search + retrieval-augmented responses  
- Multiple tools: Arxiv search, Python execution, web search, PDF tools  
- Mermaid diagram generation in chat  
- Markdown, code blocks, math (KaTeX)  
- Audio-reactive UI components  
- File sidebar + document viewer  
- Fully typed frontend (TS/React/ShadCN) and modular backend

## Tech Stack

### Backend (FastAPI)
- FastAPI – REST & WebSocket backend
- Uvicorn – ASGI server
- Murf Falcon TTS – streaming text-to-speech
- Deepgram / AssemblyAI – speech-to-text (WS + non-streaming)
- ChromaDB – vector store for RAG
- SQLite (knowledge.db) – document + chunk metadata
- Sentence Transformers – embedding
- Gemini / OpenAI / Groq – LLM inference
- Arxiv API, Web Search tools – tool-augmented agent
- pypdf – PDF extraction
- httpx / aiohttp – async HTTP clients
- Pydantic – models & validation

### Frontend (React + Vite + Tailwind + ShadCN)
- React 18
- Vite
- TypeScript
- TailwindCSS
- ShadCN UI
- Mermaid.js (diagrams)
- KaTeX (math)
- React-Markdown
- Audio APIs (Web Audio, MediaRecorder, AudioContext)
- Custom voice chat hook (useVoiceChat.ts)
- Audio-reactive particles
- Knowledge sidebar + citations

## APIs used

- MURF API
- DEEPGRAM API
- OPENAI API
- GROQ API
- GEMINI API
- ChromaDB
- Local PDF Processor (pymupdf)

Check `.env.example` for a sample `.env`

## Setup

`buildbackend.sh`
`buildfrontend.sh`

requires: python, nodejs, npm

## Demo

`assets/demo_video.mp4`
<video src="assets/demo_video.mp4" controls width="600">
  Your browser does not support the video tag.
</video>