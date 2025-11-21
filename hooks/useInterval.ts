import { useEffect, useRef } from 'react';

/**
 * Custom React hook to set up a `setInterval` that is declarative and handles cleanup.
 * It ensures that the callback always refers to the latest function, preventing stale closures.
 *
 * @param {() => void} callback The function to be called repeatedly.
 * @param {number | null} delay The delay in milliseconds between calls. If `null`, the interval is cleared.
 * @returns {void}
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void | null>(null);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick(): void {
      if (savedCallback.current) savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}