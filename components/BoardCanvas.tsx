
import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { GameCore } from '../utils/GameCore';
import { BoardRenderer, RenderConfig } from '../utils/BoardRenderer';
import { useEngineStore } from '../stores/engineStore';

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
  
  const dangerLevel = useEngineStore(state => state.dangerLevel);
  const isZoneActive = useEngineStore(state => state.zoneActive);
  
  const [boardDescription, setBoardDescription] = useState("Game board empty.");

  useEffect(() => {
      if (dangerLevel > 0.8) setBoardDescription("Danger! Board nearly full.");
      else if (dangerLevel > 0.5) setBoardDescription("Caution. Board filling up.");
      else setBoardDescription("Board status nominal.");
  }, [dangerLevel]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
  }, []);

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
    if (internalRendererRef.current && containerRef.current && engine.current) {
        const { cellSize } = renderConfig; 
        const logicWidth = engine.current.grid.width * cellSize;
        const logicHeight = engine.current.grid.height * cellSize;
        const dpr = window.devicePixelRatio || 1;
        
        internalRendererRef.current.setSize(logicWidth, logicHeight, dpr);
        
        containerRef.current.style.width = `${logicWidth}px`;
        containerRef.current.style.height = `${logicHeight}px`;
    }
  }, [renderConfig.cellSize, engine.current?.grid.width, engine.current?.grid.height]); 

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

  // Visual Styling Constants
  const borderColor = isZoneActive 
    ? 'rgba(255, 255, 255, 0.5)' 
    : dangerLevel > 0.7 
        ? `rgba(255, ${Math.floor((1-dangerLevel)*255)}, 0, 0.6)` 
        : 'rgba(255, 255, 255, 0.1)';

  return (
    <div className={`relative ${className}`}>
        <div className="sr-only" role="status" aria-live="polite">
            {boardDescription}
        </div>
        
        {/* Minimalist Border Container */}
        <div 
            ref={containerRef}
            className="relative overflow-hidden bg-black/40 backdrop-blur-sm"
            style={{ 
                boxSizing: 'content-box',
                borderLeft: `1px solid ${borderColor}`,
                borderRight: `1px solid ${borderColor}`,
                borderBottom: `1px solid ${borderColor}`,
                borderTop: 'none', // Open top for spawning effect
                boxShadow: isZoneActive ? '0 0 30px rgba(255,255,255,0.2)' : 'none'
            }}
        >
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full touch-none z-10" aria-label="Game Board" />

            {/* Subtle Vignette */}
            <div 
                className="absolute inset-0 z-20 pointer-events-none" 
                style={{ background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.4) 100%)' }}
            />
        </div>
    </div>
  );
};

export default BoardCanvas;
