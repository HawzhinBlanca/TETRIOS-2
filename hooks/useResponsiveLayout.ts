
import { useState, useEffect } from 'react';
import { useGameSettingsStore } from '../stores/gameSettingsStore';

export interface LayoutMetrics {
    cellSize: number;
    cols: number;
    rows: number;
    width: number;
    height: number;
    isMobile: boolean;
}

export const useResponsiveLayout = () => {
    const gridDensity = useGameSettingsStore(state => state.gridDensity);
    
    const TARGET_COLS = gridDensity === 'DENSE' ? 20 : 10;
    // Target 21 rows visible to ensure standard 20 + 1 buffer line is comfortable
    const TARGET_ROWS = gridDensity === 'DENSE' ? 50 : 21; 

    const [layout, setLayout] = useState<LayoutMetrics>({
        cellSize: 30,
        cols: TARGET_COLS,
        rows: TARGET_ROWS,
        width: 300,
        height: 690,
        isMobile: true
    });

    useEffect(() => {
        const handleResize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const isMobile = vw < 1024;

            let cell = 0;

            if (isMobile && gridDensity === 'COMFORT') {
                // INFINITY LAYOUT STRATEGY (Refined):
                
                // 1. Width Priority: Fill screen width minus slight padding
                const safeWidth = vw - 8;
                const widthBasedCell = Math.floor(safeWidth / TARGET_COLS);
                
                // 2. Height Priority: 
                // Reserve top space for Score HUD (approx 80px visual clearance)
                // Reserve bottom space for Controls (approx 120px)
                // The actual GameScreen uses overlays, but we need to ensure the grid itself
                // fits within a reasonable area so the "spawn" row isn't covered by the score.
                
                const HEADER_CLEARANCE = 90; 
                const FOOTER_CLEARANCE = 100;
                const safeHeight = vh - HEADER_CLEARANCE - FOOTER_CLEARANCE;
                
                const heightBasedCell = Math.floor(safeHeight / TARGET_ROWS);
                
                // 3. Balance: Use the smaller cell size to ensure it fits, 
                // but favor width if the height restriction isn't critical (overlay mode)
                // We'll lean towards filling width unless height is very constrained.
                
                cell = Math.min(widthBasedCell, heightBasedCell);
                
                // Clamp minimum size for playability
                cell = Math.max(cell, 24); 
            } else {
                // Desktop Logic
                const maxDesktopWidth = 800; 
                const availableWidth = Math.min(vw, maxDesktopWidth);
                cell = Math.floor(availableWidth / TARGET_COLS);
                
                const maxCellHeight = Math.floor((vh - 80) / TARGET_ROWS);
                cell = Math.min(cell, maxCellHeight);
            }
            
            setLayout({
                cellSize: cell,
                cols: TARGET_COLS,
                rows: TARGET_ROWS,
                width: TARGET_COLS * cell,
                height: TARGET_ROWS * cell,
                isMobile
            });
        };
        
        const resizeObserver = new ResizeObserver(() => requestAnimationFrame(handleResize));
        resizeObserver.observe(document.body);
        
        handleResize(); 
        
        return () => resizeObserver.disconnect();
    }, [gridDensity]);

    return layout;
};
    