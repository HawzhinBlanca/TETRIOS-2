
import React, { useEffect, useState, useRef } from 'react';
import { audioManager } from '../../utils/audioManager';

interface CountdownProps {
    onComplete: () => void;
}

const Countdown: React.FC<CountdownProps> = ({ onComplete }) => {
    const [count, setCount] = useState(3);
    const [showGo, setShowGo] = useState(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const tick = async () => {
            try {
                if (count === 3) {
                    audioManager.init(); // Force init on start
                    audioManager.playUiSelect();
                } else if (count > 0) {
                    audioManager.playUiSelect();
                } else if (count === 0) {
                    setShowGo(true);
                    audioManager.playCountdown();
                }
            } catch (e) {
                console.warn("Audio failed during countdown, proceeding anyway.");
            }

            if (count > 0) {
                timeoutId = setTimeout(() => {
                    setCount(c => c - 1);
                }, 800);
            } else {
                // Allow "GO" to display briefly
                timeoutId = setTimeout(() => {
                    onCompleteRef.current();
                }, 600);
            }
        };

        tick();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [count]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none select-none">
            {showGo ? (
                <div className="text-8xl md:text-9xl font-black italic text-white tracking-tighter drop-shadow-[0_0_50px_rgba(6,182,212,0.8)] animate-[ping_0.5s_ease-out] scale-150">
                    GO!
                </div>
            ) : (
                <div key={count} className="text-9xl font-black text-white/20 animate-[ping_0.8s_ease-in-out] drop-shadow-lg">
                    {count}
                </div>
            )}
        </div>
    );
};

export default Countdown;
