import { useState, useCallback, useRef } from "react";
import { fetchKnowledgeDocuments } from "@/lib/knowledgeApi";
import { toast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface UsePdfUploadReturn {
  isUploading: boolean;
  uploadPdf: (file: File) => Promise<void>;
}

export function usePdfUpload(onComplete?: () => void): UsePdfUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const docCountBeforeRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollForCompletion = useCallback(
    (expectedDocId?: string) => {
      stopPolling();

      const checkDocs = async () => {
        try {
          const docs = await fetchKnowledgeDocuments();
          
          // Check if new document appeared OR doc count increased
          const newDocFound = expectedDocId
            ? docs.some((d) => d.id === expectedDocId)
            : docs.length > docCountBeforeRef.current;

          if (newDocFound) {
            stopPolling();
            setIsUploading(false);
            toast({
              title: "Upload complete",
              description: "Document has been ingested into the knowledge base.",
            });
            onComplete?.();
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      };

      // Poll every 2 seconds
      pollingRef.current = setInterval(checkDocs, 2000);

      // Also run once immediately after a short delay
      setTimeout(checkDocs, 1000);

      // Safety timeout: stop polling after 2 minutes
      setTimeout(() => {
        if (pollingRef.current) {
          stopPolling();
          setIsUploading(false);
          toast({
            title: "Upload status unknown",
            description: "Processing took longer than expected. Check the sidebar.",
            variant: "destructive",
          });
        }
      }, 120000);
    },
    [stopPolling, onComplete]
  );

  const uploadPdf = useCallback(
    async (file: File) => {
      if (!file) return;

      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        return;
      }

      // Capture current doc count before upload
      try {
        const currentDocs = await fetchKnowledgeDocuments();
        docCountBeforeRef.current = currentDocs.length;
      } catch {
        docCountBeforeRef.current = 0;
      }

      setIsUploading(true);
      toast({
        title: "Processing PDF...",
        description: `Uploading ${file.name}`,
      });

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE}/api/upload_pdf`, {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        console.log("PDF Upload Response:", json);

        if (res.ok) {
          // Backend returned success, now poll for ingestion completion
          const docId = json.doc_id || json.id;
          pollForCompletion(docId);
        } else {
          setIsUploading(false);
          toast({
            title: "Upload failed",
            description: json.detail || json.message || "Failed to upload PDF.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("Upload error:", err);
        setIsUploading(false);
        toast({
          title: "Upload error",
          description: err.message || "Network error occurred.",
          variant: "destructive",
        });
      }
    },
    [pollForCompletion]
  );

  return { isUploading, uploadPdf };
}
