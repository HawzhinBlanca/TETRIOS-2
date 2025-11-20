
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

    const render = () => {
      // Auto-resize to screen
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cy = h * 0.85; // Position line near bottom
      
      ctx.clearRect(0, 0, w, h);

      const data = audioManager.getFrequencyData();
      if (!data) {
         // If audio not initialized yet, skip drawing but keep loop
         animationId = requestAnimationFrame(render);
         return;
      }

      const bufferLength = data.length;
      // We only care about the lower half of frequencies mostly for visuals
      const usefulLength = Math.floor(bufferLength * 0.7);
      const sliceWidth = (w / 2) / usefulLength;

      // --- Left Channel (Mirrored) ---
      ctx.beginPath();
      ctx.moveTo(w / 2, cy);
      
      // Draw bass-heavy center out to high-freq edges
      for (let i = 0; i < usefulLength; i++) {
        const v = data[i] / 255.0; // 0 to 1
        const y = v * (h * 0.25); // Max height 25% of screen

        const x = (w / 2) - (i * sliceWidth);
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
        const v = data[i] / 255.0;
        const y = v * (h * 0.25);
        const x = (w / 2) + (i * sliceWidth);
        ctx.lineTo(x, cy - y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(w / 2, h);
      
      // Fill Gradient
      const gradient = ctx.createLinearGradient(0, cy - h * 0.2, 0, h);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)'); // Cyan Top
      gradient.addColorStop(0.5, 'rgba(217, 70, 239, 0.4)'); // Purple Mid
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
        className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-60" 
    />
  );
};

export default MusicVisualizer;
