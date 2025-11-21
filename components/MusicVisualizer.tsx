
import React, { useEffect, useRef } from 'react';
import { audioManager } from '../utils/audioManager';

const MusicVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = (): void => {
      // Auto-resize to screen
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const w: number = canvas.width;
      const h: number = canvas.height;
      const cy: number = h * 0.85; // Position line near bottom
      
      ctx.clearRect(0, 0, w, h);

      const data = audioManager.getFrequencyData();
      if (!data) {
         // If audio not initialized yet, skip drawing but keep loop
         animationId = requestAnimationFrame(render);
         return;
      }

      const bufferLength: number = data.length;
      // We only care about the lower half of frequencies mostly for visuals
      const usefulLength: number = Math.floor(bufferLength * 0.7);
      const sliceWidth: number = (w / 2) / usefulLength;

      // --- Left Channel (Mirrored) ---
      ctx.beginPath();
      ctx.moveTo(w / 2, cy);
      
      // Draw bass-heavy center out to high-freq edges
      for (let i = 0; i < usefulLength; i++) {
        const v: number = data[i] / 255.0; // 0 to 1
        const y: number = v * (h * 0.25); // Max height 25% of screen

        const x: number = (w / 2) - (i * sliceWidth);
        // Use a curve for smoothness
        // Just using lineTo with high resolution is usually fine for FFT
        ctx.lineTo(x, cy - y);
      }
      // Close shape down to bottom
      ctx.lineTo(0, h);
      ctx.lineTo(w / 2, h);
      
      // --- Right Channel (Mirrored) ---
      ctx.moveTo(w / 2, cy);
      for (let i = 0; i < usefulLength; i++) {
        const v: number = data[i] / 255.0;
        const y: number = v * (h * 0.25);
        const x: number = (w / 2) + (i * sliceWidth);
        ctx.lineTo(x, cy - y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(w / 2, h);
      
      // Fill Gradient
      // Enhance visualizer with dynamic colors and increased responsiveness to sound
      const gradient = ctx.createLinearGradient(0, cy - h * 0.2, 0, h);
      const hue1 = (Date.now() / 100) % 360; // Dynamic hue for first color
      const hue2 = (Date.now() / 150 + 120) % 360; // Dynamic hue for second color, offset
      gradient.addColorStop(0, `hsla(${hue1}, 80%, 70%, 0.8)`); // Vibrant Top
      gradient.addColorStop(0.5, `hsla(${hue2}, 70%, 60%, 0.4)`); // Vibrant Mid
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent Bottom

      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Glow Line
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'cyan';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-80" // Increased opacity for stronger effect
    />
  );
};

export default MusicVisualizer;