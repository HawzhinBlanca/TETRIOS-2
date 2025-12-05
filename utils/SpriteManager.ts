
import * as PIXI from 'pixi.js';
import { TetrominoType, BlockSkin, ColorblindMode } from '../types';
import { VISUAL_THEME } from './visualTheme';
import { getPieceColor } from './themeUtils';
import { EMOJI_MAP } from '../constants';
import { telemetry } from './TelemetryManager';

export class SpriteManager {
    private textureCache: Map<string, PIXI.Texture> = new Map();
    private atlasCanvas: HTMLCanvasElement;
    private atlasContext: CanvasRenderingContext2D;
    private atlasBaseTexture: PIXI.BaseTexture | null = null;
    
    private currentX = 0;
    private currentY = 0;
    private currentRowHeight = 0;
    private readonly ATLAS_SIZE = 2048;

    constructor() {
        this.atlasCanvas = document.createElement('canvas');
        this.atlasCanvas.width = this.ATLAS_SIZE;
        this.atlasCanvas.height = this.ATLAS_SIZE;
        this.atlasContext = this.atlasCanvas.getContext('2d', { willReadFrequently: true })!;
        
        this.initAtlas();
    }

    private initAtlas() {
        if (this.atlasBaseTexture) {
            this.atlasBaseTexture.destroy();
        }

        this.atlasBaseTexture = new PIXI.BaseTexture(this.atlasCanvas, {
            scaleMode: PIXI.SCALE_MODES.NEAREST,
        });

        this.atlasContext.clearRect(0, 0, this.ATLAS_SIZE, this.ATLAS_SIZE);
        this.currentX = 0;
        this.currentY = 0;
        this.currentRowHeight = 0;

        // White 1x1 pixel for particles/fills
        this.atlasContext.fillStyle = '#ffffff';
        this.atlasContext.fillRect(0, 0, 2, 2); 
        const whiteTex = new PIXI.Texture(this.atlasBaseTexture, new PIXI.Rectangle(0, 0, 1, 1));
        this.textureCache.set('WHITE', whiteTex);

        // Circle Particle
        this.drawCircleToAtlas(32);

        this.currentX = 0;
        this.currentY = 36; // Move down after header items
        this.currentRowHeight = 0;
        
        this.atlasBaseTexture.update();
    }

    private drawCircleToAtlas(size: number) {
        if (!this.atlasBaseTexture) return;
        const x = 4; 
        const y = 0;
        const r = size / 2;
        
        const grad = this.atlasContext.createRadialGradient(x + r, y + r, 0, x + r, y + r, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)');
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
        return tex || PIXI.Texture.WHITE; 
    }

    public getBlockTexture(type: TetrominoType | 'G', skin: BlockSkin, cellSize: number, colorblindMode: ColorblindMode, colorOverride?: string): PIXI.Texture {
        const safeSize = Math.max(4, Math.round(cellSize));
        const key = `${type}_${skin}_${safeSize}_${colorblindMode}_${colorOverride || 'def'}`;
        
        if (this.textureCache.has(key)) {
            return this.textureCache.get(key)!;
        }

        if (!this.atlasBaseTexture) this.initAtlas();

        const blockCanvas = this.generateBlockCanvas(type, skin, safeSize, colorblindMode, colorOverride);
        const w = blockCanvas.width;
        const h = blockCanvas.height;
        const padding = 2; 

        if (this.currentX + w + padding > this.ATLAS_SIZE) {
            this.currentX = 0;
            this.currentY += this.currentRowHeight + padding;
            this.currentRowHeight = 0;
        }

        if (this.currentY + h + padding > this.ATLAS_SIZE) {
            telemetry.log('WARN', 'Texture Atlas Full - Flushing Cache', { 
                size: this.ATLAS_SIZE, 
                currentItems: this.textureCache.size 
            });
            telemetry.incrementCounter('renderer_atlas_flush');
            
            this.cleanup(); 
            return this.getBlockTexture(type, skin, safeSize, colorblindMode, colorOverride);
        }

        this.atlasContext.drawImage(blockCanvas, this.currentX, this.currentY);

        const texture = new PIXI.Texture(
            this.atlasBaseTexture!,
            new PIXI.Rectangle(this.currentX, this.currentY, w, h)
        );

        this.textureCache.set(key, texture);

        this.currentX += w + padding;
        this.currentRowHeight = Math.max(this.currentRowHeight, h);

        this.atlasBaseTexture!.update();

        return texture;
    }

    public cleanup() {
        this.textureCache.forEach((tex, key) => {
            tex.destroy();
        });
        this.textureCache.clear();
        this.initAtlas();
    }

    public destroy() {
        this.textureCache.forEach((tex) => tex.destroy());
        this.textureCache.clear();
        if (this.atlasBaseTexture) {
            this.atlasBaseTexture.destroy();
            this.atlasBaseTexture = null;
        }
    }

    private generateBlockCanvas(type: TetrominoType | 'G', skin: BlockSkin, size: number, colorblindMode: ColorblindMode, colorOverride?: string): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
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
        
        switch (skin) {
            case 'EMOJI':
                this.drawEmojiSkin(ctx, size, color, type);
                break;
            case 'RETRO':
                this.drawRetroSkin(ctx, size, color);
                break;
            case 'GELATIN':
                this.drawGelatinSkin(ctx, size, color);
                break;
            case 'MINIMAL':
                this.drawMinimalSkin(ctx, size, color);
                break;
            case 'CYBER':
                this.drawCyberSkin(ctx, size, color);
                break;
            case 'NEON':
            default:
                this.drawStandardSkin(ctx, size, color, type);
                break;
        }
        
        ctx.restore();
        return canvas;
    }

    private drawEmojiSkin(ctx: CanvasRenderingContext2D, size: number, color: string, type: TetrominoType | 'G') {
        const emoji = EMOJI_MAP[type as string] || '🟩';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, size, size);
        ctx.globalAlpha = 1.0;
        ctx.font = `${size * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, size, size);
    }

    private drawRetroSkin(ctx: CanvasRenderingContext2D, size: number, color: string) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(0, 0, size, size * 0.15); 
        ctx.fillRect(0, 0, size * 0.15, size); 
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, size * 0.85, size, size * 0.15); 
        ctx.fillRect(size * 0.85, 0, size * 0.15, size); 
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        const inner = size * 0.25;
        ctx.fillRect(inner, inner, size * 0.5, size * 0.5);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, size * 0.05);
        ctx.strokeRect(0, 0, size, size);
    }

    private drawGelatinSkin(ctx: CanvasRenderingContext2D, size: number, color: string) {
        const r = size * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(1, 1, size - 2, size - 2, r);
        else ctx.rect(1, 1, size - 2, size - 2);
        ctx.fill();
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, 'rgba(255,255,255,0.7)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(1, 1, size - 2, size - 2, r);
        else ctx.rect(1, 1, size - 2, size - 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.ellipse(size * 0.25, size * 0.25, size * 0.15, size * 0.1, -0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        if (ctx.roundRect) ctx.stroke();
    }

    private drawMinimalSkin(ctx: CanvasRenderingContext2D, size: number, color: string) {
        ctx.fillStyle = color;
        ctx.fillRect(1, 1, size - 2, size - 2);
    }

    private drawCyberSkin(ctx: CanvasRenderingContext2D, size: number, color: string) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, size * 0.08);
        ctx.strokeRect(1, 1, size - 2, size - 2);
        ctx.fillStyle = color;
        const center = size / 2;
        const dot = size * 0.2;
        ctx.fillRect(center - dot, center - dot, dot * 2, dot * 2);
        const len = size * 0.25;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, len); ctx.lineTo(len, 0);
        ctx.moveTo(size, size-len); ctx.lineTo(size-len, size);
        ctx.stroke();
    }

    private drawStandardSkin(ctx: CanvasRenderingContext2D, size: number, color: string, type: TetrominoType | 'G') {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size, size);
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
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
    }
}
