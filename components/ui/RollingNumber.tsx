
import React, { useEffect, useState, useRef } from 'react';

interface RollingNumberProps {
    value: number;
    duration?: number;
    className?: string;
    format?: (val: number) => string;
}

const RollingNumber: React.FC<RollingNumberProps> = ({ 
    value, 
    duration = 800, 
    className = '',
    format = (v) => Math.floor(v).toLocaleString()
}) => {
    const [displayValue, setDisplayValue] = useState(value);
    const startValue = useRef(value);
    const startTime = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        startValue.current = displayValue;
        startTime.current = null;
        
        const animate = (timestamp: number) => {
            if (!startTime.current) startTime.current = timestamp;
            const progress = timestamp - startTime.current;
            const t = Math.min(progress / duration, 1);
            
            // Ease Out Quart
            const ease = 1 - Math.pow(1 - t, 4);
            
            const nextValue = startValue.current + (value - startValue.current) * ease;
            setDisplayValue(nextValue);

            if (t < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [value, duration]);

    return (
        <span className={`tabular-nums ${className}`}>
            {format(displayValue)}
        </span>
    );
};

export default RollingNumber;
