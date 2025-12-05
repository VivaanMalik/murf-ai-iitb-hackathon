import { Loader2 } from "lucide-react";

interface PdfProcessingIndicatorProps {
  isVisible: boolean;
}

export default function PdfProcessingIndicator({ isVisible }: PdfProcessingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed top-4 right-4 px-4 py-3 rounded-xl z-[9999] pointer-events-none
        bg-[hsl(var(--background)/0.95)] border border-[hsl(var(--accent))]
        text-[hsl(var(--accent))]
        shadow-[0_0_20px_hsl(var(--accent-glow)),0_0_40px_hsl(var(--accent-glow))]
        backdrop-blur-md
        flex items-center gap-3"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">Processing PDF…</span>
    </div>
  );
}
