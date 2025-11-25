
import { useState, useEffect } from 'react';

export const useResponsiveLayout = () => {
    const [cellSize, setCellSize] = useState(30);

    useEffect(() => {
        const handleResize = () => {
            // Use documentElement.clientHeight for more accurate viewport height on mobile (excludes some browser UI)
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            
            // Apple-Grade Mobile Layout Optimization
            // Increased padding to ensure board sits ABOVE the bottom control deck.
            // Top Bar (~60px) + Bottom Controls/Safe Area (~160px)
            const MOBILE_VERTICAL_PADDING = 220; 
            const MOBILE_HORIZONTAL_PADDING = 10; // Slight buffer for edge cases

            // Desktop: Needs space for header/margins and sidebars
            const DESKTOP_VERTICAL_PADDING = 140;
            const DESKTOP_HORIZONTAL_RESERVE = 650; 

            let maxVerticalSize;
            let maxHorizontalSize;

            if (vw >= 1024) { 
                // Desktop Layout
                const availableHeight = vh - DESKTOP_VERTICAL_PADDING;
                const availableWidth = vw - DESKTOP_HORIZONTAL_RESERVE;
                
                maxVerticalSize = Math.floor(Math.max(0, availableHeight) / 22); // 22 rows high
                maxHorizontalSize = Math.floor(Math.max(0, availableWidth) / 11); // 11 cols wide
            } else { 
                // Mobile Layout
                const availableHeight = vh - MOBILE_VERTICAL_PADDING;
                const availableWidth = vw - MOBILE_HORIZONTAL_PADDING;
                
                maxVerticalSize = Math.floor(Math.max(0, availableHeight) / 22);
                maxHorizontalSize = Math.floor(Math.max(0, availableWidth) / 11);
            }
            
            // Choose the limiting dimension to ensure the board fits completely
            const idealSize = Math.min(maxVerticalSize, maxHorizontalSize);
            
            // Clamp size:
            setCellSize(Math.max(12, Math.min(55, idealSize)));
        };
        
        const resizeObserver = new ResizeObserver(() => requestAnimationFrame(handleResize));
        resizeObserver.observe(document.body);
        
        // Initial calculation
        handleResize(); 
        
        return () => resizeObserver.disconnect();
    }, []);

    return { cellSize };
};
