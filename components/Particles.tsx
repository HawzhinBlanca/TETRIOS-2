
import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

// Particle Pool Configuration
const MAX_PARTICLES = 300; // Fixed pool size

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  decay: number;
}

export interface ParticlesHandle {
  spawn: (x: number, y: number, color: string, amount?: number) => void;
  spawnExplosion: (y: number, color?: string) => void;
  spawnBurst: (x: number, y: number, color: string, amount?: number) => void;
}

interface Props {
    cellSize: number;
}

/**
 * Renders a particle effects system on a canvas using Object Pooling.
 * Uses rounded particles with global composite operations for a glowing look.
 */
const Particles = forwardRef<ParticlesHandle, Props>(({ cellSize }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Pre-allocate particles
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      color: '#fff',
      size: 0,
      decay: 0
    }))
  );
  const animationFrameId = useRef<number>(0);

  // Helper to find inactive particles and activate them
  const spawnParticle = (x: number, y: number, vx: number, vy: number, color: string, size: number, decay: number) => {
    const pool = particlesRef.current;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!pool[i].active) {
        pool[i].active = true;
        pool[i].x = x;
        pool[i].y = y;
        pool[i].vx = vx;
        pool[i].vy = vy;
        pool[i].life = 1.0;
        pool[i].color = color;
        pool[i].size = size;
        pool[i].decay = decay;
        return;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    spawn: (x: number, y: number, color: string, amount: number = 10): void => {
      if (!canvasRef.current) return;
      const px = x * cellSize + (cellSize / 2);
      const py = y * cellSize + (cellSize / 2);
      
      for (let i = 0; i < amount; i++) {
        spawnParticle(
          px,
          py,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10 - 5, // Upward bias
          color,
          Math.random() * (cellSize / 4) + 2,
          0.02 + Math.random() * 0.02
        );
      }
    },
    spawnExplosion: (y: number, color: string = 'white'): void => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.width;
        const py = y * cellSize + (cellSize / 2);
        
        for (let i = 0; i < 40; i++) {
             spawnParticle(
                w / 2, 
                py,
                (Math.random() - 0.5) * 40, // Wide horizontal spread
                (Math.random() - 0.5) * 15,
                color,
                Math.random() * (cellSize / 3) + 3,
                0.01 + Math.random() * 0.02
             );
        }
    },
    spawnBurst: (x: number, y: number, color: string, amount: number = 30): void => {
        if (!canvasRef.current) return;
        const px = x * cellSize + (cellSize / 2);
        const py = y * cellSize + (cellSize / 2);

        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 2;
            spawnParticle(
                px,
                py,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Math.random() * (cellSize / 3) + 2,
                0.02 + Math.random() * 0.03
            );
        }
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
        }
    });
    
    resizeObserver.observe(canvas);

    const render = () => {
      if (!ctx || !canvas) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Additive blending for glowing effect
      ctx.globalCompositeOperation = 'lighter';

      const pool = particlesRef.current;
      
      // Optimization: Use a simple loop
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = pool[i];
        if (!p.active) continue;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.vx *= 0.96; // Drag
        p.vy *= 0.96;
        p.life -= p.decay;
        p.size *= 0.95;

        if (p.life <= 0 || p.size <= 0.2) {
            p.active = false;
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            
            // Soft circle rendering
            if (p.x > -20 && p.x < canvas.width + 20 && p.y > -20 && p.y < canvas.height + 20) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
      }
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();
    return () => {
        resizeObserver.disconnect();
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [cellSize]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20 w-full h-full" />;
});

export default Particles;
