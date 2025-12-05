
import React, { useEffect } from 'react';
import { VisualEffectPayload } from '../types';
import { SHAKE_DURATION_HARD_MS, SHAKE_DURATION_SOFT_MS, FLASH_DURATION_MS } from '../constants';
import { BoardRenderer } from '../utils/BoardRenderer';

export const useVisualEffects = (
    setShakeClass: (cls: string) => void,
    setFlashOverlay: (color: string | null) => void,
    cellSize: number,
    uiVisualEffect: VisualEffectPayload | null,
    clearVisualEffect: () => void,
    rendererRef?: React.MutableRefObject<BoardRenderer | null> 
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
            case 'TETRIS_CLEAR':
            case 'ABERRATION':
                setShakeClass('deep-fry');
                setFlashOverlay('rgba(255, 255, 255, 0.3)');
                setTimeout(() => {
                    setShakeClass('');
                    setFlashOverlay(null);
                }, 300);
                break;
            case 'PARTICLE':
                if (rendererRef && rendererRef.current) {
                    const { isExplosion, isBurst, clearedRows, y, x, color, amount } = effect.payload || {};
                    const scaleX = x !== undefined ? x * cellSize + (cellSize/2) : 0;
                    const scaleY = y !== undefined ? y * cellSize + (cellSize/2) : 0;
                    const safeColor = color || '#ffffff';

                    if (isExplosion) {
                        // Row explosions now spawn lateral sparks
                        if (Array.isArray(clearedRows)) {
                            clearedRows.forEach((rowY: number) => {
                                // Spawn at center of row
                                const centerX = (10 * cellSize) / 2; // Assuming width 10
                                rendererRef.current?.spawnParticle(centerX, rowY * cellSize + (cellSize/2), safeColor, amount || 30, 'lateral'); 
                            });
                        } else if (typeof clearedRows === 'number') {
                            const centerX = (10 * cellSize) / 2;
                            rendererRef.current?.spawnParticle(centerX, clearedRows * cellSize + (cellSize/2), safeColor, amount || 30, 'lateral');
                        } else {
                            rendererRef.current?.spawnParticle(scaleX, scaleY, safeColor, amount || 50, 'explosion');
                        }
                    } else if (isBurst) {
                        rendererRef.current?.spawnParticle(scaleX, scaleY, safeColor, amount || 20, 'burst');
                    } else {
                        // Normal land particles
                        rendererRef.current?.spawnParticle(scaleX, scaleY, safeColor, amount || 10, 'normal');
                    }
                }
                break;
            case 'HARD_DROP_BEAM':
                if (rendererRef && rendererRef.current) {
                    rendererRef.current.addBeam(effect.payload.x, effect.payload.startY, effect.payload.endY, effect.payload.color);
                }
                break;
            case 'FLASH':
                setFlashOverlay(effect.payload?.color || 'white');
                setTimeout(() => setFlashOverlay(null), effect.payload?.duration || FLASH_DURATION_MS);
                break;
            case 'ROW_CLEAR':
                if (rendererRef && rendererRef.current) {
                    rendererRef.current.addClearingRows(effect.payload.rows, effect.payload.color, effect.payload.isOnBeat);
                }
                break;
            case 'SHOCKWAVE':
                if (rendererRef && rendererRef.current) {
                    const { x, y, color, size } = effect.payload || {};
                    // If no specific coords, use center
                    const centerX = x !== undefined ? x * cellSize : (10 * cellSize) / 2;
                    const centerY = y !== undefined ? y * cellSize : (20 * cellSize) / 2;
                    rendererRef.current.spawnShockwave(centerX, centerY, color);
                }
                break;
        }

        clearVisualEffect();
    }, [uiVisualEffect, setShakeClass, setFlashOverlay, cellSize, rendererRef, clearVisualEffect]);
};
