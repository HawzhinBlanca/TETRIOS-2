
import React, { useEffect, useState, useRef } from 'react';
import { audioManager } from '../utils/audioManager';

const RhythmIndicator: React.FC = () => {
    const [pulse, setPulse] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const loop = () => {
            // Get beat intensity (0 to 1)
            const p = audioManager.getPulseFactor();
            setPulse(p);
            rafRef.current = requestAnimationFrame(loop);
        };
        loop();
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <div className="flex justify-center items-center gap-1 h-2 w-32 mb-2">
            {/* Central Beat Bar */}
            <div 
                className="h-full bg-cyan-400 rounded-full transition-all duration-75 shadow-[0_0_10px_cyan]"
                style={{
                    width: `${20 + (pulse * 80)}%`,
                    opacity: 0.3 + (pulse * 0.7)
                }}
            ></div>
            
            {/* Side Indicators */}
            <div 
                className="w-1 h-full bg-cyan-600 rounded-full transition-all duration-100"
                style={{ transform: `scaleY(${0.5 + pulse})` }}
            ></div>
            <div 
                className="w-1 h-full bg-cyan-600 rounded-full transition-all duration-100"
                style={{ transform: `scaleY(${0.5 + pulse})` }}
            ></div>
        </div>
    );
};

export default React.memo(RhythmIndicator);
