
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
  
  // Subscribe to danger level for dynamic border coloring
  const dangerLevel = useEngineStore(state => state.dangerLevel);
  const isZoneActive = useEngineStore(state => state.zoneActive);

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
    if (internalRendererRef.current && containerRef.current && engine.current) {
        const { cellSize } = renderConfig; 
        // Use engine dynamic grid dimensions, NOT constants
        const logicWidth = engine.current.grid.width * cellSize;
        const logicHeight = engine.current.grid.height * cellSize;
        const dpr = window.devicePixelRatio || 1;
        
        internalRendererRef.current.setSize(logicWidth, logicHeight, dpr);
        
        // We set the container size explicitly to match the logical size
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

  // Dynamic Styles based on game state
  const borderColor = isZoneActive 
    ? 'rgba(255, 255, 255, 0.8)' 
    : dangerLevel > 0.7 
        ? `rgba(255, ${Math.floor((1-dangerLevel)*255)}, 0, 0.8)` 
        : 'rgba(6, 182, 212, 0.5)';

  const glowColor = isZoneActive
    ? 'rgba(255, 255, 255, 0.3)'
    : dangerLevel > 0.7
        ? 'rgba(255, 0, 0, 0.4)'
        : 'rgba(6, 182, 212, 0.15)';

  return (
    <div className={`relative p-1 rounded-sm transition-all duration-500 ${className}`}>
        
        {/* Outer Holographic Bezel */}
        <div 
            className="absolute -inset-2 rounded-lg border border-white/10 opacity-60 pointer-events-none transition-all duration-300"
            style={{ 
                background: `linear-gradient(180deg, ${borderColor} 0%, transparent 20%, transparent 80%, ${borderColor} 100%)`,
                boxShadow: `0 0 40px ${glowColor}, inset 0 0 20px ${glowColor}`
            }}
        />

        {/* Technical Markings - Corners */}
        <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-md pointer-events-none" />
        <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-md pointer-events-none" />
        <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-md pointer-events-none" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-500/50 rounded-br-md pointer-events-none" />

        {/* Main Canvas Container (The "Glass") */}
        <div 
            ref={containerRef}
            className="relative overflow-hidden bg-black/80 rounded-[2px] shadow-2xl"
            style={{ 
                boxSizing: 'content-box',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)' // Inner Vignette
            }}
        >
            {/* The Game Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full touch-none z-10" />

            {/* Layer: Scanlines (CRT Effect) */}
            <div 
                className="absolute inset-0 z-20 pointer-events-none opacity-10 mix-blend-overlay" 
                style={{
                    background: 'linear-gradient(rgba(18, 16, 20, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                    backgroundSize: '100% 2px, 6px 100%'
                }}
            />

            {/* Layer: Screen Reflection/Glare */}
            <div 
                className="absolute inset-0 z-30 pointer-events-none"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.01) 100%)'
                }}
            />
            
            {/* Layer: Bottom Fog/Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none"></div>
        </div>
        
        {/* System Status Text */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[8px] font-mono text-cyan-500/40 uppercase tracking-widest px-2">
            <span>SYS.ROUTINE.RUN</span>
            <span>ID: {(Math.random() * 10000).toFixed(0).padStart(4, '0')}</span>
        </div>
    </div>
  );
};

export default BoardCanvas;
