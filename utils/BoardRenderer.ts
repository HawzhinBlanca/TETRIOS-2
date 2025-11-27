
import * as PIXI from 'pixi.js';
import { GameCore } from './GameCore';
import { BoardRenderConfig, TetrominoType } from '../types';
import { SpriteManager } from './SpriteManager';
import { STAGE_WIDTH, STAGE_HEIGHT, COLORS } from '../constants';
import { getPieceColor } from './themeUtils';

export interface RenderConfig extends BoardRenderConfig {
    // Extended config if needed
}

export class BoardRenderer {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private gridGraphics: PIXI.Graphics;
    private ghostGraphics: PIXI.Graphics;
    private activePieceContainer: PIXI.Container;
    private boardContainer: PIXI.Container;
    private effectsContainer: PIXI.Container;
    
    private spriteManager: SpriteManager;
    public config: RenderConfig;
    private isDestroyed: boolean = false;
    
    private particles: { 
        x: number; y: number; vx: number; vy: number; life: number; 
        color: string; alpha: number; scale: number; type: string 
    }[] = [];
    
    private beams: { x: number; startY: number; endY: number; life: number; color: string }[] = [];
    private shockwaves: { x: number; y: number; life: number; size: number }[] = [];
    private clearingRows: { y: number; life: number }[] = [];

    constructor(canvas: HTMLCanvasElement, config: RenderConfig) {
        this.config = config;
        this.isDestroyed = false;
        
        this.app = new PIXI.Application({
            view: canvas,
            width: 300,
            height: 600,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        this.spriteManager = new SpriteManager();

        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        this.gridGraphics = new PIXI.Graphics();
        this.container.addChild(this.gridGraphics);

        this.boardContainer = new PIXI.Container();
        this.container.addChild(this.boardContainer);

        this.ghostGraphics = new PIXI.Graphics();
        this.container.addChild(this.ghostGraphics);

        this.activePieceContainer = new PIXI.Container();
        this.container.addChild(this.activePieceContainer);

        this.effectsContainer = new PIXI.Container();
        this.container.addChild(this.effectsContainer);
    }

    public updateConfig(newConfig: RenderConfig) {
        if (this.isDestroyed) return;
        this.config = { ...this.config, ...newConfig };
    }

    public setSize(width: number, height: number, resolution: number) {
        if (this.isDestroyed || !this.app.renderer) return;
        this.app.renderer.resize(width, height);
        this.app.renderer.resolution = resolution;
    }

    public destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        
        // Clean up sprites
        this.container.destroy({ children: true });
        
        // Destroy app but keep canvas (React handles the DOM element)
        this.app.destroy(false, { children: true });
        
        // Clear references
        this.spriteManager.clearCache();
    }

    public render(core: GameCore) {
        if (this.isDestroyed || !this.app.renderer) return;

        this.gridGraphics.clear();
        this.ghostGraphics.clear();
        this.activePieceContainer.removeChildren();
        this.boardContainer.removeChildren();
        
        const { cellSize } = this.config;

        // Draw Grid Background
        this.gridGraphics.lineStyle(1, 0xffffff, 0.05);
        for (let x = 0; x <= core.grid.width; x++) {
            this.gridGraphics.moveTo(x * cellSize, 0);
            this.gridGraphics.lineTo(x * cellSize, core.grid.height * cellSize);
        }
        for (let y = 0; y <= core.grid.height; y++) {
            this.gridGraphics.moveTo(0, y * cellSize);
            this.gridGraphics.lineTo(core.grid.width * cellSize, y * cellSize);
        }

        // Draw Board
        const stage = core.boardManager.stage;
        const width = core.grid.width;
        const height = core.grid.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = stage[y][x];
                if (cell[1] !== 'clear') {
                    const type = cell[0] as TetrominoType | 'G';
                    const colorOverride = cell[3];
                    const texture = this.spriteManager.getBlockTexture(
                        type, 
                        this.config.blockSkin, 
                        cellSize, 
                        this.config.colorblindMode, 
                        colorOverride
                    );
                    
                    const sprite = new PIXI.Sprite(texture);
                    sprite.x = x * cellSize;
                    sprite.y = y * cellSize;
                    sprite.width = cellSize;
                    sprite.height = cellSize;
                    
                    if (cell[2]) {
                        sprite.tint = 0xdddddd;
                    }
                    
                    this.boardContainer.addChild(sprite);
                }
            }
        }

        // Draw Active Piece
        const { player } = core.pieceManager;
        if (player && player.tetromino) {
            const { shape, type } = player.tetromino;
            const texture = this.spriteManager.getBlockTexture(type, this.config.blockSkin, cellSize, this.config.colorblindMode, player.colorOverride);
            const pieceColor = player.colorOverride || getPieceColor(type, this.config.colorblindMode);

            shape.forEach((row, dy) => {
                row.forEach((value, dx) => {
                    if (value !== 0) {
                        const px = (player.pos.x + dx) * cellSize;
                        const py = (player.pos.y + dy) * cellSize;
                        
                        const sprite = new PIXI.Sprite(texture);
                        sprite.x = px;
                        sprite.y = py;
                        sprite.width = cellSize;
                        sprite.height = cellSize;
                        this.activePieceContainer.addChild(sprite);
                    }
                });
            });

            // Draw Ghost
            if (player.ghostY !== undefined) {
                const hexColor = PIXI.utils.string2hex(pieceColor);
                shape.forEach((row, dy) => {
                    row.forEach((value, dx) => {
                        if (value !== 0) {
                            const gx = player.pos.x + dx;
                            const gy = player.ghostY! + dy;
                            this.drawGhostBlock(gx, gy, cellSize, hexColor);
                        }
                    });
                });
            }
        }

        // Draw Effects
        this.updateEffects(cellSize);
    }

    private drawGhostBlock(x: number, y: number, size: number, color: number) {
        const g = this.ghostGraphics;
        const { ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity } = this.config;
        const alpha = ghostOpacity;
        const glow = ghostGlowIntensity !== undefined ? ghostGlowIntensity : 1;
        
        if (alpha <= 0) return;

        const thickness = ghostOutlineThickness || 2;

        if (ghostStyle === 'dashed') {
            g.lineStyle(thickness, color, alpha * 0.8);
            g.beginFill(color, alpha * 0.1 * glow);
            g.drawRect(x * size, y * size, size, size);
            g.endFill();
        } 
        else if (ghostStyle === 'solid') {
            g.lineStyle(thickness, color, Math.min(1, alpha + 0.2));
            g.beginFill(color, Math.min(1, alpha * 0.4 * glow));
            g.drawRect(x * size, y * size, size, size);
            g.endFill();
        } 
        else { 
            // Neon / Default
            // Standard outline
            const baseAlpha = Math.min(1, (alpha + 0.3) * (glow < 1 ? glow : 1));
            g.lineStyle(thickness, color, baseAlpha);
            g.beginFill(color, alpha * 0.1);
            g.drawRect(x * size, y * size, size, size);
            g.endFill();

            // Glow Bloom effect (only if intensity > 1 for performance)
            if (glow > 1) {
                const bloomAlpha = alpha * 0.15 * (glow - 1);
                const bloomThickness = thickness + 4;
                g.lineStyle(bloomThickness, color, bloomAlpha);
                g.drawRect(x * size, y * size, size, size);
            }
        }
    }

    private updateEffects(cellSize: number) {
        this.effectsContainer.removeChildren();

        // Update & Draw Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= 0.02;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // Gravity
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            const pSprite = new PIXI.Sprite(this.spriteManager.getParticleTexture(p.type === 'burst' ? 'circle' : 'rect'));
            pSprite.x = p.x;
            pSprite.y = p.y;
            pSprite.tint = PIXI.utils.string2hex(p.color);
            pSprite.alpha = p.alpha * p.life;
            pSprite.scale.set(p.scale * p.life);
            this.effectsContainer.addChild(pSprite);
        }

        // Draw Beams
        const beamG = new PIXI.Graphics();
        this.effectsContainer.addChild(beamG);
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const b = this.beams[i];
            b.life -= 0.05;
            if (b.life <= 0) {
                this.beams.splice(i, 1);
                continue;
            }
            const width = cellSize;
            const x = b.x * cellSize;
            const y1 = b.startY * cellSize;
            const y2 = b.endY * cellSize;
            const h = Math.abs(y2 - y1) || cellSize;
            const color = PIXI.utils.string2hex(b.color);
            
            beamG.beginFill(color, b.life * 0.5);
            beamG.drawRect(x, Math.min(y1, y2), width, h);
            beamG.endFill();
        }

        // Draw Shockwaves
        const shockG = new PIXI.Graphics();
        this.effectsContainer.addChild(shockG);
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.life -= 0.03;
            s.size += 5;
            if (s.life <= 0) {
                this.shockwaves.splice(i, 1);
                continue;
            }
            shockG.lineStyle(2 * s.life, 0xffffff, s.life);
            shockG.drawCircle(s.x, s.y, s.size);
        }
    }

    public spawnParticle(x: number, y: number, color: string, amount: number, type: string) {
        if (this.isDestroyed) return;
        for (let i = 0; i < amount; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color,
                alpha: 1,
                scale: 0.5 + Math.random() * 0.5,
                type
            });
        }
    }

    public addBeam(x: number, startY: number, endY: number, color: string) {
        if (this.isDestroyed) return;
        this.beams.push({ x, startY, endY, color, life: 1.0 });
    }

    public spawnShockwave(x: number, y: number) {
        if (this.isDestroyed) return;
        this.shockwaves.push({ x, y, life: 1.0, size: 10 });
    }

    public addClearingRows(rows: number[]) {
        if (this.isDestroyed) return;
        rows.forEach(y => this.clearingRows.push({ y, life: 1.0 }));
    }
}
