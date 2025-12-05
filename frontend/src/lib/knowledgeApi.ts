// src/lib/knowledgeApi.ts

export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  extra_meta?: Record<string, any> | null;
  created_at: string;
}

export interface KnowledgeChunk {
  id: string;
  doc_id: string;
  conversational: string;
  // we allow any here because backend may give list or null
  key_details?: any;
  source_extract?: string | null;
  faq?: any;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function url(path: string) {
  return `${API_BASE}${path}`;
}

async function safeJsonFetch<T>(path: string): Promise<T> {
  const res = await fetch(url(path));
  const text = await res.text(); // raw body

  if (!res.ok) {
    console.error("❌ Fetch error", path, res.status);
    console.error("Body:", text);
    throw new Error(`Request failed: ${res.status}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("❌ JSON.parse failed for", path);
    console.error("Raw response:\n", text);
    throw err;
  }
}

export function fetchKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  return safeJsonFetch<KnowledgeDocument[]>("/api/knowledge/documents");
}

export function fetchKnowledgeChunks(
  docId?: string
): Promise<KnowledgeChunk[]> {
  const path = docId
    ? `/api/knowledge/chunks?doc_id=${encodeURIComponent(docId)}`
    : `/api/knowledge/chunks`;
  return safeJsonFetch<KnowledgeChunk[]>(path);
}

export async function deleteKnowledgeDocument(id: string): Promise<void> {
  const res = await fetch(
    url(`/api/knowledge/documents/${encodeURIComponent(id)}`),
    {
      method: "DELETE",
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Try to parse JSON if it looks like JSON, otherwise ignore
  try {
    if (text && text.trim().startsWith("{")) {
      JSON.parse(text);
    }
  } catch {
    // ignore – we don't actually need the body for success
  }
}

export async function deleteKnowledgeChunk(id: string): Promise<void> {
  const res = await fetch(
    url(`/api/knowledge/chunks/${encodeURIComponent(id)}`),
    {
      method: "DELETE",
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    if (text && text.trim().startsWith("{")) {
      JSON.parse(text);
    }
  } catch {
    // ignore
  }
}

// Upload PDF -> FastAPI /api/upload_pdf
export async function uploadKnowledgePdf(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url("/api/upload_pdf"), {
    method: "POST",
    body: formData,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("❌ PDF upload failed", text);
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    if (text && text.trim().startsWith("{")) {
      return JSON.parse(text);
    }
  } catch {
    // ignore parse error, return raw text
  }
  return text;
}
