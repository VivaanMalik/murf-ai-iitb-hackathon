import { cn } from "@/lib/utils";

interface WaveformProps {
  isActive: boolean;
  className?: string;
}

const Waveform = ({ isActive, className }: WaveformProps) => {
  const bars = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className={cn("flex items-center justify-center gap-1.5 h-12", className)}>
      {bars.map((i) => (
        <div
          key={i}
          className={cn(
            "w-1 bg-waveform rounded-full transition-all duration-300",
            isActive ? "animate-wave" : "h-2"
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            height: isActive ? undefined : "8px",
          }}
        />
      ))}
    </div>
  );
};

export default Waveform;
