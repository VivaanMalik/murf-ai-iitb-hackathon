# read_knowledge_db.py

from app.storage import SessionLocal, Document, Chunk

db = SessionLocal()

print("\n=== DOCUMENTS ===\n")
for doc in db.query(Document).all():
    print(f"ID: {doc.id}")
    print(f"Title: {doc.title}")
    print(f"Source: {doc.source}")
    print(f"Extra Meta: {doc.extra_meta}")
    print(f"Created At: {doc.created_at}")
    print("-" * 40)

print("\n=== CHUNKS ===\n")
for chunk in db.query(Chunk).all():
    print(f"Chunk ID: {chunk.id}")
    print(f"Doc ID: {chunk.doc_id}")
    print(f"Conversational:\n{chunk.conversational}\n")
    print(f"Key Details JSON: {chunk.key_details}")
    print(f"Source Extract:\n{chunk.source_extract}\n")
    print(f"FAQ JSON: {chunk.faq}")
    print("-" * 40)

db.close()
