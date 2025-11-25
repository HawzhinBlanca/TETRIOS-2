
import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

// Particle Pool Configuration
const MAX_PARTICLES = 800; // Increased for intense effects including shockwaves

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
  spawnExplosion: (y: number, color?: string, amount?: number) => void;
  spawnBurst: (x: number, y: number, color: string, amount?: number) => void;
  spawnRing: (x: number, y: number, color: string) => void;
  spawnShockwave: (x: number, y: number, color?: string) => void;
  spawnTSpin: (x: number, y: number, color?: string) => void;
}

interface Props {
    cellSize: number;
    paused?: boolean;
}

/**
 * Renders a particle effects system on a canvas using Object Pooling.
 * Optimized for "Spark" physics: high velocity, high drag, fast decay.
 */
const Particles = forwardRef<ParticlesHandle, Props>(({ cellSize, paused }, ref) => {
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
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        spawnParticle(
          px,
          py,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          color,
          Math.random() * 3 + 1, // Smaller sparks
          0.03 + Math.random() * 0.03 // Fast decay
        );
      }
    },
    spawnExplosion: (y: number, color: string = 'white', amount: number = 30): void => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.width;
        const py = y * cellSize + (cellSize / 2);
        
        for (let i = 0; i < amount; i++) {
             spawnParticle(
                w / 2, 
                py,
                (Math.random() - 0.5) * 40, // Wide spread
                (Math.random() - 0.5) * 15,
                color,
                Math.random() * 4 + 1,
                0.02 + Math.random() * 0.03
             );
        }
    },
    spawnBurst: (x: number, y: number, color: string, amount: number = 30): void => {
        if (!canvasRef.current) return;
        const px = x * cellSize + (cellSize / 2);
        const py = y * cellSize + (cellSize / 2);

        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 4; // Explosive
            spawnParticle(
                px,
                py,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Math.random() * 3 + 2,
                0.04 + Math.random() * 0.02
            );
        }
    },
    spawnRing: (x: number, y: number, color: string): void => {
        if (!canvasRef.current) return;
        const px = x * cellSize + (cellSize / 2);
        const py = y * cellSize + (cellSize / 2);
        const amount = 24;

        for (let i = 0; i < amount; i++) {
            const angle = (i / amount) * Math.PI * 2;
            const speed = 8; // Fast expansion
            spawnParticle(
                px,
                py,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Math.random() * 2 + 2,
                0.03 // Uniform decay for ring effect
            );
        }
    },
    spawnShockwave: (x: number, y: number, color: string = 'white'): void => {
        if (!canvasRef.current) return;
        const px = x * cellSize + (cellSize / 2);
        const py = y * cellSize + (cellSize / 2);
        const amount = 60;

        for (let i = 0; i < amount; i++) {
            const angle = (i / amount) * Math.PI * 2;
            const speed = 15 + Math.random() * 5; // Very fast expansion
            spawnParticle(
                px,
                py,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Math.random() * 3 + 2,
                0.05 // Fast decay
            );
        }
    },
    spawnTSpin: (x: number, y: number, color: string = '#d946ef'): void => {
        if (!canvasRef.current) return;
        const px = x * cellSize + (cellSize / 2);
        const py = y * cellSize + (cellSize / 2);
        
        // Ring Effect
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const speed = 6; 
            spawnParticle(px, py, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3, 0.04);
        }
        // Cardinal Cross Burst (White Accents)
        for (let i = 0; i < 4; i++) {
             const angle = i * (Math.PI / 2);
             // Fast streams in cardinal directions
             for(let j=0; j<5; j++) {
                 spawnParticle(px, py, Math.cos(angle) * (8+j), Math.sin(angle) * (8+j), '#ffffff', 2, 0.05);
             }
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

    // If paused, stop loop but do NOT clear canvas, effectively freezing the last frame.
    if (paused) {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        return () => resizeObserver.disconnect();
    }

    const render = () => {
      if (!ctx || !canvas) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Intense additive blending for neon look
      ctx.globalCompositeOperation = 'lighter';

      const pool = particlesRef.current;
      
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = pool[i];
        if (!p.active) continue;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.vx *= 0.92; // High Air Resistance (Sparks stop fast)
        p.vy *= 0.92;
        p.life -= p.decay;
        p.size *= 0.95;

        if (p.life <= 0 || p.size <= 0.1) {
            p.active = false;
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            
            if (p.x > -50 && p.x < canvas.width + 50 && p.y > -50 && p.y < canvas.height + 50) {
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
  }, [cellSize, paused]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20 w-full h-full" />;
});

export default Particles;