
import * as PIXI from 'pixi.js';
import { TetrominoType, BlockSkin, ColorblindMode } from '../types';
import { VISUAL_THEME } from './visualTheme';
import { getPieceColor } from './themeUtils';

export class SpriteManager {
    private textureCache: Map<string, PIXI.Texture> = new Map();
    private atlasCanvas: HTMLCanvasElement;
    private atlasContext: CanvasRenderingContext2D;
    private atlasBaseTexture: PIXI.BaseTexture;
    
    private currentX = 0;
    private currentY = 0;
    private currentRowHeight = 0;
    private readonly ATLAS_SIZE = 2048;

    constructor() {
        this.atlasCanvas = document.createElement('canvas');
        this.atlasCanvas.width = this.ATLAS_SIZE;
        this.atlasCanvas.height = this.ATLAS_SIZE;
        this.atlasContext = this.atlasCanvas.getContext('2d', { willReadFrequently: true })!;
        
        // Initialize BaseTexture directly with the canvas
        // Fix: Removed incorrect usage of new PIXI.Resource() which caused textures to fail loading
        this.atlasBaseTexture = new PIXI.BaseTexture(this.atlasCanvas, {
            scaleMode: PIXI.SCALE_MODES.NEAREST,
        });

        this.initAtlas();
    }

    private initAtlas() {
        // Clear atlas
        this.atlasContext.clearRect(0, 0, this.ATLAS_SIZE, this.ATLAS_SIZE);
        this.currentX = 0;
        this.currentY = 0;
        this.currentRowHeight = 0;

        // 1. Create White Pixel (1x1) for general particles/rects
        this.atlasContext.fillStyle = '#ffffff';
        this.atlasContext.fillRect(0, 0, 2, 2); // 2x2 for safety with linear filtering
        const whiteTex = new PIXI.Texture(this.atlasBaseTexture, new PIXI.Rectangle(0, 0, 1, 1));
        this.textureCache.set('WHITE', whiteTex);

        // 2. Create Soft Circle (32x32) for glow particles
        this.drawCircleToAtlas(32);

        // Offset for next assets (Start at y=34 to clear the initial assets)
        this.currentX = 0;
        this.currentY = 34;
        this.currentRowHeight = 0;
        
        this.atlasBaseTexture.update();
    }

    private drawCircleToAtlas(size: number) {
        const x = 4; 
        const y = 0;
        const r = size / 2;
        
        // Radial Gradient for soft particle
        const grad = this.atlasContext.createRadialGradient(x + r, y + r, 0, x + r, y + r, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.atlasContext.fillStyle = grad;
        this.atlasContext.beginPath();
        this.atlasContext.arc(x + r, y + r, r, 0, Math.PI * 2);
        this.atlasContext.fill();

        const tex = new PIXI.Texture(this.atlasBaseTexture, new PIXI.Rectangle(x, y, size, size));
        this.textureCache.set('CIRCLE', tex);
    }

    public getParticleTexture(type: 'rect' | 'circle' = 'rect'): PIXI.Texture {
        const tex = this.textureCache.get(type === 'circle' ? 'CIRCLE' : 'WHITE');
        return tex || PIXI.Texture.WHITE; // Fallback
    }

    public getBlockTexture(type: TetrominoType | 'G', skin: BlockSkin, cellSize: number, colorblindMode: ColorblindMode, colorOverride?: string): PIXI.Texture {
        // Round size to prevent float cache misses (e.g. 20.000001 vs 20)
        const safeSize = Math.round(cellSize);
        const key = `${type}_${skin}_${safeSize}_${colorblindMode}_${colorOverride || 'def'}`;
        
        if (this.textureCache.has(key)) {
            return this.textureCache.get(key)!;
        }

        // Generate the block visual on a temp canvas
        const blockCanvas = this.generateBlockCanvas(type, skin, safeSize, colorblindMode, colorOverride);
        const w = blockCanvas.width;
        const h = blockCanvas.height;
        const padding = 2; // Padding to prevent texture bleeding

        // Simple Shelf Packing Algorithm
        if (this.currentX + w + padding > this.ATLAS_SIZE) {
            this.currentX = 0;
            this.currentY += this.currentRowHeight + padding;
            this.currentRowHeight = 0;
        }

        if (this.currentY + h + padding > this.ATLAS_SIZE) {
            console.warn("[SpriteManager] Atlas Full! Flushing cache to prevent crash.");
            this.clearCache();
            // Recurse (cache is now empty, so it will regenerate)
            return this.getBlockTexture(type, skin, safeSize, colorblindMode, colorOverride);
        }

        // Draw to Atlas
        this.atlasContext.drawImage(blockCanvas, this.currentX, this.currentY);

        // Create Texture
        const texture = new PIXI.Texture(
            this.atlasBaseTexture,
            new PIXI.Rectangle(this.currentX, this.currentY, w, h)
        );

        // Cache it
        this.textureCache.set(key, texture);

        // Advance cursor
        this.currentX += w + padding;
        this.currentRowHeight = Math.max(this.currentRowHeight, h);

        // Update GPU
        this.atlasBaseTexture.update();

        return texture;
    }

    public clearCache() {
        // Safely destroy old textures without destroying base texture if possible
        this.textureCache.forEach(tex => {
            if (tex.baseTexture !== this.atlasBaseTexture) tex.destroy();
        });
        this.textureCache.clear();
        // Re-init atlas base
        this.initAtlas();
    }

    private generateBlockCanvas(type: TetrominoType | 'G', skin: BlockSkin, size: number, colorblindMode: ColorblindMode, colorOverride?: string): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        // Ensure integer dimensions
        canvas.width = Math.ceil(size);
        canvas.height = Math.ceil(size);
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        let color: string;
        if (colorOverride) {
            color = colorOverride;
        } else if (type === 'G') {
            color = VISUAL_THEME.BLOCK.GARBAGE_COLOR;
        } else {
            color = getPieceColor(type, colorblindMode);
        }

        ctx.save();
        ctx.fillStyle = color;

        if (skin === 'RETRO') {
            ctx.fillRect(0, 0, size, size);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = Math.max(1, size * 0.06);
            ctx.strokeRect(0, 0, size, size);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            const inner = size * 0.2;
            ctx.fillRect(inner, inner, size * 0.2, size * 0.2); 
        } 
        else if (skin === 'GELATIN') {
            ctx.beginPath();
            // Handle roundRect if supported, else fallback
            if (ctx.roundRect) {
                ctx.roundRect(1, 1, size - 2, size - 2, size * 0.3);
            } else {
                ctx.rect(1, 1, size - 2, size - 2);
            }
            ctx.fill();
            // Shine
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
            ctx.lineWidth = Math.max(1, size * 0.08);
            ctx.strokeRect(1, 1, size - 2, size - 2);
            ctx.fillStyle = color;
            const center = size / 2;
            const dot = size * 0.15;
            ctx.fillRect(center - dot, center - dot, dot * 2, dot * 2);
        }
        else {
            // NEON / DEFAULT
            ctx.fillRect(0, 0, size, size);
            
            // Bevels
            ctx.fillStyle = `rgba(255,255,255,${VISUAL_THEME.BLOCK.BEVEL_TOP_ALPHA})`;
            ctx.fillRect(0, 0, size, size * 0.15);
            ctx.fillRect(0, 0, size * 0.15, size);
            
            ctx.fillStyle = `rgba(0,0,0,${VISUAL_THEME.BLOCK.BEVEL_SHADOW_ALPHA})`;
            ctx.fillRect(0, size * 0.85, size, size * 0.15);
            ctx.fillRect(size * 0.85, 0, size * 0.15, size);
            
            if (type !== 'G') {
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = `rgba(255,255,255,${VISUAL_THEME.BLOCK.INNER_GLOW_ALPHA})`;
                ctx.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
                ctx.globalCompositeOperation = 'source-over';
            }
        }
        ctx.restore();

        return canvas;
    }
}
