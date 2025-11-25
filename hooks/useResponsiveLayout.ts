
import { useState, useEffect } from 'react';

export const useResponsiveLayout = () => {
    const [cellSize, setCellSize] = useState(30);

    useEffect(() => {
        const handleResize = () => {
            // Use documentElement.clientHeight for more accurate viewport height on mobile (excludes some browser UI)
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            
            // Apple-Grade Mobile Layout Optimization
            // Minimal padding to allow "Fill Screen" feel.
            // We allow the board to take up almost the entire height.
            // Top Bar (50px) + Bottom Safe Area/Controls overlap
            const MOBILE_VERTICAL_PADDING = 90; 
            const MOBILE_HORIZONTAL_PADDING = 0; // Full width allowed

            // Desktop: Needs space for header/margins and sidebars
            const DESKTOP_VERTICAL_PADDING = 140;
            const DESKTOP_HORIZONTAL_RESERVE = 650; 

            let maxVerticalSize;
            let maxHorizontalSize;

            if (vw >= 1024) { 
                // Desktop Layout
                const availableHeight = vh - DESKTOP_VERTICAL_PADDING;
                const availableWidth = vw - DESKTOP_HORIZONTAL_RESERVE;
                
                maxVerticalSize = Math.floor(Math.max(0, availableHeight) / 20);
                maxHorizontalSize = Math.floor(Math.max(0, availableWidth) / 10);
            } else { 
                // Mobile Layout
                const availableHeight = vh - MOBILE_VERTICAL_PADDING;
                const availableWidth = vw - MOBILE_HORIZONTAL_PADDING;
                
                maxVerticalSize = Math.floor(Math.max(0, availableHeight) / 20);
                maxHorizontalSize = Math.floor(Math.max(0, availableWidth) / 10);
            }
            
            // Choose the limiting dimension to ensure the board fits completely
            const idealSize = Math.min(maxVerticalSize, maxHorizontalSize);
            
            // Clamp size:
            setCellSize(Math.max(16, Math.min(55, idealSize)));
        };
        
        const resizeObserver = new ResizeObserver(() => requestAnimationFrame(handleResize));
        resizeObserver.observe(document.body);
        
        // Initial calculation
        handleResize(); 
        
        return () => resizeObserver.disconnect();
    }, []);

    return { cellSize };
};
