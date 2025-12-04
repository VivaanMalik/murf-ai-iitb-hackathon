import fitz
import json
import os
import io
import httpx
import google.generativeai as genai
from urllib.parse import urlparse
from app.storage import store_document_chunks

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini = genai.GenerativeModel("gemini-2.5-pro")

async def ingest_pdf_from_url(url: str):
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    # best-effort filename
    path = urlparse(url).path
    filename = (path.split("/")[-1] or "document.pdf") or "document.pdf"

    file_bytes = io.BytesIO(resp.content)
    # adapt this call to match your actual ingest_pdf signature
    await ingest_pdf(file=file_bytes, filename=filename)


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
