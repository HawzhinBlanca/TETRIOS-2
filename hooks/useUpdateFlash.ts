
import { useState, useEffect } from 'react';

/**
 * Returns true for a short duration whenever the trigger value changes (and is truthy).
 */
export const useUpdateFlash = (trigger: any, duration: number = 200) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setActive(true);
      const t = setTimeout(() => setActive(false), duration);
      return () => clearTimeout(t);
    }
  }, [trigger, duration]);

  return active;
};
