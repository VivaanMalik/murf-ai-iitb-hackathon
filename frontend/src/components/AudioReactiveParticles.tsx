import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioReactiveParticlesProps {
  isActive: boolean;
  audioStream?: MediaStream | null;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  opacity: number;
  hue: number;
}

const AudioReactiveParticles = ({
  isActive,
  audioStream,
  className,
}: AudioReactiveParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Helper to get accent hue from CSS variable
    const getAccentHue = () => {
      if (typeof window === 'undefined') return 180;
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      // Parse HSL string like "180 100% 50%" to get just the hue "180"
      const hueMatch = accent.split(' ')[0];
      return hueMatch ? parseFloat(hueMatch) : 180;
    };

    // Initialize particles
    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => {
      const baseHue = getAccentHue();
      return {
        x: Math.random() * canvas.width / window.devicePixelRatio,
        y: Math.random() * canvas.height / window.devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        baseSize: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        hue: baseHue + Math.random() * 20 - 10,
      };
    });

    // Setup Web Audio API
    if (audioStream && !audioContextRef.current) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch (err) {
        console.error("Error initializing audio context:", err);
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      
      let audioLevel = 0;
      if (isActive && analyserRef.current && dataArrayRef.current) {
        // FIX: Cast to 'any' to resolve the Uint8Array<ArrayBufferLike> vs Uint8Array<ArrayBuffer> mismatch
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
        
        const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
        audioLevel = average / 128; // Normalize 0-2 roughly
      }

      // Get current accent hue for dynamic updates
      const currentAccentHue = getAccentHue();

      particlesRef.current.forEach((particle) => {
        // Update physics
        particle.x += particle.vx * (1 + audioLevel * 2);
        particle.y += particle.vy * (1 + audioLevel * 2);

        // Boundary wrap
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        // Audio reactive size
        const targetSize = particle.baseSize * (1 + audioLevel * 3);
        particle.size += (targetSize - particle.size) * 0.1;

        // Draw particle with DYNAMIC HUE
        const localHue = currentAccentHue + (particle.hue % 20) - 10; 
        
        ctx.fillStyle = `hsla(${localHue}, 100%, 70%, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections between nearby particles
      if (isActive && audioLevel > 0.1) {
        particlesRef.current.forEach((p1, i) => {
          particlesRef.current.slice(i + 1).forEach((p2) => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100 * (1 + audioLevel)) {
              ctx.strokeStyle = `hsla(${currentAccentHue}, 100%, 50%, ${(1 - distance / 100) * audioLevel * 0.3})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          });
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isActive, audioStream]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full pointer-events-none", className)}
    />
  );
};

export default AudioReactiveParticles;