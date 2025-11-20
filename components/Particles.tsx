
import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { COLORS } from '../constants';
import { TetrominoType } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface ParticlesHandle {
  spawn: (x: number, y: number, color: string, amount?: number) => void;
  spawnExplosion: (y: number, color?: string) => void;
}

const Particles = forwardRef<ParticlesHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    spawn: (x: number, y: number, color: string, amount = 10) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      // Convert grid coordinates to canvas coordinates
      // Assuming grid logic is handled in parent, but here inputs are pixel relative usually?
      // Let's assume inputs are already PIXEL coordinates relative to canvas
      
      for (let i = 0; i < amount; i++) {
        particles.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 5, // Upward bias
          life: 1.0,
          color,
          size: Math.random() * 4 + 2
        });
      }
    },
    spawnExplosion: (y: number, color = 'white') => {
        // Line clear effect (horizontal burst)
        if (!canvasRef.current) return;
        const w = canvasRef.current.width;
        // y is row index, approx 35px per cell
        const py = y * (canvasRef.current.height / 20); 
        
        for (let i = 0; i < 40; i++) {
             particles.current.push({
                x: w / 2,
                y: py,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color,
                size: Math.random() * 5 + 3
             });
        }
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler logic should be handled by CSS/Parent usually, 
    // but let's ensure internal resolution matches
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const render = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // Gravity
        p.life -= 0.02;
        p.size *= 0.95;

        if (p.life <= 0) {
            particles.current.splice(index, 1);
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      });
      
      ctx.globalAlpha = 1;
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20 w-full h-full" />;
});

export default Particles;
