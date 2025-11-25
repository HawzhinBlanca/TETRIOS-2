
import { useState, useEffect } from 'react';

/**
 * Tracks changes in a numeric value and returns a delta string (e.g., "+100")
 * that persists for a short duration.
 */
export const useAnimatedValue = (value: string | number, duration: number = 1500) => {
  const [prevValue, setPrevValue] = useState(value);
  const [delta, setDelta] = useState<string | null>(null);

  useEffect(() => {
     if (typeof value === 'number' && typeof prevValue === 'number') {
         const diff = value - prevValue;
         if (diff > 0) {
             setDelta(`+${diff}`);
             const t = setTimeout(() => setDelta(null), duration);
             return () => clearTimeout(t);
         }
     }
     setPrevValue(value);
  }, [value, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return delta;
};
