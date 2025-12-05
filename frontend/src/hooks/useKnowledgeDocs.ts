import { useEffect, useState } from "react";

export function useKnowledgeDocs(refreshKey: number) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/api/knowledge/documents");
        const data = await res.json();
        if (!cancelled) setDocs(data);
      } catch (err) {
        console.error("Failed to load knowledge docs", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { docs, loading };
}
