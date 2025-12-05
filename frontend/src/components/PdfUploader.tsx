import { useState, useRef } from "react";
import { Upload, Loader2, FileText, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function PdfUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    setStatus("uploading");

    // Show non-blocking toast
    toast({
      title: "Processing document...",
      description: `Uploading ${file.name}`,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/api/upload_pdf", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (res.ok) {
        setStatus("success");
        toast({
          title: "Upload complete",
          description: json.message || "Document processed successfully.",
        });
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        onUploadComplete?.();
      } else {
        setStatus("error");
        toast({
          title: "Upload failed",
          description: json.detail || "Failed to process document.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setStatus("error");
      toast({
        title: "Upload error",
        description: err.message || "Network error occurred.",
        variant: "destructive",
      });
    } finally {
      // Reset status after a delay
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setStatus("idle");
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-xl",
        "bg-[hsl(var(--background)/0.5)] border border-[hsl(var(--accent)/0.15)]",
        "transition-all duration-200"
      )}
    >
      {/* File input */}
      <label
        className={cn(
          "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer",
          "bg-[hsl(var(--accent)/0.05)] border border-dashed border-[hsl(var(--accent)/0.3)]",
          "hover:border-[hsl(var(--accent)/0.5)] hover:bg-[hsl(var(--accent)/0.1)]",
          "transition-all duration-150"
        )}
      >
        <FileText className="h-4 w-4 text-[hsl(var(--accent))]" />
        <span className="text-xs text-[hsl(var(--foreground)/0.7)] truncate flex-1">
          {file ? file.name : "Select PDF..."}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Upload button */}
      <Button
        onClick={upload}
        disabled={!file || status === "uploading"}
        size="sm"
        className={cn(
          "h-8 px-3",
          "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
          "hover:bg-[hsl(var(--accent)/0.9)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-150"
        )}
      >
        {status === "uploading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle className="h-4 w-4" />
        ) : status === "error" ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}