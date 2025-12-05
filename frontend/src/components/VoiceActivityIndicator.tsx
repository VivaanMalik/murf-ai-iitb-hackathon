import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceActivityIndicatorProps {
  isActive: boolean;
  className?: string;
}

const VoiceActivityIndicator = ({ isActive, className }: VoiceActivityIndicatorProps) => {
  if (!isActive) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 py-4 px-6",
        "bg-gradient-to-r from-primary/20 to-accent/20",
        "border-2 border-primary/40 rounded-2xl",
        "shadow-[0_0_30px_rgba(0,255,255,0.3)]",
        "animate-pulse-glow",
        className
      )}
    >
      <Volume2 className="w-6 h-6 text-primary animate-pulse" />
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "w-1 bg-primary rounded-full",
              "animate-[wave_1s_ease-in-out_infinite]"
            )}
            style={{
              height: "20px",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-primary/90">
        Agent Speaking...
      </span>
    </div>
  );
};

export default VoiceActivityIndicator;
