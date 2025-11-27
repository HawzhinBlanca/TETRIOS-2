
import { useEffect, useRef } from 'react';
import { audioManager } from '../utils/audioManager';
import { GameState } from '../types';

interface UseAudioSystemProps {
    gameState: GameState;
    musicEnabled: boolean;
    isMuted: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    uiVolume: number;
    isOverlayOpen: boolean;
}

export const useAudioSystem = ({
    gameState,
    musicEnabled,
    masterVolume,
    musicVolume,
    sfxVolume,
    uiVolume,
    isOverlayOpen
}: UseAudioSystemProps) => {
    const audioRafRef = useRef<number | null>(null);

    // Initialization
    useEffect(() => {
        const initAudio = () => audioManager.init();
        
        // Robust listener set for all device types
        const events = ['click', 'keydown', 'touchstart', 'pointerdown'];
        events.forEach(evt => window.addEventListener(evt, initAudio, { once: true }));
        
        return () => {
            events.forEach(evt => window.removeEventListener(evt, initAudio));
            
            // Cleanup audio context if component unmounts heavily (e.g. full nav away)
            if (audioManager.ctx && audioManager.ctx.state !== 'closed') {
               audioManager.ctx.suspend().catch(() => {});
            }
        };
    }, []);

    // Sync Volumes
    useEffect(() => {
        audioManager.setMasterVolume(masterVolume);
        audioManager.setMusicVolume(musicVolume);
        audioManager.setSfxVolume(sfxVolume);
        audioManager.setUiVolume(uiVolume);
    }, [masterVolume, musicVolume, sfxVolume, uiVolume]);

    // Enable/Disable Music
    useEffect(() => {
        audioManager.setMusicEnabled(musicEnabled);
    }, [musicEnabled]);

    // Start/Stop Music based on Game State
    useEffect(() => {
        if (gameState === 'PLAYING' && musicEnabled) {
            audioManager.startMusic();
        } else {
            audioManager.stopMusic();
        }
    }, [gameState, musicEnabled]);

    // Filter Sweep (Low Pass) for Depth effect during menus/overlays
    useEffect(() => {
        // Muffle audio (200Hz) when overlay is open, clear (22000Hz) when playing
        audioManager.setLowPass(isOverlayOpen ? 200 : 22000);
    }, [isOverlayOpen]);

    // Audio Reactive Loop (updates CSS variable for UI glow)
    useEffect(() => {
        if (!musicEnabled) {
            if (audioRafRef.current) cancelAnimationFrame(audioRafRef.current);
            return;
        }

        const updateAudioReactivity = () => {
            const energy = audioManager.getEnergy();
            // Use a CSS variable on root for global access (borders, glows)
            document.documentElement.style.setProperty('--audio-energy', energy.toFixed(2));
            audioRafRef.current = requestAnimationFrame(updateAudioReactivity);
        };
        
        updateAudioReactivity();
        
        return () => {
            if (audioRafRef.current) cancelAnimationFrame(audioRafRef.current);
        };
    }, [musicEnabled]);
};
