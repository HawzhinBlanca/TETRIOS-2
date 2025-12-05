
import type { GameCore } from './GameCore';
import { FloatingText, FloatingTextVariant } from '../types';

export class FXManager {
    private core: GameCore;
    public floatingTexts: FloatingText[] = [];
    public lockResetFlash: number = 0;
    public tSpinFlash: number = 0;

    constructor(core: GameCore) {
        this.core = core;
    }

    public addFloatingText(text: string, color: string, scale: number = 0.5, variant: FloatingTextVariant = 'default'): void {
        // Noise Filter: Suppress common/low-impact text to clean up the UI
        const isSpam = text.includes('SINGLE') || text.includes('DOUBLE') || text.includes('READY');
        const isImportant = text.includes('T-SPIN') || text.includes('COMBO') || text.includes('TETRIS') || text.includes('ZONE');
        
        if (isSpam && !isImportant) {
            return;
        }

        const id = Date.now() + Math.random();
        // Use player position from core for default placement
        const x = this.core.pieceManager.player.pos.x;
        const y = this.core.pieceManager.player.pos.y;
        
        this.floatingTexts.push({
            id, text, x, y, 
            life: 1.0, color, scale, initialScale: scale, variant,
        });
    }

    public triggerLockResetFlash(): void {
        this.lockResetFlash = 1.0;
    }

    public triggerTSpinFlash(): void {
        this.tSpinFlash = 1.0;
    }

    public update(deltaTime: number): void {
        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.life -= deltaTime / 1000; 
            // Float up (or down if flipped)
            ft.y += (this.core.flippedGravity ? 0.05 : -0.05) * (deltaTime / 1000); 
            return ft.life > 0;
        });

        // Fade flash effects
        if (this.lockResetFlash > 0.01) this.lockResetFlash *= 0.85;
        else this.lockResetFlash = 0;

        if (this.tSpinFlash > 0.01) this.tSpinFlash *= 0.9;
        else this.tSpinFlash = 0;
    }

    public clear(): void {
        this.floatingTexts = [];
        this.lockResetFlash = 0;
        this.tSpinFlash = 0;
    }
}
