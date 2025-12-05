
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

    const isHitWindow = pulse > 0.8;

    return (
        <div className="flex justify-center items-center gap-2 h-4 w-48 mb-2">
            {/* Left Marker */}
            <div className={`w-1 h-3 transition-colors duration-100 ${isHitWindow ? 'bg-yellow-400 shadow-[0_0_10px_gold]' : 'bg-white/10'}`}></div>

            {/* Central Beat Bar */}
            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden relative border border-white/5">
                <div 
                    className={`h-full rounded-full transition-all duration-75 shadow-[0_0_15px_currentColor] 
                        ${isHitWindow ? 'bg-yellow-400' : 'bg-cyan-500'}`}
                    style={{
                        width: `${100}%`,
                        opacity: pulse,
                        transform: `scaleX(${0.2 + (pulse * 0.8)})`,
                        transformOrigin: 'center'
                    }}
                ></div>
                
                {/* Center Target Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50 -translate-x-1/2"></div>
            </div>
            
            {/* Right Marker */}
            <div className={`w-1 h-3 transition-colors duration-100 ${isHitWindow ? 'bg-yellow-400 shadow-[0_0_10px_gold]' : 'bg-white/10'}`}></div>
        </div>
    );
};

export default React.memo(RhythmIndicator);
