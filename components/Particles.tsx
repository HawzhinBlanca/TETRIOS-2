import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

interface Particle {
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
 * Renders a particle effects system on a canvas.
 * Provides imperative handle methods to trigger different types of particle spawns.
 */
const Particles = forwardRef<ParticlesHandle, Props>(({ cellSize }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    /**
     * Spawns a fountain-like particle effect (e.g., for hard drops).
     * @param {number} x X-coordinate in game cells.
     * @param {number} y Y-coordinate in game cells.
     * @param {string} color CSS color string for particles.
     * @param {number} [amount=10] Number of particles to spawn.
     * @returns {void}
     */
    spawn: (x: number, y: number, color: string, amount: number = 10): void => {
      if (!canvasRef.current) return;
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
          size: Math.random() * (cellSize / 5) + 2,
          decay: 0.02
        });
      }
    },
    /**
     * Spawns an explosion effect along a row (e.g., for line clears).
     * @param {number} y Y-coordinate in game cells for the explosion center.
     * @param {string} [color='white'] CSS color string for particles.
     * @returns {void}
     */
    spawnExplosion: (y: number, color: string = 'white'): void => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.width;
        const py = y * cellSize + (cellSize / 2);
        
        for (let i = 0; i < 40; i++) {
             particles.current.push({
                x: w / 2, 
                y: py,
                vx: (Math.random() - 0.5) * 40, // Wide horizontal spread
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: color,
                size: Math.random() * (cellSize / 4) + 3,
                decay: 0.015
             });
        }
    },
    /**
     * Spawns a radial burst effect (e.g., for T-Spins or big events).
     * @param {number} x X-coordinate in game cells.
     * @param {number} y Y-coordinate in game cells.
     * @param {string} color CSS color string for particles.
     * @param {number} [amount=30] Number of particles to spawn.
     * @returns {void}
     */
    spawnBurst: (x: number, y: number, color: string, amount: number = 30): void => {
        if (!canvasRef.current) return;
        const px = x * cellSize + (cellSize / 2);
        const py = y * cellSize + (cellSize / 2);

        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 15 + 5;
            particles.current.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: Math.random() * (cellSize / 3) + 3,
                decay: 0.03 // Fast fade
            });
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
      if (!ctx || !canvas) { // Ensure context and canvas are available
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // Gravity
        p.life -= p.decay;
        p.size *= 0.96;

        if (p.life <= 0 || p.size <= 0) { // Also remove if size becomes too small
            particles.current.splice(index, 1);
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            // Add glow
            ctx.shadowBlur = p.size * 2;
            ctx.shadowColor = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.shadowBlur = 0; // Reset shadow blur
        }
      });
      
      ctx.globalAlpha = 1; // Reset global alpha
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