
import * as PIXI from 'pixi.js';
import { MODIFIER_COLORS } from '../constants';
import { BoardRenderConfig, Board, CellModifier, TetrominoType, ColorblindMode } from '../types';
import { GameCore } from './GameCore';
import { SpriteManager } from './SpriteManager';
import { audioManager } from './audioManager';
import { getPieceColor } from './themeUtils';

export type RenderConfig = BoardRenderConfig;

interface BeamEffect {
    x: number;
    startY: number;
    endY: number;
    color: string;
    life: number;
}

interface Particle {
    sprite: PIXI.Sprite;
    vx: number;
    vy: number;
    life: number;
    decay: number;
    active: boolean;
    gravity: number;
    scaleSpeed?: number;
}

// Linear Interpolation Helper
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export class BoardRenderer {
    private app: PIXI.Application;
    private config: RenderConfig;
    private spriteManager: SpriteManager;
    
    // Pixi Containers
    private backgroundContainer: PIXI.Container;
    private mainContainer: PIXI.Container;
    private gridGraphics: PIXI.Graphics;
    private blockContainer: PIXI.Container; 
    private ghostContainer: PIXI.Container; 
    private activePieceContainer: PIXI.Container; 
    private effectContainer: PIXI.Container; 
    private particleContainer: PIXI.Container; 
    
    private modifierGraphics: PIXI.Graphics;
    
    // Object Pools
    private spritePool: PIXI.Sprite[] = [];
    private poolIndex: number = 0;
    
    private particles: Particle[] = [];
    private readonly MAX_PARTICLES = 1500;

    // Background Grid
    private bgGridGraphics: PIXI.Graphics;
    private bgOffset: number = 0;

    // Shaders
    // Disabled for stability
    
    private beams: BeamEffect[] = [];

    // Interpolation State
    private renderX: number = 0;
    private renderY: number = 0;
    private lastLogicX: number = 0;
    private lastLogicY: number = 0;
    
    constructor(canvas: HTMLCanvasElement, config: RenderConfig) {
        this.config = config;
        this.spriteManager = new SpriteManager();

        this.app = new PIXI.Application({
            view: canvas,
            width: 300,
            height: 600,
            backgroundAlpha: 0,
            antialias: false, 
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
            powerPreference: 'high-performance'
        });

        this.backgroundContainer = new PIXI.Container();
        this.app.stage.addChild(this.backgroundContainer);
        
        this.bgGridGraphics = new PIXI.Graphics();
        this.backgroundContainer.addChild(this.bgGridGraphics);

        this.mainContainer = new PIXI.Container();
        this.mainContainer.sortableChildren = false; 
        this.app.stage.addChild(this.mainContainer);

        this.gridGraphics = new PIXI.Graphics();
        
        this.ghostContainer = new PIXI.Container();
        this.blockContainer = new PIXI.Container();
        this.activePieceContainer = new PIXI.Container();
        this.particleContainer = new PIXI.Container();
        
        this.effectContainer = new PIXI.Container();
        this.modifierGraphics = new PIXI.Graphics();
        this.effectContainer.addChild(this.modifierGraphics);

        this.mainContainer.addChild(this.gridGraphics);
        this.mainContainer.addChild(this.ghostContainer);
        this.mainContainer.addChild(this.blockContainer);
        this.mainContainer.addChild(this.effectContainer); // Moved below active piece so guide lines are behind
        this.mainContainer.addChild(this.activePieceContainer);
        this.mainContainer.addChild(this.particleContainer);

        this.initParticles();
    }

    private parseColor(color: string | undefined | null): number {
        if (!color || typeof color !== 'string') return 0xFFFFFF;
        
        try {
            if (color.startsWith('#')) {
                // Hex string '#RRGGBB'
                return parseInt(color.replace('#', ''), 16) || 0xFFFFFF;
            }
            if (color.startsWith('rgb')) {
                // RGB string 'rgb(r, g, b)'
                const match = color.match(/\d+/g);
                if (match && match.length >= 3) {
                    return (parseInt(match[0]) << 16) + (parseInt(match[1]) << 8) + parseInt(match[2]);
                }
            }
        } catch (e) {
            console.warn("Invalid color string:", color);
            return 0xFFFFFF;
        }
        return 0xFFFFFF;
    }

    private initParticles() {
        const particleTexture = this.spriteManager.getParticleTexture('rect');
        
        for(let i = 0; i < this.MAX_PARTICLES; i++) {
            const sprite = new PIXI.Sprite(particleTexture);
            sprite.visible = false;
            sprite.anchor.set(0.5);
            this.particleContainer.addChild(sprite);
            
            this.particles.push({
                sprite, 
                vx: 0, vy: 0, 
                life: 0, decay: 0, 
                active: false, 
                gravity: 0
            });
        }
    }

    public spawnParticle(x: number, y: number, color: string, count: number = 10, type: 'burst' | 'flow' | 'explosion' = 'burst') {
        let spawned = 0;
        const safeColor = color || '#ffffff';
        const hexColor = this.parseColor(safeColor);
        const texture = this.spriteManager.getParticleTexture(type === 'flow' ? 'rect' : 'circle');
        
        for(let i = 0; i < this.MAX_PARTICLES && spawned < count; i++) {
            const p = this.particles[i];
            if(!p.active) {
                p.active = true;
                p.sprite.visible = true;
                p.sprite.texture = texture;
                
                p.sprite.x = x;
                p.sprite.y = y;
                p.sprite.tint = hexColor;
                p.sprite.alpha = 1;
                p.sprite.rotation = Math.random() * Math.PI * 2;
                
                if (type === 'burst') {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 4 + 1;
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed;
                    p.life = 0.8;
                    p.decay = 0.03;
                    p.gravity = 0.2;
                    p.sprite.scale.set(Math.random() * 0.5 + 0.2);
                    p.scaleSpeed = -0.01;
                } else if (type === 'explosion') {
                    p.vx = (Math.random() - 0.5) * 20;
                    p.vy = (Math.random() - 0.5) * 15;
                    p.life = 1.0;
                    p.decay = 0.02;
                    p.gravity = 0.3; // More gravity for juice
                    const s = Math.random() * 0.8 + 0.4;
                    p.sprite.scale.set(s);
                    p.scaleSpeed = -0.02;
                } else {
                    p.vx = (Math.random() - 0.5) * 1;
                    p.vy = -Math.random() * 3 - 1;
                    p.life = 0.6;
                    p.decay = 0.05;
                    p.gravity = 0; 
                    p.sprite.scale.set(0.3);
                    p.scaleSpeed = 0;
                }
                spawned++;
            }
        }
    }

    public spawnShockwave(x: number, y: number) {
        // Handled via particle burst for now
    }

    private updateParticles() {
        const floorY = this.app.screen.height;
        for(let i = 0; i < this.MAX_PARTICLES; i++) {
            const p = this.particles[i];
            if (p.active) {
                p.sprite.x += p.vx;
                p.sprite.y += p.vy;
                p.vy += p.gravity;
                p.life -= p.decay;
                
                if (p.scaleSpeed) {
                    p.sprite.scale.x += p.scaleSpeed;
                    p.sprite.scale.y += p.scaleSpeed;
                    if (p.sprite.scale.x < 0) p.life = 0;
                }

                // Physics Bounce
                if (p.sprite.y > floorY) {
                    p.sprite.y = floorY;
                    p.vy *= -0.6; // Dampened bounce
                    p.vx *= 0.9; // Friction
                }
                
                p.sprite.alpha = p.life;
                
                if (p.life <= 0) {
                    p.active = false;
                    p.sprite.visible = false;
                }
            }
        }
    }

    public setSize(width: number, height: number, dpr: number) {
        if (width <= 0 || height <= 0) return;
        this.app.renderer.resize(width, height);
        this.mainContainer.position.set(0,0);
    }

    public updateConfig(config: RenderConfig) {
        if (config.blockSkin !== this.config.blockSkin || config.colorblindMode !== this.config.colorblindMode) {
            this.spriteManager.clearCache();
        }
        this.config = config;
    }

    public addBeam(x: number, startY: number, endY: number, color: string) {
        this.beams.push({ x, startY, endY, color, life: 1.0 });
    }

    public addClearingRows(rows: number[]) {
        // Shader removed
    }

    private getPooledSprite(texture: PIXI.Texture, container: PIXI.Container): PIXI.Sprite {
        let sprite: PIXI.Sprite;
        if (this.poolIndex < this.spritePool.length) {
            sprite = this.spritePool[this.poolIndex];
            if (sprite.parent !== container) {
                container.addChild(sprite);
            }
        } else {
            sprite = new PIXI.Sprite(texture);
            container.addChild(sprite);
            this.spritePool.push(sprite);
        }
        
        sprite.texture = texture;
        sprite.visible = true;
        sprite.alpha = 1;
        sprite.tint = 0xFFFFFF;
        sprite.scale.set(1);
        sprite.rotation = 0;
        
        this.poolIndex++;
        return sprite;
    }

    public render(engine: GameCore) {
        this.poolIndex = 0;
        
        this.gridGraphics.clear();
        this.bgGridGraphics.clear();
        this.modifierGraphics.clear(); 
        
        const { cellSize, flippedGravity, colorblindMode } = this.config;
        
        // Guard against invalid cell size
        if (cellSize <= 0) return;

        this.updateParticles();

        this.renderBackground(cellSize, engine.speedMultiplier);
        this.renderGrid(cellSize, engine.grid.width, engine.grid.height);
        
        this.renderBoard(engine.boardManager.stage, cellSize, colorblindMode); 
        this.renderDynamic(engine, cellSize, colorblindMode); 
        
        this.renderEffects(cellSize, engine.grid.height);

        for (let i = this.poolIndex; i < this.spritePool.length; i++) {
            this.spritePool[i].visible = false;
        }
    }

    private renderBackground(cellSize: number, speedMultiplier: number) {
        const g = this.bgGridGraphics;
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        const pulse = audioManager.getPulseFactor();
        
        this.bgOffset += (1.5 * speedMultiplier) + (pulse * 2); // Jump on beat
        if (this.bgOffset > h) this.bgOffset = 0;

        g.lineStyle(1, 0x06b6d4, 0.05 + (pulse * 0.05));
        const lineCount = 10;
        if (lineCount > 0 && h > 0) {
            for(let i=0; i<lineCount; i++) {
                const y = ((this.bgOffset + (i * (h/lineCount))) % h);
                g.moveTo(0, y);
                g.lineTo(w, y);
            }
        }
    }

    private renderGrid(cellSize: number, cols: number, rows: number) {
        const g = this.gridGraphics;
        const width = cols * cellSize;
        const height = rows * cellSize;
        const pulse = audioManager.getPulseFactor();

        g.beginFill(0xffffff, 0.01); 
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if ((x + y) % 2 === 1) {
                    g.drawRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
        g.endFill();

        // Grid lines breathe with audio
        g.lineStyle(1, 0xffffff, 0.04 + (pulse * 0.04)); 
        
        for (let x = 0; x <= cols; x++) {
            g.moveTo(x * cellSize, 0);
            g.lineTo(x * cellSize, height);
        }

        for (let y = 0; y <= rows; y++) {
            g.moveTo(0, y * cellSize);
            g.lineTo(width, y * cellSize);
        }
        
        // Animated Border
        const borderColor = 0x06b6d4;
        g.lineStyle(2, borderColor, 0.3 + (pulse * 0.3));
        g.drawRect(0, 0, width, height);
    }

    private renderBoard(stage: Board, cellSize: number, colorblindMode: ColorblindMode) {
        const height = stage.length;
        if (height === 0) return;
        const width = stage[0].length;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = stage[y][x];
                if (!cell) continue;
                
                const type = cell[0];
                const modifier = cell[2];
                const drawY = this.config.flippedGravity ? height - 1 - y : y;

                if (type) {
                    this.drawBlock(x, drawY, cellSize, type, this.blockContainer, colorblindMode, cell[3]);
                } else if (modifier) {
                    this.drawModifier(x, drawY, cellSize, modifier);
                }
            }
        }
    }

    private drawBlock(x: number, y: number, size: number, type: TetrominoType | 'G', container: PIXI.Container, colorblindMode: ColorblindMode, colorOverride?: string) {
        const { blockSkin } = this.config;
        const texture = this.spriteManager.getBlockTexture(type, blockSkin, size, colorblindMode, colorOverride);
        const sprite = this.getPooledSprite(texture, container);
        
        sprite.x = x * size;
        sprite.y = y * size;
        sprite.width = size;
        sprite.height = size;
    }

    private drawModifier(x: number, y: number, size: number, modifier: CellModifier) {
        const g = this.modifierGraphics;
        const colorStr = MODIFIER_COLORS[modifier.type] || '#fff';
        const color = this.parseColor(colorStr);

        g.lineStyle(2, color, 1);
        g.drawRect(x * size + 2, y * size + 2, size - 4, size - 4);
        
        g.beginFill(color, 0.2);
        g.drawRect(x * size + 4, y * size + 4, size - 8, size - 8);
        g.endFill();
    }

    private renderDynamic(engine: GameCore, cellSize: number, colorblindMode: ColorblindMode) {
        const player = engine.pieceManager.player;
        const { flippedGravity } = this.config;
        const ghostY = player.ghostY !== undefined ? player.ghostY : player.pos.y; 
        const shape = player.tetromino.shape;
        const boardHeight = engine.grid.height;
        
        // --- Visual Interpolation (Butter Smooth) ---
        // Calculate target logic coordinates in pixels
        const targetX = player.pos.x * cellSize;
        const targetY = player.pos.y * cellSize;

        // Handle reset/teleport cases instantly
        if (Math.abs(targetX - this.lastLogicX) > cellSize * 2 || Math.abs(targetY - this.lastLogicY) > cellSize * 2) {
            this.renderX = targetX;
            this.renderY = targetY;
        }

        // Smoothly lerp render position towards target logic position
        const LERP_FACTOR = 0.4; 
        this.renderX = lerp(this.renderX, targetX, LERP_FACTOR);
        this.renderY = lerp(this.renderY, targetY, LERP_FACTOR);

        // Snap if very close to avoid micro-jitter
        if (Math.abs(this.renderX - targetX) < 0.5) this.renderX = targetX;
        if (Math.abs(this.renderY - targetY) < 0.5) this.renderY = targetY;

        this.lastLogicX = targetX;
        this.lastLogicY = targetY;

        // Update container
        if (shape.length > 0 && shape[0].length > 0) {
             const piecePixelWidth = shape[0].length * cellSize;
             const piecePixelHeight = shape.length * cellSize;
             
             // Use local center for pivot to rotate around piece center
             const halfW = piecePixelWidth / 2;
             const halfH = piecePixelHeight / 2;
             
             // Position: Place container where the piece should be on screen
             // We add halfW/halfH because the container's visual center (pivot) needs to be at this screen location
             const screenX = this.renderX + halfW;
             const screenY = this.renderY + halfH;
             
             this.activePieceContainer.position.set(screenX, screenY);
             this.activePieceContainer.pivot.set(halfW, halfH);
        } else {
             this.activePieceContainer.setTransform(0,0,1,1,0,0,0,0,0);
        }

        const activeColor = player.colorOverride || getPieceColor(player.tetromino.type, colorblindMode);
        const activeHex = this.parseColor(activeColor);

        const texture = this.spriteManager.getBlockTexture(player.tetromino.type, this.config.blockSkin, cellSize, colorblindMode, player.colorOverride);
        const whiteTex = this.spriteManager.getParticleTexture('rect');

        // --- Lock Down Warning ---
        let tint = 0xFFFFFF;
        if (engine.pieceManager.isLocking) {
            const flash = Math.floor(Date.now() / 50) % 2 === 0; // Fast flash
            if (flash) tint = 0xFFBBBB; // Slight red tint
        }

        shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) {
                    const px = x * cellSize;
                    const py = y * cellSize;

                    // Ghost
                    const gy = flippedGravity ? boardHeight - 1 - (ghostY + y) : (ghostY + y);
                    const gSprite = this.getPooledSprite(whiteTex, this.ghostContainer);
                    gSprite.tint = activeHex;
                    gSprite.alpha = 0.15 + (audioManager.getPulseFactor() * 0.1);
                    gSprite.width = cellSize;
                    gSprite.height = cellSize;
                    gSprite.x = (player.pos.x + x) * cellSize;
                    gSprite.y = gy * cellSize;

                    // Ghost Guide Line (Laser)
                    const guideG = this.modifierGraphics;
                    guideG.lineStyle(1, activeHex, 0.2);
                    
                    // Draw from active block center to ghost block center
                    // Use renderX/Y for smooth interpolation
                    guideG.moveTo(this.renderX + px + cellSize/2, this.renderY + py + cellSize/2); 
                    guideG.lineTo(gSprite.x + cellSize/2, gSprite.y + cellSize/2);

                    // Active Piece Sprite
                    // Drawn relative to container 0,0 (which is top-left of the piece)
                    const activeSprite = this.getPooledSprite(texture, this.activePieceContainer);
                    activeSprite.x = px;
                    activeSprite.y = py;
                    activeSprite.width = cellSize;
                    activeSprite.height = cellSize;
                    activeSprite.tint = tint;
                }
            });
        });
        
        if (this.config.showAi && this.config.aiHint) {
            const hint = this.config.aiHint;
            const g = this.modifierGraphics; 
            g.lineStyle(2, 0xFFD700, 0.8);
            const drawY = flippedGravity ? boardHeight - 1 - hint.y! : hint.y!;
            const width = hint.type === 'I' ? 4 : (hint.type === 'O' ? 2 : 3);
            const height = hint.type === 'I' ? 1 : 2;
            g.drawRect(hint.x * cellSize, drawY * cellSize, width * cellSize, height * cellSize);
        }
    }

    private renderEffects(cellSize: number, boardHeight: number) {
        const g = this.modifierGraphics;
        this.beams = this.beams.filter(beam => {
            beam.life -= 0.05;
            const alpha = beam.life;
            const color = this.parseColor(beam.color);
            g.beginFill(color, alpha * 0.5);
            const startY = this.config.flippedGravity ? boardHeight - 1 - beam.startY : beam.startY;
            const endY = this.config.flippedGravity ? boardHeight - 1 - beam.endY : beam.endY;
            
            const y = Math.min(startY, endY);
            const h = Math.abs(endY - startY) + 1;
            
            g.drawRect(beam.x * cellSize, y * cellSize, cellSize, h * cellSize);
            g.endFill();
            return beam.life > 0;
        });
    }
    
    public destroy() {
        try {
            // CRITICAL FIX: Pass `false` to avoid removing the Canvas element from DOM.
            // React handles the DOM node lifecycle. We just want to clean up WebGL context.
            this.app.destroy(false, { children: true, texture: true, baseTexture: true });
        } catch (e) {
            console.warn("Pixi destroy warning:", e);
        }
        this.spriteManager.clearCache();
    }
}
