
import { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../contexts/GameContext';

export const useUIRecoil = (intensity: number = 10, stiffness: number = 0.6, damping: number = 0.8) => {
    const { engine } = useGameContext();
    const [offset, setOffset] = useState(0);
    const velocity = useRef(0);
    const position = useRef(0);
    const rafRef = useRef<number | null>(null);
    const active = useRef(false);

    useEffect(() => {
        if (!engine.current) return;

        const trigger = (payload?: any) => {
            // Downward impulse
            velocity.current = intensity;
            active.current = true;
            if (!rafRef.current) loop();
        };

        engine.current.events.on('AUDIO', (payload) => {
            if (payload.event === 'HARD_DROP') trigger();
        });
        
        // Also trigger on level up for impact
        engine.current.events.on('VISUAL_EFFECT', (payload) => {
            if (payload.type === 'SHOCKWAVE') trigger();
        });

        const loop = () => {
            // Spring physics: F = -kx - cv
            const force = -stiffness * position.current - damping * velocity.current;
            velocity.current += force;
            position.current += velocity.current;

            if (Math.abs(position.current) < 0.1 && Math.abs(velocity.current) < 0.1) {
                position.current = 0;
                velocity.current = 0;
                active.current = false;
                rafRef.current = null;
                setOffset(0);
                return; // Stop loop
            }

            setOffset(position.current);
            rafRef.current = requestAnimationFrame(loop);
        };

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [engine, intensity, stiffness, damping]);

    return `translateY(${offset}px)`;
};
