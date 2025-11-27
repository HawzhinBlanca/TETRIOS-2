
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
            case 'PARTICLE':
                if (rendererRef && rendererRef.current) {
                    const { isExplosion, isBurst, clearedRows, y, x, color, amount } = effect.payload || {};
                    const scaleX = x !== undefined ? x * cellSize + (cellSize/2) : 0;
                    const scaleY = y !== undefined ? y * cellSize + (cellSize/2) : 0;
                    const safeColor = color || '#ffffff';

                    if (isExplosion) {
                        // Row explosions
                        if (Array.isArray(clearedRows)) {
                            clearedRows.forEach((rowY: number) => {
                                rendererRef.current?.spawnParticle(200, rowY * cellSize, safeColor, amount || 50, 'explosion'); 
                            });
                        } else if (typeof clearedRows === 'number') {
                            rendererRef.current?.spawnParticle(200, clearedRows * cellSize, safeColor, amount || 50, 'explosion');
                        } else if (y !== undefined) {
                            rendererRef.current?.spawnParticle(scaleX, scaleY, safeColor, amount || 50, 'explosion');
                        }
                    } else if (isBurst) {
                        rendererRef.current.spawnParticle(scaleX, scaleY, safeColor, amount || 20, 'burst');
                    } else {
                        rendererRef.current.spawnParticle(scaleX, scaleY, safeColor, amount || 10, 'flow');
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
                rendererRef?.current?.spawnParticle(150, 300, '#ffd700', 100, 'burst');
                break;
            case 'FRENZY_END':
                setFlashOverlay(effect.payload?.color || 'rgba(255, 215, 0, 0.2)');
                setTimeout(() => setFlashOverlay(null), 200);
                break;
            case 'POWERUP_ACTIVATE':
                if (rendererRef && rendererRef.current) {
                    const { x, y, color } = effect.payload || {};
                    if (x !== undefined && y !== undefined && color) {
                        rendererRef.current.spawnParticle(x * cellSize + cellSize/2, y * cellSize + cellSize/2, color, 40, 'burst');
                        rendererRef.current.spawnShockwave(x * cellSize, y * cellSize);
                    }
                }
                break;
            case 'BLITZ_SPEED_THRESHOLD':
                setFlashOverlay('rgba(255, 165, 0, 0.3)');
                setTimeout(() => setFlashOverlay(null), 200);
                break;
            case 'FLIPPED_GRAVITY_ACTIVATE':
                setFlashOverlay('rgba(59, 130, 246, 0.5)');
                setTimeout(() => setFlashOverlay(null), 300);
                break;
            case 'FLIPPED_GRAVITY_END':
                setFlashOverlay('rgba(59, 130, 246, 0.2)');
                setTimeout(() => setFlashOverlay(null), 200);
                break;
            case 'HARD_DROP_BEAM':
                if (rendererRef && rendererRef.current) {
                    const { x, startY, endY, color } = effect.payload;
                    rendererRef.current.addBeam(x, startY, endY, color);
                }
                break;
            case 'ROW_CLEAR':
                if (rendererRef && rendererRef.current) {
                    rendererRef.current.addClearingRows(effect.payload.rows);
                }
                break;
            case 'SHOCKWAVE':
                if (rendererRef && rendererRef.current) {
                    const { x, y } = effect.payload || {};
                    const sx = x !== undefined ? x * cellSize : 150;
                    const sy = y !== undefined ? y * cellSize : 300;
                    rendererRef.current.spawnShockwave(sx, sy);
                }
                break;
            case 'TSPIN_CLEAR':
                if (rendererRef && rendererRef.current) {
                    const { x, y, color } = effect.payload || {};
                    rendererRef.current.spawnParticle(x * cellSize, y * cellSize, color || '#d946ef', 50, 'burst');
                }
                setFlashOverlay(effect.payload?.color || '#d946ef');
                setTimeout(() => setFlashOverlay(null), 150);
                break;
            default:
                break;
        }
        clearVisualEffect(); 
    }, [uiVisualEffect, setShakeClass, setFlashOverlay, clearVisualEffect, cellSize, rendererRef]);
};
