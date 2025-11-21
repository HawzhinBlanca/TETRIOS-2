
import React, { useRef, useEffect } from 'react';

interface GestureHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onTap: () => void;
  onHold: (active: boolean) => void;
}

/**
 * Custom React hook to detect touch gestures (swipes, taps, holds) on a given HTML element.
 * 
 * @param {React.RefObject<HTMLElement>} elementRef A ref to the HTML element to attach listeners to.
 * @param {GestureHandlers} handlers An object containing callback functions for various gestures.
 * @returns {void}
 */
export const useGestures = (elementRef: React.RefObject<HTMLElement>, handlers: GestureHandlers): void => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  
  // Use a ref for handlers to avoid re-binding listeners on every render
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Ignore multi-touch
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      isHoldingRef.current = false;

      // Start hold timer
      holdTimeoutRef.current = window.setTimeout(() => {
        isHoldingRef.current = true;
        handlersRef.current.onHold(true);
      }, 200); // 200ms threshold for hold
    };

    const handleTouchMove = (e: TouchEvent) => {
        if(e.cancelable) e.preventDefault(); // Prevent scrolling

        if (!touchStartRef.current) return;
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        const dx = x - touchStartRef.current.x;
        const dy = y - touchStartRef.current.y;

        // If moved significantly, cancel hold
        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
            if (holdTimeoutRef.current) {
                clearTimeout(holdTimeoutRef.current);
                holdTimeoutRef.current = null;
            }
            if (isHoldingRef.current) {
                isHoldingRef.current = false;
                handlersRef.current.onHold(false);
            }
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Clear hold timer
      if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
      }

      // If we were holding, end the hold and return (don't trigger swipe/tap)
      if (isHoldingRef.current) {
          isHoldingRef.current = false;
          handlersRef.current.onHold(false);
          touchStartRef.current = null;
          return;
      }

      if (!touchStartRef.current) return;

      const endX: number = e.changedTouches[0].clientX;
      const endY: number = e.changedTouches[0].clientY;
      const endTime: number = Date.now();

      const dx: number = endX - touchStartRef.current.x;
      const dy: number = endY - touchStartRef.current.y;
      const dt: number = endTime - touchStartRef.current.time;

      const absDx: number = Math.abs(dx);
      const absDy: number = Math.abs(dy);

      // Tap detection
      if (absDx < 10 && absDy < 10 && dt < 300) {
        handlersRef.current.onTap();
      } else {
          // Swipe detection
          if (absDx > absDy) {
            // Horizontal
            if (absDx > 30) {
              if (dx > 0) handlersRef.current.onSwipeRight();
              else handlersRef.current.onSwipeLeft();
            }
          } else {
            // Vertical
            if (absDy > 30) { 
              if (dy > 0) handlersRef.current.onSwipeDown();
              else handlersRef.current.onSwipeUp();
            }
          }
      }

      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
};
