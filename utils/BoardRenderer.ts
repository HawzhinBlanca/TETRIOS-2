
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
    private effectsContainer: PIXI.Container;
    private spriteManager: SpriteManager;
    private config: RenderConfig;
    
    private cellSprites: PIXI.Sprite[][] = [];
    private lastRenderedRevision: number = -1;
    private lastGridDims: { w: number, h: number } = { w: 0, h: 0 };
    
    private activePiecePool: PIXI.Sprite[] = [];
    private readonly POOL_SIZE = 16;
    private poolIndex: number = 0;

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
        this.activePieceContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container();
        
        this.container.addChild(this.boardContainer);
        this.container.addChild(this.activePieceContainer);
        this.container.addChild(this.effectsContainer); 
        this.app.stage.addChild(this.container);

        // Initialize Pool
        for(let i=0; i<this.POOL_SIZE; i++) {
            const s = new PIXI.Sprite();
            s.visible = false;
            this.activePieceContainer.addChild(s);
            this.activePiecePool.push(s);
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

        // Clear existing sprites
        this.boardContainer.removeChildren();
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

    private configureSprite(x: number, y: number, texture: PIXI.Texture, alpha: number = 1.0, tint: number = 0xffffff) {
        if (this.poolIndex >= this.POOL_SIZE) return;
        const sprite = this.activePiecePool[this.poolIndex++];
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
        const { cellSize, blockSkin, colorblindMode, isZoneActive } = this.config;

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

        // Active Piece Rendering
        this.activePiecePool.forEach(s => s.visible = false);
        this.poolIndex = 0;

        const { pos, tetromino } = player;
        const ghostY = player.ghostY !== undefined ? player.ghostY : pos.y;
        
        const shape = tetromino.shape;
        const texture = this.spriteManager.getBlockTexture(tetromino.type, blockSkin, cellSize, colorblindMode);

        for(let y = 0; y < shape.length; y++) {
            for(let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    
                    // 1. Render Ghost
                    if (ghostY !== pos.y) {
                        const ghostAlpha = this.config.ghostOpacity * (this.config.ghostStyle === 'dashed' ? 0.5 : 1.0);
                        this.configureSprite(pos.x + x, ghostY + y, texture, ghostAlpha, 0xffffff);
                    }

                    // 2. Render Active Piece
                    let tint = 0xffffff;
                    if (this.config.lockWarningEnabled && this.config.pieceIsGrounded) {
                        tint = (Date.now() % 200) < 100 ? 0xffffff : 0xffcccc;
                    }
                    this.configureSprite(pos.x + x, pos.y + y, texture, 1.0, tint);
                }
            }
        }
    }

    private updateEffects() {
        // Placeholder for particle updates if implemented directly in Pixi
    }

    public spawnParticle(x: number, y: number, color: string, amount: number, type: string) {
        // Implementation for spawning particles (visual only)
    }

    public spawnShockwave(x: number, y: number, color?: string) {
        // Visual effect
    }

    public addBeam(x: number, y1: number, y2: number, color: string) {
        // Visual effect
    }

    public addClearingRows(rows: number[], color?: string, isOnBeat?: boolean) {
        // Visual effect
    }
}
