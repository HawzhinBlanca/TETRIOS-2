


import { TetrominoType, BlockSkin, CellModifier } from '../types';
import { COLORS, MODIFIER_COLORS } from '../constants';
import { VISUAL_THEME } from './visualTheme';

// Key for caching: Type + Skin + CellSize + Color(Optional)
type SpriteKey = string;

export class SpriteManager {
    private spriteCache: Map<SpriteKey, HTMLCanvasElement> = new Map();
    private garbageSpriteCache: Map<string, HTMLCanvasElement> = new Map();

    constructor() {}

    public getBlockSprite(type: TetrominoType | 'G', skin: BlockSkin, cellSize: number, colorOverride?: string): HTMLCanvasElement {
        const key = `${type}_${skin}_${cellSize}_${colorOverride || 'def'}`;
        if (this.spriteCache.has(key)) {
            return this.spriteCache.get(key)!;
        }

        const sprite = this.generateBlockSprite(type, skin, cellSize, colorOverride);
        this.spriteCache.set(key, sprite);
        return sprite;
    }

    public clearCache() {
        this.spriteCache.clear();
        this.garbageSpriteCache.clear();
    }

    private generateBlockSprite(type: TetrominoType | 'G', skin: BlockSkin, size: number, colorOverride?: string): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const color = colorOverride || (type === 'G' ? VISUAL_THEME.BLOCK.GARBAGE_COLOR : COLORS[type as TetrominoType]);

        // Rendering Logic Logic migrated from BoardRenderer to here for baking
        ctx.save();
        ctx.fillStyle = color;

        if (skin === 'RETRO') {
            ctx.fillRect(0, 0, size, size);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, size, size);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(2, 2, 4, 4); 
        } 
        else if (skin === 'GELATIN') {
            ctx.beginPath();
            ctx.roundRect(1, 1, size - 2, size - 2, size * 0.3);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.ellipse(size * 0.3, size * 0.3, size * 0.15, size * 0.1, -0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (skin === 'MINIMAL') {
            ctx.fillRect(1, 1, size - 2, size - 2);
        }
        else if (skin === 'CYBER') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, size, size);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(2, 2, size - 4, size - 4);
            ctx.fillStyle = color;
            ctx.fillRect(size/2 - 2, size/2 - 2, 4, 4);
        }
        else {
            // DEFAULT / NEON
            // Bake shadow for neon only if not too heavy, but canvas shadowBlur is expensive to bake repeatedly too.
            // We assume this happens once per game load/resize.
            
            // Base Block
            ctx.fillRect(0, 0, size, size);
            
            // Bevels
            ctx.fillStyle = `rgba(255,255,255,${VISUAL_THEME.BLOCK.BEVEL_TOP_ALPHA})`;
            ctx.fillRect(0, 0, size, size * 0.15);
            ctx.fillRect(0, 0, size * 0.15, size);
            
            ctx.fillStyle = `rgba(0,0,0,${VISUAL_THEME.BLOCK.BEVEL_SHADOW_ALPHA})`;
            ctx.fillRect(0, size * 0.85, size, size * 0.15);
            ctx.fillRect(size * 0.85, 0, size * 0.15, size);
            
            if (type !== 'G') {
                // Baking inner glow
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = `rgba(255,255,255,${VISUAL_THEME.BLOCK.INNER_GLOW_ALPHA})`;
                ctx.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
                ctx.globalCompositeOperation = 'source-over';
            }
        }
        ctx.restore();

        // Create a secondary canvas for the glow if NEON (ShadowBlur causes bleeding, so we need padding if we want to bake it)
        // For now, we stick to "internal" rendering. External glow is expensive to bake unless we increase canvas size.
        // Optimization: Draw the block on a larger canvas to capture shadow, then draw that image centered.
        if (skin === 'NEON' && type !== 'G') {
            const glowCanvas = document.createElement('canvas');
            const padding = 10;
            glowCanvas.width = size + padding * 2;
            glowCanvas.height = size + padding * 2;
            const gCtx = glowCanvas.getContext('2d');
            if (gCtx) {
                gCtx.shadowColor = color;
                gCtx.shadowBlur = size * 0.5;
                gCtx.drawImage(canvas, padding, padding);
                return glowCanvas; // Return the larger canvas with glow
            }
        }

        return canvas;
    }
}