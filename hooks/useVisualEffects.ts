import React, { useEffect } from 'react';
import { ParticlesHandle } from '../components/Particles';
import { VisualEffectPayload } from '../types';
import { SHAKE_DURATION_HARD_MS, SHAKE_DURATION_SOFT_MS, FLASH_DURATION_MS, PARTICLE_AMOUNT_MEDIUM, PARTICLE_AMOUNT_SOFT } from '../constants';

export const useVisualEffects = (
    particlesRef: React.RefObject<ParticlesHandle>,
    setShakeClass: (cls: string) => void,
    setFlashOverlay: (color: string | null) => void,
    cellSize: number,
    uiVisualEffect: VisualEffectPayload | null,
    clearVisualEffect: () => void
) => {
    useEffect(() => {
        if (!uiVisualEffect) return;

        const effect = uiVisualEffect;

        switch (effect.type) {
            case 'SHAKE':
                const cls = effect.payload === 'hard' ? 'shake-hard' : 'shake-soft';
                setShakeClass(cls);
                setTimeout(() => setShakeClass(''), effect.payload === 'hard' ? SHAKE_DURATION_HARD_MS : SHAKE_DURATION_SOFT_MS);
                break;
            case 'PARTICLE':
                if (particlesRef.current) {
                    const { isExplosion, isBurst, clearedRows, y, x, color, amount } = effect.payload || {};
                    if (isExplosion) {
                        if (Array.isArray(clearedRows)) {
                            clearedRows.forEach((rowY: number) => {
                                particlesRef.current?.spawnExplosion(rowY, color);
                            });
                        } else if (typeof clearedRows === 'number') {
                            particlesRef.current?.spawnExplosion(clearedRows, color);
                        }
                    } else if (isBurst && x !== undefined && y !== undefined && color) {
                        particlesRef.current.spawnBurst(x, y, color, amount || PARTICLE_AMOUNT_MEDIUM);
                    } else if (x !== undefined && y !== undefined && color) {
                        particlesRef.current.spawn(x, y, color, amount || PARTICLE_AMOUNT_SOFT);
                    }
                }
                break;
            case 'FLASH':
                const { color: flashColor, duration } = effect.payload || {};
                if (flashColor) {
                    setFlashOverlay(flashColor);
                    setTimeout(() => setFlashOverlay(null), duration || FLASH_DURATION_MS);
                }
                break;
            case 'FRENZY_START':
                setFlashOverlay(effect.payload?.color || 'rgba(255, 215, 0, 0.5)');
                setTimeout(() => setFlashOverlay(null), 300);
                particlesRef.current?.spawnBurst(5 * cellSize, 10 * cellSize, 'gold', 100);
                break;
            case 'FRENZY_END':
                setFlashOverlay(effect.payload?.color || 'rgba(255, 215, 0, 0.2)');
                setTimeout(() => setFlashOverlay(null), 200);
                break;
            case 'POWERUP_ACTIVATE':
                if (particlesRef.current) {
                    const { type: powerupType, x, y, color } = effect.payload || {};
                    if (x !== undefined && y !== undefined && color) { 
                        particlesRef.current.spawnBurst(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, color, 40);
                    } else if (color) {
                        particlesRef.current.spawnBurst(10 * cellSize / 2, 20 * cellSize / 2, color, 20);
                    }
                }
                break;
            case 'BLITZ_SPEED_THRESHOLD':
                setFlashOverlay('rgba(255, 165, 0, 0.3)');
                setTimeout(() => setFlashOverlay(null), 200);
                particlesRef.current?.spawnBurst(10 * cellSize / 2, 20 * cellSize / 2, 'orange', 50);
                break;
            case 'FLIPPED_GRAVITY_ACTIVATE':
                setFlashOverlay('rgba(59, 130, 246, 0.5)');
                setTimeout(() => setFlashOverlay(null), 300);
                particlesRef.current?.spawnBurst(10 * cellSize / 2, 20 * cellSize / 2, 'blue', 70);
                break;
            case 'FLIPPED_GRAVITY_END':
                setFlashOverlay('rgba(59, 130, 246, 0.2)');
                setTimeout(() => setFlashOverlay(null), 200);
                break;
            default:
                break;
        }
        clearVisualEffect(); 
    }, [uiVisualEffect, setShakeClass, setFlashOverlay, clearVisualEffect, particlesRef, cellSize]);
};