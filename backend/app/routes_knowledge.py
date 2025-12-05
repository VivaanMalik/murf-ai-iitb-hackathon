from datetime import datetime
from typing import Any, List, Optional

import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.storage import SessionLocal, Document, Chunk, delete_document_and_chunks, delete_chunk as storage_delete_chunk, collection

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DocumentOut(BaseModel):
    id: str
    title: str
    source: str
    extra_meta: Optional[dict] = None
    created_at: datetime

    class Config:
        orm_mode = True


class ChunkOut(BaseModel):
    id: str
    doc_id: str
    conversational: str
    key_details: Optional[Any] = None
    source_extract: Optional[str] = None
    faq: Optional[Any] = None

    class Config:
        orm_mode = True

def _parse_json_field(raw: Any):
    """
    Safely parse a JSON field that may already be a dict/list or a JSON string.
    If parsing fails, just return None.
    """
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Rather return something than explode the whole response
            return None
    return None


def serialize_document(doc: Document) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        title=doc.title,
        source=doc.source,
        extra_meta=_parse_json_field(doc.extra_meta),
        created_at=doc.created_at,
    )

def serialize_chunk(chunk: Chunk) -> ChunkOut:
    return ChunkOut(
        id=chunk.id,
        doc_id=chunk.doc_id,
        conversational=chunk.conversational,
        key_details=_parse_json_field(chunk.key_details),
        source_extract=chunk.source_extract,
        faq=_parse_json_field(chunk.faq),
    )

@router.get("/documents", response_model=List[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    """
    List all documents in the knowledge_db.
    Newest first.
    """
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [serialize_document(d) for d in docs]

@router.get("/documents/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Get a single document by ID.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_document(doc)

@router.get("/chunks", response_model=List[ChunkOut])
def list_chunks(doc_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    List chunks. If doc_id is provided, filter to that document.
    """
    query = db.query(Chunk)
    if doc_id:
        query = query.filter(Chunk.doc_id == doc_id)

    chunks = query.all()
    return [serialize_chunk(c) for c in chunks]

@router.get("/chunks/{chunk_id}", response_model=ChunkOut)
def get_chunk(chunk_id: str, db: Session = Depends(get_db)):
    """
    Get a single chunk by ID.
    """
    chunk = db.query(Chunk).filter(Chunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    return serialize_chunk(chunk)

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Delete a document and all its chunks (DB + Chroma).
    """
    # Fetch doc
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Fetch chunks for that doc
    chunks = db.query(Chunk).filter(Chunk.doc_id == doc_id).all()
    chunk_ids = [c.id for c in chunks]

    # Delete chunks from DB
    for c in chunks:
      db.delete(c)

    # Delete document from DB
    db.delete(doc)
    db.commit()

    # Delete from Chroma (ignore errors)
    if chunk_ids:
        try:
            collection.delete(ids=chunk_ids)
        except Exception as e:
            print(f"⚠️ Chroma delete failed for doc {doc_id}: {e}")

    return {"status": "ok", "deleted_doc_id": doc_id, "deleted_chunks": len(chunk_ids)}

@router.delete("/chunks/{chunk_id}")
def delete_chunk(chunk_id: str, db: Session = Depends(get_db)):
    """
    Delete a single chunk (DB + Chroma).
    """
    chunk = db.query(Chunk).filter(Chunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    db.delete(chunk)
    db.commit()

    # Remove from Chroma
    try:
        collection.delete(ids=[chunk_id])
    except Exception as e:
        print(f"⚠️ Chroma delete failed for chunk {chunk_id}: {e}")

    return {"status": "ok", "deleted_chunk_id": chunk_id}