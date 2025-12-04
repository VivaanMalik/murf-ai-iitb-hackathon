import fitz
import json
import os
import io
import httpx
import uuid
import google.generativeai as genai
from app.storage import store_document_chunks

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini = genai.GenerativeModel("gemini-2.5-pro")

async def ingest_pdf_from_url(url: str):
    try:
        async with httpx.AsyncClient() as client:
            pdf = await client.get(url)
            pdf.raise_for_status()

        title = url.split("/")[-1].replace(".pdf", "")
        doc_id = str(uuid.uuid4())

        ingest_pdf(pdf.content, doc_id, title)

    except Exception as e:
        print("PDF ingest error:", e)


def extract_between_first_and_last(text: str):
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end < start:
        return ""
    return text[start:end+1]


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract raw text using PyMuPDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    return full_text

def ingest_pdf(pdf_bytes: bytes, doc_id: str, title: str):
    print("Extracting...")
    raw_text = extract_pdf_text(pdf_bytes)
    
    print("Thinking...")

    # Ask Gemini for semantic chunking
    response = gemini.generate_content(
        """
        Convert the following document into JSON chunks.

        Return ONLY valid JSON: a list of objects:
        Dont send additional text, no codeblocks.
        [
          {
            "id": "unique-id",
            "conversational": "...",
            "key_details": ["...", "..."],
            "source_extract": "...",
            "faq": [{"q": "...", "a": "..."}]
          }
        ]

        Text:
        """ + raw_text
    )

    out = extract_between_first_and_last(response.text)
    print(out)
    chunks = json.loads(out)
    print("Thunk.")

    return store_document_chunks(
        doc_id=doc_id,
        title=title,
        source="pdf",
        chunks=chunks,
        extra_meta={"length": len(raw_text)}
    )
