
import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

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

interface Props {
    cellSize: number;
}

const Particles = forwardRef<ParticlesHandle, Props>(({ cellSize }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    spawn: (x: number, y: number, color: string, amount = 10) => {
      if (!canvasRef.current) return;
      // Inputs x, y are Grid Coordinates. Convert to Pixels.
      // We assume the canvas is sized to the board content (logicWidth/Height)
      const px = x * cellSize + (cellSize / 2);
      const py = y * cellSize + (cellSize / 2);
      
      for (let i = 0; i < amount; i++) {
        particles.current.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 5, // Upward bias
          life: 1.0,
          color,
          size: Math.random() * (cellSize / 5) + 2
        });
      }
    },
    spawnExplosion: (y: number, color = 'white') => {
        if (!canvasRef.current) return;
        const w = canvasRef.current.width;
        // y is row index.
        const py = y * cellSize + (cellSize / 2);
        
        for (let i = 0; i < 40; i++) {
             particles.current.push({
                x: w / 2, // Start center
                y: py,
                vx: (Math.random() - 0.5) * 30, // Explode out
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color,
                size: Math.random() * (cellSize / 4) + 2
             });
        }
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler should be managed by parent resizing the container, 
    // but we need to sync canvas resolution to display size for sharpness.
    // In this specific layout, the parent container is strictly sized by BoardCanvas.
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
        }
    });
    
    resizeObserver.observe(canvas);

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
            ctx.shadowBlur = p.size * 2;
            ctx.shadowColor = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.shadowBlur = 0;
        }
      });
      
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
