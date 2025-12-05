
import React, { useEffect, useRef } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { VISUAL_THEME } from '../utils/visualTheme';

const DynamicBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { stats, dangerLevel } = useGameContext();
    
    // Refs for animation state to avoid re-renders
    const timeRef = useRef(0);
    const colorsRef = useRef<string[]>(['#0f172a', '#1e293b', '#0f172a']); // Default dark
    
    useEffect(() => {
        // Determine active theme based on level
        let activeTheme = VISUAL_THEME.THEMES[0];
        for (let i = VISUAL_THEME.THEMES.length - 1; i >= 0; i--) {
            if (stats.level >= VISUAL_THEME.THEMES[i].threshold) {
                activeTheme = VISUAL_THEME.THEMES[i];
                break;
            }
        }
        
        // Extract hex colors from theme background string (simple parsing)
        // Fallback to a nice palette if parsing fails
        const themeColors = activeTheme.background.match(/#[0-9a-fA-F]{6}/g) || ['#0f172a', '#334155', '#1e293b'];
        colorsRef.current = themeColors;
    }, [stats.level]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            const w = canvas.width;
            const h = canvas.height;
            timeRef.current += 0.005 + (dangerLevel * 0.01); // Speed up with danger

            // Clear
            ctx.fillStyle = colorsRef.current[0];
            ctx.fillRect(0, 0, w, h);

            // Draw Blobs
            // Blob 1
            const x1 = w * 0.5 + Math.sin(timeRef.current) * w * 0.3;
            const y1 = h * 0.4 + Math.cos(timeRef.current * 0.8) * h * 0.2;
            const r1 = Math.min(w, h) * 0.6;
            
            const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
            g1.addColorStop(0, hexToRgba(colorsRef.current[1] || '#4c1d95', 0.4));
            g1.addColorStop(1, 'transparent');
            
            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.arc(x1, y1, r1, 0, Math.PI * 2);
            ctx.fill();

            // Blob 2
            const x2 = w * 0.5 + Math.cos(timeRef.current * 1.2) * w * 0.3;
            const y2 = h * 0.6 + Math.sin(timeRef.current * 0.5) * h * 0.2;
            const r2 = Math.min(w, h) * 0.5;

            const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
            g2.addColorStop(0, hexToRgba(colorsRef.current[2] || '#0e7490', 0.3));
            g2.addColorStop(1, 'transparent');

            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.arc(x2, y2, r2, 0, Math.PI * 2);
            ctx.fill();

            // Noise Overlay (Optional - keep lightweight)
            
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [dangerLevel]);

    return (
        <canvas 
            ref={canvasRef} 
            className="fixed inset-0 w-full h-full pointer-events-none -z-10 transition-colors duration-1000 ease-in-out"
        />
    );
};

// Helper
function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default DynamicBackground;
