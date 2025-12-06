
import * as PIXI from 'pixi.js';
import { GameCore } from './GameCore';
import { SpriteManager } from './SpriteManager';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { BlockSkin, ColorblindMode, TetrominoType } from '../types';

export interface RenderConfig {
    cellSize: number;
    ghostStyle: 'neon' | 'dashed' | 'solid';
    ghostOpacity: number;
    ghostOutlineThickness: number;
    ghostGlowIntensity: number;
    blockGlowIntensity: number;
    ghostShadow?: string;
    lockWarningEnabled: boolean;
    showAi: boolean;
    aiHint?: any;
    pieceIsGrounded: boolean;
    wildcardPieceAvailable: boolean;
    gimmicks?: any;
    flippedGravity: boolean;
    bombSelectionRows?: number[];
    lineClearerSelectedRow?: number | null;
    bombBoosterTarget?: any;
    colorblindMode: ColorblindMode;
    isZoneActive: boolean;
    zoneLines: number;
    missedOpportunity: any;
    blockSkin: BlockSkin;
}

export class BoardRenderer {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private boardContainer: PIXI.Container;
    private activePieceContainer: PIXI.Container;
    private aiGhostContainer: PIXI.Container; // New container for AI Ghost
    private effectsContainer: PIXI.Container;
    private spriteManager: SpriteManager;
    private config: RenderConfig;
    
    private cellSprites: PIXI.Sprite[][] = [];
    private lastRenderedRevision: number = -1;
    private lastGridDims: { w: number, h: number } = { w: 0, h: 0 };
    
    private activePiecePool: PIXI.Sprite[] = [];
    private aiGhostPool: PIXI.Sprite[] = []; // Pool for AI Ghost blocks
    private readonly POOL_SIZE = 16;
    private poolIndex: number = 0;
    private aiPoolIndex: number = 0;

    constructor(canvas: HTMLCanvasElement, config: RenderConfig) {
        this.config = config;
        this.app = new PIXI.Application({
            view: canvas,
            width: 300,
            height: 600,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
        });
        
        this.spriteManager = new SpriteManager();
        this.container = new PIXI.Container();
        this.boardContainer = new PIXI.Container();
        this.aiGhostContainer = new PIXI.Container(); // Render AI below active piece
        this.activePieceContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container();
        
        this.container.addChild(this.boardContainer);
        this.container.addChild(this.aiGhostContainer);
        this.container.addChild(this.activePieceContainer);
        this.container.addChild(this.effectsContainer); 
        this.app.stage.addChild(this.container);

        // Initialize Pools
        for(let i=0; i<this.POOL_SIZE; i++) {
            const s = new PIXI.Sprite();
            s.visible = false;
            this.activePieceContainer.addChild(s);
            this.activePiecePool.push(s);
            
            const g = new PIXI.Sprite();
            g.visible = false;
            this.aiGhostContainer.addChild(g);
            this.aiGhostPool.push(g);
        }
    }

    public updateConfig(config: RenderConfig) {
        this.config = config;
    }

    public setSize(width: number, height: number, dpr: number) {
        this.app.renderer.resize(width, height);
    }

    public destroy() {
        this.app.destroy(true, { children: true, texture: true, baseTexture: true });
        this.spriteManager.destroy();
    }

    private ensureSpriteGrid(width: number, height: number, cellSize: number) {
        if (this.lastGridDims.w === width && this.lastGridDims.h === height) return;

        // Clear existing sprites safely
        this.boardContainer.removeChildren().forEach(child => {
            child.destroy();
        });
        this.cellSprites = [];

        for (let y = 0; y < height; y++) {
            const row: PIXI.Sprite[] = [];
            for (let x = 0; x < width; x++) {
                const sprite = new PIXI.Sprite();
                sprite.x = x * cellSize;
                sprite.y = y * cellSize;
                sprite.width = cellSize;
                sprite.height = cellSize;
                sprite.visible = false;
                this.boardContainer.addChild(sprite);
                row.push(sprite);
            }
            this.cellSprites.push(row);
        }
        this.lastGridDims = { w: width, h: height };
        this.lastRenderedRevision = -1; // Force redraw
    }

    private configureSprite(pool: PIXI.Sprite[], index: number, x: number, y: number, texture: PIXI.Texture, alpha: number = 1.0, tint: number = 0xffffff) {
        if (index >= this.POOL_SIZE) return;
        const sprite = pool[index];
        sprite.texture = texture;
        sprite.x = x * this.config.cellSize;
        sprite.y = y * this.config.cellSize;
        sprite.width = this.config.cellSize;
        sprite.height = this.config.cellSize;
        sprite.alpha = alpha;
        sprite.tint = tint;
        sprite.visible = true;
    }

    public render(core: GameCore) {
        const state = core.state;
        if (!state) return;
        
        this.updateEffects();
        
        const board = state.board;
        const player = state.player;
        const { cellSize, blockSkin, colorblindMode, isZoneActive, showAi, aiHint } = this.config;

        const height = board.length || STAGE_HEIGHT;
        const width = board[0]?.length || STAGE_WIDTH;

        this.ensureSpriteGrid(width, height, cellSize);

        if (state.boardRevision !== this.lastRenderedRevision || this.lastRenderedRevision === -1) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const cell = board[y][x];
                    const sprite = this.cellSprites[y][x];
                    
                    if (!sprite) continue; 

                    if (cell[1] !== 'clear') {
                        const texture = this.spriteManager.getBlockTexture(cell[0] as any, blockSkin, cellSize, colorblindMode);
                        sprite.texture = texture;
                        sprite.visible = true;
                        
                        sprite.x = x * cellSize;
                        sprite.y = y * cellSize;
                        sprite.width = cellSize;
                        sprite.height = cellSize;
                        
                        if (isZoneActive && cell[1] === 'zoned') {
                            sprite.tint = 0xaaaaaa;
                        } else {
                            sprite.tint = 0xffffff;
                        }
                    } else {
                        sprite.visible = false;
                    }
                }
            }
            this.lastRenderedRevision = state.boardRevision;
        }

        // --- Active Piece & Ghosts ---
        this.activePiecePool.forEach(s => s.visible = false);
        this.aiGhostPool.forEach(s => s.visible = false);
        this.poolIndex = 0;
        this.aiPoolIndex = 0;

        const { pos, tetromino } = player;
        const ghostY = player.ghostY !== undefined ? player.ghostY : pos.y;
        
        const shape = tetromino.shape;
        const texture = this.spriteManager.getBlockTexture(tetromino.type, blockSkin, cellSize, colorblindMode);

        // 1. AI Ghost (Golden Guide)
        if (showAi && aiHint && aiHint.score > -999) {
            // We need to rotate the shape to match AI's rotation
            let aiShape = [...tetromino.shape];
            // Rotate shape 'r' times
            for(let i=0; i<aiHint.r; i++) {
                aiShape = aiShape[0].map((val, index) => aiShape.map(row => row[index]).reverse());
            }

            for(let y = 0; y < aiShape.length; y++) {
                for(let x = 0; x < aiShape[y].length; x++) {
                    if (aiShape[y][x] !== 0) {
                        // Gold Tint for AI Ghost
                        this.configureSprite(this.aiGhostPool, this.aiPoolIndex++, aiHint.x + x, aiHint.y + y, texture, 0.4, 0xFFD700);
                    }
                }
            }
        }

        // 2. Player Piece & Standard Ghost
        for(let y = 0; y < shape.length; y++) {
            for(let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    
                    // Render Ghost
                    if (ghostY !== pos.y) {
                        const ghostAlpha = this.config.ghostOpacity * (this.config.ghostStyle === 'dashed' ? 0.5 : 1.0);
                        this.configureSprite(this.activePiecePool, this.poolIndex++, pos.x + x, ghostY + y, texture, ghostAlpha, 0xffffff);
                    }

                    // Render Active Piece
                    let tint = 0xffffff;
                    if (this.config.lockWarningEnabled && this.config.pieceIsGrounded) {
                        tint = (Date.now() % 200) < 100 ? 0xffffff : 0xffcccc;
                    }
                    this.configureSprite(this.activePiecePool, this.poolIndex++, pos.x + x, pos.y + y, texture, 1.0, tint);
                }
            }
        }
    }

    private updateEffects() {
        // Update particles
        for(let i = this.effectsContainer.children.length - 1; i >= 0; i--) {
            const child = this.effectsContainer.children[i] as any;
            if (child.update) {
                const keep = child.update();
                if (!keep) {
                    this.effectsContainer.removeChild(child);
                    child.destroy();
                }
            }
        }
    }

    public spawnParticle(x: number, y: number, color: string, amount: number, type: string) {
        const texture = this.spriteManager.getParticleTexture('circle');
        const count = Math.min(amount, 20); // Cap per event
        const colorNum = parseInt(color.replace('#', '0x'));

        for (let i = 0; i < count; i++) {
            const p = new PIXI.Sprite(texture) as any;
            p.x = x;
            p.y = y;
            p.tint = colorNum;
            p.anchor.set(0.5);
            p.scale.set(Math.random() * 0.5 + 0.2);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 1.0;
            
            p.update = () => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.2; // Gravity
                p.life -= 0.05;
                p.alpha = p.life;
                p.scale.x *= 0.95;
                p.scale.y *= 0.95;
                return p.life > 0;
            };
            
            this.effectsContainer.addChild(p);
        }
    }

    public spawnShockwave(x: number, y: number, color: string = '#ffffff') {
        const texture = this.spriteManager.getParticleTexture('circle');
        const wave = new PIXI.Sprite(texture) as any;
        wave.x = x;
        wave.y = y;
        wave.tint = parseInt(color.replace('#', '0x'));
        wave.anchor.set(0.5);
        wave.scale.set(0);
        wave.alpha = 0.8;
        
        wave.update = () => {
            wave.scale.x += 0.5;
            wave.scale.y += 0.5;
            wave.alpha -= 0.05;
            return wave.alpha > 0;
        };
        
        this.effectsContainer.addChild(wave);
    }

    public addBeam(x: number, y1: number, y2: number, color: string) {
        const g = new PIXI.Graphics() as any;
        g.beginFill(parseInt(color.replace('#', '0x')));
        g.drawRect(x * this.config.cellSize, y1 * this.config.cellSize, this.config.cellSize, (y2 - y1) * this.config.cellSize);
        g.endFill();
        g.alpha = 0.8;
        
        g.update = () => {
            g.alpha -= 0.1;
            g.scale.x *= 0.9; // Narrow down
            g.x += (this.config.cellSize * (1 - g.scale.x)) / 2; // Keep centered
            return g.alpha > 0;
        }
        this.effectsContainer.addChild(g);
    }

    public addClearingRows(rows: number[], color: string = '#ffffff', isOnBeat: boolean = false) {
        // Handled by particles primarily
    }
}
