import { useEffect, useRef } from "react";

interface BackgroundParticlesProps {
  audioStream: MediaStream | null; // your mic stream from useVoiceChat
  accentColor: string;             // e.g. "180 100% 50%" used as hsl(...)
  isAgentSpeaking: boolean;
}

class Particle {
  x: number;
  y: number;
  size: number;
  baseSize: number;
  speedX: number;
  speedY: number;
  alpha: number;

  constructor(public width: number, public height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.baseSize = Math.random() * 2 + 1;
    this.size = this.baseSize;
    this.speedX = Math.random() * 0.8 - 0.4;
    this.speedY = Math.random() * 0.8 - 0.4;
    this.alpha = Math.random() * 0.6 + 0.1;
  }

  update(audioLevel: number) {
    const speedBoost = 1 + audioLevel * 2.5;

    this.x += this.speedX * speedBoost;
    this.y += this.speedY * speedBoost;

    if (this.x < 0 || this.x > this.width) this.speedX *= -1;
    if (this.y < 0 || this.y > this.height) this.speedY *= -1;

    const targetSize = this.baseSize * (1 + audioLevel * 3);
    this.size += (targetSize - this.size) * 0.1;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    accentColor: string,
    audioLevel: number
  ) {
    const dynamicAlpha = Math.min(1, this.alpha + audioLevel * 0.4);
    ctx.fillStyle = `hsl(${accentColor} / ${dynamicAlpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

const BackgroundParticles: React.FC<BackgroundParticlesProps> = ({
  audioStream,
  accentColor,
  isAgentSpeaking,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const agentSpeakingRef = useRef(isAgentSpeaking);
  const lastTimeRef = useRef<number>(0);

  // keep latest isAgentSpeaking in a ref so we don't restart the whole effect
  useEffect(() => {
    agentSpeakingRef.current = isAgentSpeaking;
  }, [isAgentSpeaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      particlesRef.current = [];
      const count = 80;
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(new Particle(canvas.width, canvas.height));
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ---- MIC AUDIO SETUP ----
    const setupAudio = () => {
      if (!audioStream) return;
      if (audioContextRef.current) return; // already set up

      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      try {
        const audioCtx: AudioContext = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);

        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch (err) {
        console.error("Error setting up mic analyser for background:", err);
      }
    };

    setupAudio();

    const animate = (time: number) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // 1) MIC audio level
      let micLevel = 0;
      if (analyserRef.current && dataArrayRef.current) {
        const dataArray = dataArrayRef.current as Uint8Array<ArrayBuffer>;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        micLevel = avg / 128; // ~0–2
      }

      // 2) AGENT “audio” level (synthetic pulse while speaking)
      let agentLevel = 0;
      if (agentSpeakingRef.current) {
        // Smooth pulsing between 0.15 and 0.45 while agent is speaking
        const pulseSpeed = 2.5; // pulses per second
        const phase = time * 0.001 * pulseSpeed * Math.PI * 2;
        agentLevel = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(phase));
      }

      // 3) Combine levels
      const combinedLevel = Math.min(1.6, micLevel + agentLevel);

      // Update + draw particles
      particlesRef.current.forEach((p) => {
        p.update(combinedLevel);
        p.draw(ctx, accentColor, combinedLevel);
      });

      // Connect nearby particles, line intensity reacts to audio
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 120 * (1 + combinedLevel * 0.7);
          if (dist < maxDist) {
            const baseAlpha = 1 - dist / maxDist;
            const lineAlpha = baseAlpha * (0.12 + combinedLevel * 0.25);
            ctx.strokeStyle = `hsl(${accentColor} / ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, [audioStream, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
      style={{ zIndex: 0 }}
    />
  );
};

export default BackgroundParticles;
