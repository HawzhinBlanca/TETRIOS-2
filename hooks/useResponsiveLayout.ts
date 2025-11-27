
import { useState, useEffect } from 'react';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';

export interface LayoutMetrics {
    cellSize: number;
    cols: number;
    rows: number;
    width: number;
    height: number;
    isMobile: boolean;
}

export const useResponsiveLayout = () => {
    const [layout, setLayout] = useState<LayoutMetrics>({
        cellSize: 24,
        cols: STAGE_WIDTH,
        rows: STAGE_HEIGHT,
        width: 300,
        height: 600,
        isMobile: false
    });

    useEffect(() => {
        const handleResize = () => {
            const vw = Math.max(1, window.innerWidth); // Guard against 0
            const vh = Math.max(1, window.innerHeight); // Guard against 0
            const isMobile = vw < 1024;

            if (!isMobile) { 
                // Desktop Layout (Standard Fixed)
                const DESKTOP_VERTICAL_PADDING = 60; 
                const DESKTOP_HORIZONTAL_RESERVE = 400; 
                
                const availableHeight = vh - DESKTOP_VERTICAL_PADDING;
                const availableWidth = vw - DESKTOP_HORIZONTAL_RESERVE;
                
                const sizeByHeight = Math.floor(Math.max(0, availableHeight) / STAGE_HEIGHT);
                const sizeByWidth = Math.floor(Math.max(0, availableWidth) / STAGE_WIDTH);
                
                const cell = Math.floor(Math.min(sizeByHeight, sizeByWidth, 32)); // Cap size for desktop and floor it

                setLayout({
                    cellSize: cell,
                    cols: STAGE_WIDTH,
                    rows: STAGE_HEIGHT,
                    width: STAGE_WIDTH * cell,
                    height: STAGE_HEIGHT * cell,
                    isMobile: false
                });
            } else { 
                // Mobile "Full Screen" Logic
                // 1. Determine Density: How many columns fit?
                const TARGET_CELL_SIZE = 22; // Small blocks for "High Res" feel
                
                // Calculate columns to fill width exactly
                let cols = Math.floor(vw / TARGET_CELL_SIZE);
                // Ensure even number of columns for symmetry if possible, and min width
                cols = Math.max(10, cols);
                
                // Recalculate exact cell size to fill width (floored to integer to prevent sub-pixel blur)
                const cell = Math.floor(vw / cols);
                
                // Calculate rows to fill available height
                const rows = Math.ceil(vh / cell);

                setLayout({
                    cellSize: cell,
                    cols: cols,
                    rows: rows,
                    width: cols * cell, // Use precise integer width
                    height: rows * cell, 
                    isMobile: true
                });
            }
        };
        
        const resizeObserver = new ResizeObserver(() => requestAnimationFrame(handleResize));
        resizeObserver.observe(document.body);
        
        handleResize(); 
        
        return () => resizeObserver.disconnect();
    }, []);

    return layout;
};
