import React, { useRef, useEffect } from 'react';

interface GestureHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeDown: () => void;
  onFlickDown: () => void;
  onTap: () => void;
}

export const useGestures = (elementRef: React.RefObject<HTMLElement>, handlers: GestureHandlers) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();

      const dx = endX - touchStartRef.current.x;
      const dy = endY - touchStartRef.current.y;
      const dt = endTime - touchStartRef.current.time;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Tap detection
      if (absDx < 10 && absDy < 10 && dt < 200) {
        handlers.onTap();
        touchStartRef.current = null;
        return;
      }

      // Swipe detection
      if (absDx > absDy) {
        // Horizontal
        if (absDx > 30) {
          if (dx > 0) handlers.onSwipeRight();
          else handlers.onSwipeLeft();
        }
      } else {
        // Vertical
        if (absDy > 30 && dy > 0) { // Only Down
          if (dt < 250 && absDy > 50) {
            handlers.onFlickDown(); // Fast flick
          } else {
            handlers.onSwipeDown(); // Slow drag
          }
        }
      }

      touchStartRef.current = null;
    };

    // Prevent default to stop scrolling/zooming while playing
    const handleTouchMove = (e: TouchEvent) => {
        if(e.cancelable) e.preventDefault(); 
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handlers]);
};