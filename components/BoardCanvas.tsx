import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { MoveScore } from '../types';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { GameCore } from '../utils/GameCore';
import { BoardRenderer, RenderConfig } from '../utils/BoardRenderer';

interface Props {
  engine: React.MutableRefObject<GameCore>;
  aiHint: MoveScore | null;
  showAi: boolean;
  cellSize?: number; 
  ghostStyle?: 'neon' | 'dashed' | 'solid';
  ghostOpacity?: number;
  ghostOutlineThickness?: number;
  ghostGlowIntensity?: number;
  ghostShadow?: string;
  lockWarningEnabled?: boolean;
  className?: string;
}

const BoardCanvas: React.FC<Props> = ({ 
  engine,
  aiHint, 
  showAi, 
  cellSize = 30, 
  ghostStyle = 'neon',
  ghostOpacity = 0.6,
  ghostOutlineThickness = 2,
  ghostGlowIntensity = 1.0,
  ghostShadow,
  lockWarningEnabled = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Renderer
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // We use alpha: true to allow for transparent backgrounds if needed
    const ctx = canvas.getContext('2d', { alpha: true }); 
    if (!ctx) return;
    
    rendererRef.current = new BoardRenderer(ctx);
  }, []);

  // Handle Resizing - Layout Effect prevents visual stutter
  useLayoutEffect(() => {
    if (rendererRef.current && canvasRef.current && containerRef.current) {
        const logicWidth = STAGE_WIDTH * cellSize;
        const logicHeight = STAGE_HEIGHT * cellSize;
        const dpr = window.devicePixelRatio || 1;
        
        // Update internal renderer size
        rendererRef.current.setSize(logicWidth, logicHeight, dpr);
        
        // Explicitly set container size to match logical size for tight border fit
        containerRef.current.style.width = `${logicWidth}px`;
        containerRef.current.style.height = `${logicHeight}px`;
    }
  }, [cellSize]);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (engine.current && rendererRef.current) {
        const config: RenderConfig = {
            cellSize,
            ghostStyle: ghostStyle || 'neon',
            ghostOpacity: ghostOpacity || 0.6,
            ghostOutlineThickness: ghostOutlineThickness ?? 2,
            ghostGlowIntensity: ghostGlowIntensity || 1.0,
            ghostShadow,
            lockWarningEnabled: lockWarningEnabled || false,
            showAi,
            aiHint
        };

        rendererRef.current.render(engine.current, config);
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    cellSize, ghostStyle, ghostOpacity, ghostOutlineThickness, 
    ghostGlowIntensity, ghostShadow, lockWarningEnabled, showAi, aiHint
  ]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex justify-center items-center bg-gray-900 rounded-[4px] border-4 border-gray-800 shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)] transition-all duration-300 ease-out ${className}`}
      style={{ boxSizing: 'content-box' }} // Ensures border adds to width, not subtracts
    >
       <canvas ref={canvasRef} className="block rounded-[1px]" style={{ display: 'block' }} />
    </div>
  );
};

export default BoardCanvas;