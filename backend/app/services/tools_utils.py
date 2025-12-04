import json
import google.generativeai as genai   # ✅ correct
from app.storage import store_document_chunks

gemini_client = genai.GenerativeModel("gemini-1.5-pro")

def gemini_semantic_chunks(raw_text: str) -> str:
    """
    Ask Gemini to produce rich, lossless, chunked output for storage / retrieval.
    Return the raw text or JSON; DO NOT send this to the frontend.
    """
    prompt = """
You transform raw technical or academic text into conversational, well-structured, and lossless knowledge chunks for retrieval.

For the ENTIRE input, produce a series of chunks. For EACH chunk, output in this exact template:

CHUNK:
Conversational Explanation:
<short friendly explanation of this chunk>

Key Details:
- bullet
- bullet
- bullet

Source Extract:
<all original content relevant to this chunk, lightly cleaned but with no information removed>

FAQ:
- Q: ...
  A: ...
- Q: ...
  A: ...

Rules:
- Split into semantic sections (topics), not fixed size.
- Each chunk must be self-contained (avoid “this section” without context).
- Preserve all technical information, numbers, and definitions.
- Do not invent anything that is not in the source.
"""

    gemini_response = gemini_client.models.generate_content(
        model="gemini-3-pro-preview",
        contents = prompt + "\n\nTEXT:\n" + raw_text
    )

    return gemini_response.text.strip()


def ingest_text_with_gemini(raw_text: str, doc_id: str, title: str, source: str = "arxiv"):
    """
    1) Ask Gemini for semantic chunks
    2) Wrap them into JSON with doc metadata
    3) Store using store_document_chunks
    """
    chunks_text = gemini_semantic_chunks(raw_text)

    payload = {
        "doc_id": doc_id,
        "title": title,
        "source": source,
        "chunks": json.loads(chunks_text)  # if Gemini returns just a list
    }

    return store_document_chunks(json.dumps(payload))