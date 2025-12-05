import React, { useEffect } from 'react';
import { GameCore } from '../utils/GameCore';
import { useEffectStore } from '../stores/effectStore';

export const useGameEffectEvents = (engine: React.MutableRefObject<GameCore>) => {
    const triggerVisualEffect = useEffectStore((state) => state.triggerVisualEffect);

    useEffect(() => {
        if (!engine.current) return;

        const onEffect = (effect: any) => {
            triggerVisualEffect(effect.type, effect.payload);
        };

        engine.current.events.on('VISUAL_EFFECT', onEffect);
        return () => engine.current.events.off('VISUAL_EFFECT', onEffect);
    }, [engine, triggerVisualEffect]);
};