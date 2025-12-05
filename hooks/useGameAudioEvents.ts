import React, { useEffect } from 'react';
import { GameCore } from '../utils/GameCore';
import { useGameAudio } from './useGameAudio';
import { AudioEvent } from '../types';

export const useGameAudioEvents = (engine: React.MutableRefObject<GameCore>) => {
    const { handleAudioEvent } = useGameAudio();

    useEffect(() => {
        if (!engine.current) return;
        
        const onAudio = (payload: any) => {
            handleAudioEvent(payload.event as AudioEvent, payload.val, payload.type, payload.extra);
        };

        engine.current.events.on('AUDIO', onAudio);
        return () => engine.current.events.off('AUDIO', onAudio);
    }, [engine, handleAudioEvent]);
};