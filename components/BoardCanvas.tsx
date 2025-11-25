
import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { GameCore } from '../utils/GameCore';
import { BoardRenderer, RenderConfig } from '../utils/BoardRenderer';

interface Props {
  engine: React.MutableRefObject<GameCore>;
  renderConfig: Omit<RenderConfig, 'bombSelectionRows' | 'lineClearerSelectedRow'>; // Core config
  bombSelectionRows?: number[]; // Dynamic prop for bomb selection
  lineClearerSelectedRow?: number | null; // Dynamic prop for line clearer selection
  className?: string;
  rendererRef?: React.MutableRefObject<BoardRenderer | null>; // Optional prop to capture renderer instance
}

const BoardCanvas: React.FC<Props> = ({ 
  engine,
  renderConfig, 
  bombSelectionRows, // Destructure new dynamic props
  lineClearerSelectedRow, // Destructure new dynamic props
  className = '',
  rendererRef: externalRendererRef
}) => {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  const internalRendererRef = useRef<BoardRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const staticCanvas = staticCanvasRef.current;
    const dynamicCanvas = dynamicCanvasRef.current;
    if (!staticCanvas || !dynamicCanvas) return;

    const staticCtx = staticCanvas.getContext('2d', { alpha: true }); 
    const dynamicCtx = dynamicCanvas.getContext('2d', { alpha: true });
    
    if (!staticCtx || !dynamicCtx) return;

    // Initialize renderer with both contexts
    const renderer = new BoardRenderer(staticCtx, dynamicCtx, { 
      ...renderConfig, 
      bombSelectionRows: undefined, 
      lineClearerSelectedRow: undefined 
    });
    internalRendererRef.current = renderer;
    
    // Expose to parent if ref provided
    if (externalRendererRef) {
        externalRendererRef.current = renderer;
    }
  }, []); 

  useEffect(() => {
    if (internalRendererRef.current) {
      // Pass the complete config object to the renderer
      internalRendererRef.current.updateConfig({ 
        ...renderConfig, 
        bombSelectionRows, 
        lineClearerSelectedRow 
      });
    }
  }, [renderConfig, bombSelectionRows, lineClearerSelectedRow]); // Re-evaluate when dynamic props change

  useLayoutEffect(() => {
    if (internalRendererRef.current && containerRef.current) {
        const { cellSize } = renderConfig; 
        const logicWidth = STAGE_WIDTH * cellSize;
        const logicHeight = STAGE_HEIGHT * cellSize;
        const dpr = window.devicePixelRatio || 1;
        
        internalRendererRef.current.setSize(logicWidth, logicHeight, dpr);
        
        // Set explicit style dimensions to prevent flexbox squishing
        containerRef.current.style.width = `${logicWidth}px`;
        containerRef.current.style.height = `${logicHeight}px`;
        containerRef.current.style.minWidth = `${logicWidth}px`;
        containerRef.current.style.minHeight = `${logicHeight}px`;
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
      style={{ boxSizing: 'content-box' }} // Critical: Borders add to outside width
    >
       {/* Static Layer (Bottom) */}
       <canvas ref={staticCanvasRef} className="absolute inset-0 rounded-[1px] z-0" style={{ display: 'block', width: '100%', height: '100%' }} />
       {/* Dynamic Layer (Top) */}
       <canvas ref={dynamicCanvasRef} className="absolute inset-0 rounded-[1px] z-10" style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

export default BoardCanvas;
