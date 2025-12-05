import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  fetchKnowledgeDocuments,
  fetchKnowledgeChunks,
  KnowledgeDocument,
  KnowledgeChunk,
  deleteKnowledgeDocument,
  deleteKnowledgeChunk,
} from "@/lib/knowledgeApi";
import { ChevronLeft, ChevronRight, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KnowledgeSidebarRef {
  refreshDocuments: () => void;
}

interface KnowledgeSidebarProps {
  initialOpen?: boolean;
  refreshKey?: number;
}

const MIN_WIDTH = 240;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = MAX_WIDTH;

const KnowledgeSidebar = forwardRef<KnowledgeSidebarRef, KnowledgeSidebarProps>(
  ({ initialOpen = true, refreshKey }, ref) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const isResizing = useRef(false);

    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isLoadingChunks, setIsLoadingChunks] = useState(false);
    const [showAllChunks, setShowAllChunks] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ------- Load docs -------
    const loadDocuments = useCallback(async () => {
      try {
        setIsLoadingDocs(true);
        const docs = await fetchKnowledgeDocuments();
        setDocuments(docs);
      } catch (err: any) {
        console.error("Failed to load documents:", err);
        setError(err.message ?? "Failed to load documents");
      } finally {
        setIsLoadingDocs(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      refreshDocuments: () => {
        loadDocuments();
      },
    }));

    useEffect(() => {
      loadDocuments();
    }, [loadDocuments]);

    useEffect(() => {
      if (refreshKey !== undefined) {
        loadDocuments();
      }
    }, [refreshKey, loadDocuments]);

    // ------- Load chunks -------
    useEffect(() => {
      (async () => {
        try {
          setIsLoadingChunks(true);
          const data = await fetchKnowledgeChunks(
            showAllChunks ? undefined : selectedDocId || undefined
          );
          setChunks(data);
        } catch (err: any) {
          console.error("Failed to load chunks:", err);
          setError(err.message ?? "Failed to load chunks");
        } finally {
          setIsLoadingChunks(false);
        }
      })();
    }, [selectedDocId, showAllChunks, refreshKey]);

    // ------- Delete handlers -------
    const handleDeleteDocument = async (docId: string) => {
      if (!window.confirm("Delete this document and all its chunks?")) return;
      try {
        await deleteKnowledgeDocument(docId);
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setChunks((prev) => prev.filter((c) => c.doc_id !== docId));
        if (selectedDocId === docId) {
          setSelectedDocId(null);
          setShowAllChunks(true);
        }
      } catch (err: any) {
        console.error("Failed to delete document:", err);
        setError(
          `Failed to delete document: ${err?.message ?? String(err)}`
        );
      }
    };

    const handleDeleteChunk = async (chunkId: string) => {
      if (!window.confirm("Delete this chunk?")) return;
      try {
        await deleteKnowledgeChunk(chunkId);
        setChunks((prev) => prev.filter((c) => c.id !== chunkId));
      } catch (err: any) {
        console.error("Failed to delete chunk:", err);
        setError(`Failed to delete chunk: ${err?.message ?? String(err)}`);
      }
    };

    const toggleOpen = () => setIsOpen((v) => !v);

    // --- Drag Resize ---
    const startResize = () => {
      if (!isOpen) return;
      isResizing.current = true;
      document.body.style.cursor = "col-resize";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newW);
    };

    const stopResize = () => {
      isResizing.current = false;
      document.body.style.cursor = "default";
    };

    useEffect(() => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopResize);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", stopResize);
      };
    }, []);

    return (
      <div
        className={cn(
          "h-full flex flex-col relative",
          "bg-gradient-to-b from-[hsl(var(--background))] via-[hsl(220_10%_8%)] to-[hsl(var(--background))]",
          "border-r border-[hsl(var(--accent)/0.15)]",
          "transition-[width] duration-[220ms] ease-in-out"
        )}
        style={{ width: isOpen ? width : 48 }}
      >
        {/* Glossy overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none rounded-r-2xl" />

        {/* Collapse Button */}
        <button
          onClick={toggleOpen}
          className={cn(
            "absolute -right-4 top-6 z-20 rounded-full",
            "h-8 w-8 flex items-center justify-center",
            "bg-[hsl(var(--background))] border-2 border-[hsl(var(--accent))]",
            "text-[hsl(var(--accent))]",
            "shadow-[0_0_20px_hsl(var(--accent-glow)),0_0_40px_hsl(var(--accent-glow))]",
            "hover:scale-110 hover:shadow-[0_0_30px_hsl(var(--accent-glow)),0_0_60px_hsl(var(--accent-glow))]",
            "transition-all duration-200"
          )}
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Collapsed view: icon at top */}
        {!isOpen && (
          <div className="pt-4 flex flex-col items-center">
            <div
              className={cn(
                "h-10 w-10 rounded-2xl flex items-center justify-center",
                "bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.5)]",
                "shadow-[0_0_15px_hsl(var(--accent-glow))]",
                "transition-shadow duration-200",
                "hover:shadow-[0_0_25px_hsl(var(--accent-glow))]"
              )}
            >
              <Database className="h-5 w-5 text-[hsl(var(--accent))]" />
            </div>
          </div>
        )}

        {/* Expanded view */}
        {isOpen && (
          <>
            {/* Header */}
            <div
              className={cn(
                "px-5 py-4 border-b border-[hsl(var(--accent)/0.1)]",
                "bg-gradient-to-r from-[hsl(var(--accent)/0.05)] via-transparent to-transparent",
                "backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-2xl flex items-center justify-center",
                    "bg-[hsl(var(--accent)/0.15)] border border-[hsl(var(--accent)/0.6)]",
                    "shadow-[0_0_15px_hsl(var(--accent-glow)),inset_0_1px_0_rgba(255,255,255,0.1)]"
                  )}
                >
                  <Database className="h-5 w-5 text-[hsl(var(--accent))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-[hsl(var(--accent))] uppercase tracking-wider truncate">
                    Knowledge DB
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    Files &amp; chunks powering RAG
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT: documents */}
              <div
                className={cn(
                  "w-44 border-r border-[hsl(var(--accent)/0.08)]",
                  "bg-[hsl(var(--background)/0.5)] overflow-y-auto",
                  "relative"
                )}
              >
                {/* top fade */}
                <div className="sticky top-0 h-4 bg-gradient-to-b from-[hsl(var(--background))] to-transparent z-10 pointer-events-none" />

                <div className="px-2 pb-2 space-y-1">
                  {/* “All chunks” button */}
                  <button
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-200",
                      showAllChunks
                        ? "text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.4)] shadow-[0_0_15px_hsl(var(--accent-glow))]"
                        : "text-[hsl(var(--foreground)/0.7)] hover:bg-[hsl(var(--accent)/0.05)] border border-transparent"
                    )}
                    onClick={() => {
                      setShowAllChunks(true);
                      setSelectedDocId(null);
                    }}
                  >
                    <span className="font-medium">All chunks</span>
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Everything in DB
                    </div>
                  </button>

                  {/* Documents */}
                  {documents.map((doc) => {
                    const selected =
                      !showAllChunks && selectedDocId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl text-xs transition-all duration-200",
                          selected
                            ? "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.4)] shadow-[0_0_15px_hsl(var(--accent-glow))]"
                            : "text-[hsl(var(--foreground)/0.7)] hover:bg-[hsl(var(--accent)/0.05)] border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              setShowAllChunks(false);
                            }}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className="font-medium truncate">
                              {doc.title}
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border border-destructive/60 text-destructive hover:bg-destructive/10 flex-shrink-0"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                          {new Date(doc.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* bottom fade */}
                <div className="sticky bottom-0 h-8 bg-gradient-to-t from-[hsl(var(--background))] to-transparent pointer-events-none" />
              </div>

              {/* RIGHT: chunks */}
              <div className="flex-1 overflow-y-auto bg-[hsl(var(--background)/0.3)] relative">
                {/* header bar */}
                <div
                  className={cn(
                    "sticky top-0 z-10 px-4 py-2.5",
                    "bg-[hsl(var(--background)/0.9)] backdrop-blur-md",
                    "border-b border-[hsl(var(--accent)/0.08)]",
                    "flex justify-between items-center"
                  )}
                >
                  <span className="text-xs text-[hsl(var(--foreground)/0.8)] truncate">
                    {showAllChunks
                      ? "All chunks"
                      : `Chunks for: ${selectedDocId || ""}`}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded-full",
                      "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]",
                      "border border-[hsl(var(--accent)/0.3)]"
                    )}
                  >
                    {chunks.length}
                  </span>
                </div>

                <div className="space-y-3 px-3 py-4">
                  {isLoadingChunks ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 border-2 border-[hsl(var(--accent)/0.3)] border-t-[hsl(var(--accent))] rounded-full animate-spin" />
                    </div>
                  ) : (
                    chunks.map((chunk) => {
                      const keyDetails = Array.isArray(chunk.key_details)
                        ? chunk.key_details
                        : [];
                      const faq = Array.isArray(chunk.faq) ? chunk.faq : [];

                      return (
                        <div
                          key={chunk.id}
                          className={cn(
                            "rounded-2xl p-4 transition-all duration-200",
                            "bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(220_10%_12%)]",
                            "border border-[hsl(var(--accent)/0.1)]",
                            "hover:border-[hsl(var(--accent)/0.4)] hover:shadow-[0_0_20px_hsl(var(--accent-glow))]",
                            "backdrop-blur-sm"
                          )}
                        >
                          {/* Header row: chunk id + delete */}
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={cn(
                                "inline-block text-[10px] font-mono px-2 py-0.5 rounded-lg",
                                "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--muted-foreground))]",
                                "border border-[hsl(var(--accent)/0.2)]",
                                "truncate flex-1 min-w-0"
                              )}
                              title={chunk.id}
                            >
                              {chunk.id}
                            </div>
                            <button
                              onClick={() => handleDeleteChunk(chunk.id)}
                              className="text-[10px] px-1.5 py-0.5 rounded-full border border-destructive/60 text-destructive hover:bg-destructive/10 flex-shrink-0"
                            >
                              Delete
                            </button>
                          </div>

                          <p className="text-xs text-[hsl(var(--foreground)/0.9)] leading-relaxed mb-3 line-clamp-4">
                            {chunk.conversational}
                          </p>

                          {/* keyDetails / FAQ / source_extract sections could go here if you want */}
                          {keyDetails.length > 0 && (
                            <details className="group [&[open]>summary]:mb-2">
                              <summary className="text-[11px] font-medium text-[hsl(var(--accent))] cursor-pointer list-none">
                                Key details
                              </summary>
                              <ul className="text-[11px] text-[hsl(var(--foreground)/0.7)] list-disc list-inside space-y-1 pl-4">
                                {keyDetails.map((k, i) => (
                                  <li key={i}>{k}</li>
                                ))}
                              </ul>
                            </details>
                          )}

                          {faq.length > 0 && (
                            <details className="mt-2 group [&[open]>summary]:mb-2">
                              <summary className="text-[11px] font-medium text-[hsl(var(--accent))] cursor-pointer list-none">
                                FAQ
                              </summary>
                              <ul className="text-[11px] text-[hsl(var(--foreground)/0.7)] list-disc list-inside space-y-2 pl-4">
                                {faq.map((f, i) => (
                                  <li key={i}>
                                    <strong>Q:</strong> {f.q}
                                    <br />
                                    <strong>A:</strong> {f.a}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}

                          {chunk.source_extract && (
                            <details className="mt-2 group [&[open]>summary]:mb-2">
                              <summary className="text-[11px] font-medium text-[hsl(var(--accent))] cursor-pointer list-none">
                                Source extract
                              </summary>
                              <p className="text-[11px] text-[hsl(var(--foreground)/0.6)] whitespace-pre-wrap font-mono leading-relaxed pl-4">
                                {chunk.source_extract}
                              </p>
                            </details>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={startResize}
              className={cn(
                "absolute top-0 right-0 h-full w-1 cursor-col-resize",
                "bg-transparent hover:bg-[hsl(var(--accent)/0.25)]",
                "transition-all duration-150",
                "hover:shadow-[0_0_8px_hsl(var(--accent-glow))]"
              )}
            />
          </>
        )}
      </div>
    );
  }
);

KnowledgeSidebar.displayName = "KnowledgeSidebar";

export default KnowledgeSidebar;
