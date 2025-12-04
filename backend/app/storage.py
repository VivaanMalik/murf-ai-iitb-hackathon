# app/storage.py

import os
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv
import chromadb

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def embed_text(text: str) -> List[float]:
    """
    Get an embedding vector from Gemini for the given text.
    Uses Google's text-embedding-004 model.
    """
    result = genai.embed_content(
        model="models/text-embedding-004",  # or "models/gemini-embedding-001"
        content=text,
    )
    return result["embedding"]

# ----------------------------
# Database setup (SQLite)
# ----------------------------

DATABASE_URL = "sqlite:///./knowledge.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    source = Column(String)                    # "arxiv", "pdf", "web", etc.
    extra_meta = Column(Text, nullable=True)   # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True)
    doc_id = Column(String, ForeignKey("documents.id"))
    conversational = Column(Text)
    key_details = Column(Text)     # JSON string (list[str])
    source_extract = Column(Text)
    faq = Column(Text)             # JSON string (list[{"q": str, "a": str}])


def init_db() -> None:
    """Create tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


# ----------------------------
# Embeddings + Chroma
# ----------------------------

chroma_client = chromadb.PersistentClient(path="./chromadb")
collection = chroma_client.get_or_create_collection(
    name="doc_chunks",
    metadata={"hnsw:space": "cosine"},
)


# ----------------------------
# Generic store API
# ----------------------------

def store_document_chunks(
    doc_id: str,
    title: str,
    source: str,
    chunks: List[Dict[str, Any]],
    extra_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Store a document and its chunks in SQLite and Chroma.

    Parameters
    ----------
    doc_id : str
        Unique ID for the document (e.g. "arxiv:2105.02723", "pdf:myfile.pdf").
    title : str
        Human-readable title.
    source : str
        Source type: "arxiv", "pdf", "web", "notes", etc.
    chunks : list[dict]
        Each dict should have at least:
            {
                "id": str,
                "conversational": str,
                "key_details": list[str],
                "source_extract": str,
                "faq": list[{"q": str, "a": str}]
            }
    extra_meta : dict, optional
        Arbitrary metadata to store as JSON.
    """
    db = SessionLocal()

    try:
        # Upsert document metadata
        doc = Document(
            id=doc_id,
            title=title,
            source=source,
            extra_meta=json.dumps(extra_meta or {}),
        )
        db.merge(doc)
        db.commit()

        # Upsert chunks + embeddings
        for ch in chunks:
            chunk_id = ch["id"]

            conversational = ch.get("conversational", "")
            key_details_json = json.dumps(ch.get("key_details", []))
            source_extract = ch.get("source_extract", "")
            faq_json = json.dumps(ch.get("faq", []))

            db_chunk = Chunk(
                id=chunk_id,
                doc_id=doc_id,
                conversational=conversational,
                key_details=key_details_json,
                source_extract=source_extract,
                faq=faq_json,
            )
            db.merge(db_chunk)
            db.commit()

            # Create embedding for retrieval
            embed_input = conversational + "\n" + source_extract
            vector = embed_text(embed_input)

            collection.upsert(
                ids=[chunk_id],
                embeddings=[vector],
                metadatas=[{
                    "doc_id": doc_id,
                    "title": title,
                    "source": source,
                }],
                documents=[conversational],
            )

        return {"status": "ok", "chunks": len(chunks)}

    except SQLAlchemyError as e:
        db.rollback()
        return {"error": str(e)}

    finally:
        db.close()


def search_knowledge(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Semantic search over all stored chunks.

    Returns a list of dicts:
        {
            "chunk_id": ...,
            "doc_id": ...,
            "title": ...,
            "source": ...,
            "conversational": ...,
            "source_extract": ...,
            "faq": [...],
            "key_details": [...]
        }
    """
    vec = embed_text(query)
    result = collection.query(
        query_embeddings=[vec],
        n_results=top_k,
    )

    ids = result["ids"][0]
    metas = result["metadatas"][0]

    db = SessionLocal()
    out: List[Dict[str, Any]] = []

    try:
        for i, chunk_id in enumerate(ids):
            ch = db.query(Chunk).filter_by(id=chunk_id).first()
            if not ch:
                continue

            out.append({
                "chunk_id": chunk_id,
                "doc_id": metas[i]["doc_id"],
                "title": metas[i]["title"],
                "source": metas[i]["source"],
                "conversational": ch.conversational,
                "source_extract": ch.source_extract,
                "faq": json.loads(ch.faq) if ch.faq else [],
                "key_details": json.loads(ch.key_details) if ch.key_details else [],
            })
    finally:
        db.close()

    return out
