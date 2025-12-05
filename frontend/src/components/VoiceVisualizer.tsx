import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface VoiceVisualizerProps {
  isActive: boolean;
  className?: string;
}

const VoiceVisualizer = ({ isActive, className }: VoiceVisualizerProps) => {
  const [bars, setBars] = useState<number[]>(Array(12).fill(0.2));

  useEffect(() => {
    if (!isActive) {
      setBars(Array(12).fill(0.2));
      return;
    }

    const interval = setInterval(() => {
      setBars(
        Array(12)
          .fill(0)
          .map(() => Math.random() * 0.8 + 0.2)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className={cn("flex items-center justify-center gap-1 h-20", className)}>
      {bars.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-2 bg-gradient-to-t from-accent to-primary rounded-full transition-all duration-100",
            "shadow-[0_0_10px_rgba(0,255,255,0.6)]",
            isActive && "animate-pulse"
          )}
          style={{
            height: `${height * 100}%`,
            opacity: isActive ? 0.8 + height * 0.2 : 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default VoiceVisualizer;
