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

**Frontend:** React (Vite), TypeScript, TailwindCSS, ShadCN, Mermaid, KaTeX  
**Backend:** FastAPI, Murf Falcon, Deepgram/AssemblyAI, ChromaDB, Python  
**Other:** Web Audio API, WebSockets, embeddings, structured prompting  

## Environmental Variables

In `.env`

    MURF_API_KEY=

    DEEPGRAM_API_KEY=

    OPENAI_API_KEY=

    GROQ_API_KEY=

    GEMINI_API_KEY=
    
Eg: `.env.example`

## Setup

`buildbackend.sh`
`buildfrontend.sh`

requires: python, nodejs, npm