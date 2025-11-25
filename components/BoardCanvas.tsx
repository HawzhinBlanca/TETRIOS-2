
import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { GameCore } from '../utils/GameCore';
import { BoardRenderer, RenderConfig } from '../utils/BoardRenderer';

interface Props {
  engine: React.MutableRefObject<GameCore>;
  renderConfig: Omit<RenderConfig, 'bombSelectionRows' | 'lineClearerSelectedRow'>;
  bombSelectionRows?: number[];
  lineClearerSelectedRow?: number | null;
  className?: string;
  rendererRef?: React.MutableRefObject<BoardRenderer | null>;
}

const BoardCanvas: React.FC<Props> = ({ 
  engine,
  renderConfig, 
  bombSelectionRows,
  lineClearerSelectedRow,
  className = '',
  rendererRef: externalRendererRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalRendererRef = useRef<BoardRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize PixiJS renderer
    const renderer = new BoardRenderer(canvas, { 
      ...renderConfig, 
      bombSelectionRows: undefined, 
      lineClearerSelectedRow: undefined 
    });
    internalRendererRef.current = renderer;
    
    if (externalRendererRef) {
        externalRendererRef.current = renderer;
    }
    
    return () => {
        renderer.destroy();
        if (externalRendererRef) externalRendererRef.current = null;
    };
  }, []); // Init once

  useEffect(() => {
    if (internalRendererRef.current) {
      internalRendererRef.current.updateConfig({ 
        ...renderConfig, 
        bombSelectionRows, 
        lineClearerSelectedRow 
      });
    }
  }, [renderConfig, bombSelectionRows, lineClearerSelectedRow]);

  useLayoutEffect(() => {
    if (internalRendererRef.current && containerRef.current) {
        const { cellSize } = renderConfig; 
        const logicWidth = STAGE_WIDTH * cellSize;
        const logicHeight = STAGE_HEIGHT * cellSize;
        const dpr = window.devicePixelRatio || 1;
        
        internalRendererRef.current.setSize(logicWidth, logicHeight, dpr);
        
        containerRef.current.style.width = `${logicWidth}px`;
        containerRef.current.style.height = `${logicHeight}px`;
    }
  }, [renderConfig.cellSize]); 

  useEffect(() => {
    let animationFrameId: number;
    const loop = (): void => {
      if (engine.current && internalRendererRef.current) {
        internalRendererRef.current.render(engine.current);
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
       <canvas ref={canvasRef} className="absolute inset-0 rounded-[1px]" style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

export default BoardCanvas;
