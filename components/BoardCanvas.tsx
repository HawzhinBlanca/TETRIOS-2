
import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { GameCore } from '../utils/GameCore';
import { BoardRenderer } from '../utils/BoardRenderer';
import { BoardRenderConfig } from '../types';

interface Props {
  engine: React.MutableRefObject<GameCore>;
  renderConfig: Omit<BoardRenderConfig, 'bombSelectionRows' | 'lineClearerSelectedRow'>; // Core config
  bombSelectionRows?: number[]; // Dynamic prop for bomb selection
  lineClearerSelectedRow?: number | null; // Dynamic prop for line clearer selection
  className?: string;
}

const BoardCanvas: React.FC<Props> = ({ 
  engine,
  renderConfig, 
  bombSelectionRows, // Destructure new dynamic props
  lineClearerSelectedRow, // Destructure new dynamic props
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); 
    if (!ctx) return;
    // Initialize renderer with full config, including dynamic parts defaulting to undefined
    rendererRef.current = new BoardRenderer(ctx, { 
      ...renderConfig, 
      bombSelectionRows: undefined, 
      lineClearerSelectedRow: undefined 
    });
  }, []); 

  useEffect(() => {
    if (rendererRef.current) {
      // Pass the complete config object to the renderer
      rendererRef.current.updateConfig({ 
        ...renderConfig, 
        bombSelectionRows, 
        lineClearerSelectedRow 
      });
    }
  }, [renderConfig, bombSelectionRows, lineClearerSelectedRow]); // Re-evaluate when dynamic props change

  useLayoutEffect(() => {
    if (rendererRef.current && canvasRef.current && containerRef.current) {
        const { cellSize } = renderConfig; 
        const logicWidth = STAGE_WIDTH * cellSize;
        const logicHeight = STAGE_HEIGHT * cellSize;
        const dpr = window.devicePixelRatio || 1;
        rendererRef.current.setSize(logicWidth, logicHeight, dpr);
        containerRef.current.style.width = `${logicWidth}px`;
        containerRef.current.style.height = `${logicHeight}px`;
    }
  }, [renderConfig.cellSize]); 

  useEffect(() => {
    let animationFrameId: number;
    const loop = (): void => {
      if (engine.current && rendererRef.current) {
        rendererRef.current.render(engine.current);
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [engine]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex justify-center items-center bg-gray-900 rounded-[4px] border-4 border-gray-800 shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)] transition-all duration-300 ease-out ${className}`}
      style={{ boxSizing: 'content-box' }}
    >
       <canvas ref={canvasRef} className="block rounded-[1px]" style={{ display: 'block' }} />
    </div>
  );
};

export default BoardCanvas;
