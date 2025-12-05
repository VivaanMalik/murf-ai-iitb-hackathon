import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordButtonProps {
  isRecording: boolean;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}

const RecordButton = ({
  isRecording,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
}: RecordButtonProps) => {
  return (
    <button
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn(
        "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 touch-none select-none",
        "border-2",
        "shadow-[0_0_50px_hsl(var(--accent)/0.6)]",
        isRecording
          ? "border-accent scale-110 shadow-[0_0_80px_hsl(var(--accent)/0.8)]"
          : "bg-background border-accent hover:scale-105 hover:shadow-[0_0_70px_hsl(var(--accent)/0.9)]"
      )}
      style={{
        backgroundColor: isRecording ? 'hsl(var(--accent))' : 'hsl(var(--accent) / 0.1)',
        borderColor: 'hsl(var(--accent))'
      }}
    >
      {/* Ripple effect - uses accent color */}
      {isRecording && (
        <div className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
      )}

      {/* Mic Icon */}
      <Mic
        className={cn(
          "w-10 h-10 transition-colors duration-300 z-10",
          isRecording ? "text-accent-foreground" : "text-accent"
        )}
      />
    </button>
  );
};

export default RecordButton;