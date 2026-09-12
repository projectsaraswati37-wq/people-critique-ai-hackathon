import React, { useEffect, useRef } from 'react';

interface AIOrb {
  speaking: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AIOrb: React.FC<AIOrb> = ({ speaking, size = 'md' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const sizes = { sm: 48, md: 72, lg: 96 };
  const px = sizes[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (timestamp: number) => {
      timeRef.current = timestamp / 1000;
      const t = timeRef.current;
      const cx = px / 2;
      const cy = px / 2;
      const r = px * 0.35;

      ctx.clearRect(0, 0, px, px);

      // Outer glow ring
      const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.4);
      grad.addColorStop(0, 'rgba(0,212,255,0.25)');
      grad.addColorStop(1, 'rgba(0,212,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core orb
      const coreGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 1, cx, cy, r);
      coreGrad.addColorStop(0, '#00eeff');
      coreGrad.addColorStop(0.5, '#0066aa');
      coreGrad.addColorStop(1, '#001133');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Waveform bars
      if (speaking) {
        const bars = 7;
        const barW = (r * 1.2) / bars;
        const startX = cx - (r * 0.6);
        for (let i = 0; i < bars; i++) {
          const phase = t * 8 + i * 1.1;
          const h = (Math.sin(phase) * 0.5 + 0.5) * r * 0.7 + r * 0.15;
          const bx = startX + i * barW + barW / 2;
          ctx.beginPath();
          ctx.roundRect(bx - barW * 0.3, cy - h / 2, barW * 0.6, h, 2);
          ctx.fillStyle = `rgba(0,255,180,${0.7 + Math.sin(phase) * 0.3})`;
          ctx.fill();
        }
      } else {
        // Idle pulse ring
        const pulseR = r * (0.7 + Math.sin(t * 2) * 0.08);
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,212,255,${0.4 + Math.sin(t * 2) * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [speaking, px]);

  return (
    <canvas
      ref={canvasRef}
      width={px}
      height={px}
      style={{ display: 'block' }}
    />
  );
};

export default AIOrb;
