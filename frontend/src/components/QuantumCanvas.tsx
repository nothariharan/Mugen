import React, { useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; o: number;
}

/**
 * Shared ambient particle-network canvas — reused across Hero and HowItWorks.
 * Positions itself absolute to its nearest `relative` parent.
 */
const QuantumCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const noMotion  = useReducedMotion();

  useEffect(() => {
    if (noMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const N = 110, CONNECT = 155, SPEED = 0.32;

    const pts: Particle[] = Array.from({ length: N }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r:  Math.random() * 1.4 + 0.4,
      o:  Math.random() * 0.4 + 0.12,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      ctx.lineWidth = 0.5;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.hypot(dx, dy);
          if (d < CONNECT) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / CONNECT) * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [noMotion]);

  if (noMotion) return null;
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default QuantumCanvas;
