import json
import uuid
import google.generativeai as genai
from app.storage import store_document_chunks
from .text_format import conversationofy

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

def simple_semantic_chunk(text: str, max_chars: int = 1200):
    """
    Very dumb but effective: split by blank lines, pack paragraphs until ~max_chars,
    then start a new chunk.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 > max_chars:
            if current.strip():
                chunks.append(current.strip())
            current = para + "\n\n"
        else:
            current += para + "\n\n"

    if current.strip():
        chunks.append(current.strip())

    return chunks

def save_arxiv_to_rag(raw_text: str, query: str):
    doc_id = f"arxiv:{uuid.uuid4()}"
    title = f"arxiv result for: {query[:80]}"

    text_chunks = simple_semantic_chunk(raw_text, max_chars=1200)

    chunks = []
    for i, c in enumerate(text_chunks):
        chunks.append({
            "id": f"{doc_id}:chunk-{i}",
            "conversational": conversationofy(c),  # or just c
            "key_details": [f"Tool: SEARCH_ARXIV", f"Query: {query}", f"Part: {i+1}/{len(text_chunks)}"],
            "source_extract": c,
            "faq": [],
        })

    store_document_chunks(
        doc_id=doc_id,
        title=title,
        source="arxiv",
        chunks=chunks,
        extra_meta={"query": query},
    )

def save_web_result_to_rag(query: str, raw_text: str):
    """
    Save Tavily web search output into RAG as smaller semantic chunks.
    """
    if not raw_text:
        return

    doc_id = f"web:{uuid.uuid4()}"
    title = f"Web search: {query[:80]}"

    text_chunks = chunk_text_paragraphs(raw_text, max_chars=1200)

    chunks = []
    total_parts = len(text_chunks)
    for i, chunk_text in enumerate(text_chunks):
        chunks.append({
            "id": f"{doc_id}:chunk-{i}",
            "conversational": conversationofy(chunk_text),
            "key_details": [
                "Tool: SEARCH_WEB",
                f"Query: {query}",
                f"Part: {i+1}/{total_parts}",
            ],
            "source_extract": chunk_text,
            "faq": [],
        })

    store_document_chunks(
        doc_id=doc_id,
        title=title,
        source="web",
        chunks=chunks,
        extra_meta={"tool": "SEARCH_WEB", "query": query},
    )

def save_patent_result_to_rag(query: str, raw_text: str):
    """
    Save Google Patents (via Tavily) output into RAG.
    """
    if not raw_text:
        return

    doc_id = f"patent:{uuid.uuid4()}"
    title = f"Patent search: {query[:80]}"

    text_chunks = chunk_text_paragraphs(raw_text, max_chars=1200)

    chunks = []
    total_parts = len(text_chunks)
    for i, chunk_text in enumerate(text_chunks):
        chunks.append({
            "id": f"{doc_id}:chunk-{i}",
            "conversational": conversationofy(chunk_text),
            "key_details": [
                "Tool: SEARCH_PATENTS",
                f"Query: {query}",
                f"Part: {i+1}/{total_parts}",
            ],
            "source_extract": chunk_text,
            "faq": [],
        })

    store_document_chunks(
        doc_id=doc_id,
        title=title,
        source="patent",
        chunks=chunks,
        extra_meta={"tool": "SEARCH_PATENTS", "query": query},
    )

def save_code_result_to_rag(code: str, exec_result: str, user_query: str = ""):
    """
    Save a code run (code + result) into RAG so you can reuse the computation.
    """
    if not code and not exec_result:
        return

    doc_id = f"python:{uuid.uuid4()}"
    title_snippet = code.replace("\n", " ")[:80]
    title = f"Python execution: {title_snippet}"

    raw_text = f"Code:\n{code}\n\nResult:\n{exec_result}"

    text_chunks = chunk_text_paragraphs(raw_text, max_chars=1500)

    chunks = []
    total_parts = len(text_chunks)
    for i, chunk_text in enumerate(text_chunks):
        chunks.append({
            "id": f"{doc_id}:chunk-{i}",
            # For code, conversationalifying can be noisy; you can also just use chunk_text
            "conversational": chunk_text,
            "key_details": [
                "Tool: EXECUTE_CODE",
                f"Original query: {user_query}",
                f"Part: {i+1}/{total_parts}",
            ],
            "source_extract": chunk_text,
            "faq": [],
        })

    store_document_chunks(
        doc_id=doc_id,
        title=title,
        source="python",
        chunks=chunks,
        extra_meta={"tool": "EXECUTE_CODE", "query": user_query},
    )

def chunk_text_paragraphs(text: str, max_chars: int = 1200) -> list[str]:
    """
    Very simple semantic chunking:
    - Split on blank lines (paragraphs)
    - Accumulate until ~max_chars, then start a new chunk
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        # +2 for the extra "\n\n" we add
        if len(current) + len(para) + 2 > max_chars:
            if current.strip():
                chunks.append(current.strip())
            current = para + "\n\n"
        else:
            current += para + "\n\n"

    if current.strip():
        chunks.append(current.strip())

    return chunks
