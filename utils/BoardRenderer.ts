
import * as PIXI from 'pixi.js';
import { STAGE_WIDTH, STAGE_HEIGHT, COLORS, MODIFIER_COLORS } from '../constants';
import { BoardRenderConfig, Player, Board, CellModifier, TetrominoType, MoveScore, BlockSkin, CellState } from '../types';
import { GameCore } from './GameCore';
import { VISUAL_THEME } from './visualTheme';
import { SpriteManager } from './SpriteManager';
import { audioManager } from './audioManager';

export type RenderConfig = BoardRenderConfig;

interface BeamEffect {
    x: number;
    startY: number;
    endY: number;
    color: string;
    life: number;
}

export class BoardRenderer {
    private app: PIXI.Application;
    private config: RenderConfig;
    private spriteManager: SpriteManager;
    
    // Pixi Containers
    private backgroundContainer: PIXI.Container;
    private mainContainer: PIXI.Container;
    private gridGraphics: PIXI.Graphics;
    private blockContainer: PIXI.Container;
    private effectContainer: PIXI.Container;
    private uiContainer: PIXI.Container;

    // Background Grid Elements
    private bgGridGraphics: PIXI.Graphics;
    private bgOffset: number = 0;

    // Glitch Shader Uniforms
    private glitchFilter: PIXI.Filter | null = null;
    
    private beams: BeamEffect[] = [];
    
    constructor(canvas: HTMLCanvasElement, config: RenderConfig) {
        this.config = config;
        this.spriteManager = new SpriteManager();

        this.app = new PIXI.Application({
            view: canvas,
            width: STAGE_WIDTH * config.cellSize,
            height: STAGE_HEIGHT * config.cellSize,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1
        });

        // New Background Layer (Behind main content)
        this.backgroundContainer = new PIXI.Container();
        this.app.stage.addChild(this.backgroundContainer);
        
        this.bgGridGraphics = new PIXI.Graphics();
        this.backgroundContainer.addChild(this.bgGridGraphics);

        this.mainContainer = new PIXI.Container();
        this.app.stage.addChild(this.mainContainer);

        // Layers
        this.gridGraphics = new PIXI.Graphics();
        this.blockContainer = new PIXI.Container();
        this.effectContainer = new PIXI.Container();
        this.uiContainer = new PIXI.Container(); 

        this.mainContainer.addChild(this.gridGraphics);
        this.mainContainer.addChild(this.blockContainer);
        this.mainContainer.addChild(this.uiContainer);
        this.mainContainer.addChild(this.effectContainer);

        this.initShaders();
    }

    private initShaders() {
        // Simple Chromatic Aberration Shader
        const glitchFrag = `
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float offset;
            void main(void) {
                vec2 coord = vTextureCoord;
                vec4 red = texture2D(uSampler, vec2(coord.x - offset, coord.y));
                vec4 green = texture2D(uSampler, coord);
                vec4 blue = texture2D(uSampler, vec2(coord.x + offset, coord.y));
                gl_FragColor = vec4(red.r, green.g, blue.b, green.a);
            }
        `;
        this.glitchFilter = new PIXI.Filter(undefined, glitchFrag, { offset: 0 });
        this.mainContainer.filters = [this.glitchFilter];
    }

    public setSize(width: number, height: number, dpr: number) {
        this.app.renderer.resize(width, height);
        // Scale logic handles mainly by CSS container, but we ensure render size matches
    }

    public updateConfig(config: RenderConfig) {
        if (config.blockSkin !== this.config.blockSkin) {
            this.spriteManager.clearCache();
        }
        this.config = config;
    }

    public addBeam(x: number, startY: number, endY: number, color: string) {
        this.beams.push({ x, startY, endY, color, life: 1.0 });
        if (this.glitchFilter) this.glitchFilter.uniforms.offset = 0.01;
    }

    public addClearingRows(rows: number[]) {
        if (this.glitchFilter) this.glitchFilter.uniforms.offset = 0.02;
    }

    public render(engine: GameCore) {
        this.blockContainer.removeChildren();
        this.gridGraphics.clear();
        this.bgGridGraphics.clear();
        this.uiContainer.removeChildren();
        this.effectContainer.removeChildren();

        const { cellSize, flippedGravity } = this.config;

        // Update Glitch Decay
        if (this.glitchFilter) {
            this.glitchFilter.uniforms.offset *= 0.9;
            if (this.glitchFilter.uniforms.offset < 0.001) this.glitchFilter.uniforms.offset = 0;
        }

        // 1. Render "Warp" Background
        this.renderBackground(cellSize, engine.speedMultiplier);

        // 2. Render Playfield
        this.renderGrid(cellSize);
        this.renderBoard(engine.boardManager.stage, cellSize);
        this.renderDynamic(engine, cellSize);
        this.renderEffects(cellSize);
    }

    private renderBackground(cellSize: number, speedMultiplier: number) {
        const g = this.bgGridGraphics;
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        
        // Scroll background
        this.bgOffset += (2 * speedMultiplier);
        if (this.bgOffset > h) this.bgOffset = 0;

        g.lineStyle(1, 0x06b6d4, 0.1);
        
        // Perspective-like grid (simple V-grid)
        const centerX = w / 2;
        const vanishingY = h * -0.5; // Vanishing point above screen

        // Radial lines
        for (let i = -5; i <= 15; i++) {
            const x = i * (w / 10);
            g.moveTo(centerX, vanishingY);
            g.lineTo(x, h);
        }

        // Horizontal scrolling lines
        // We draw them with exponential spacing to simulate depth
        const lines = 10;
        for (let i = 0; i < lines; i++) {
            const progress = ((this.bgOffset / h) + i) / lines;
            const y = (progress % 1) * h;
            // Exponential curve for depth
            const expY = Math.pow(y / h, 2) * h; 
            
            g.moveTo(0, expY);
            g.lineTo(w, expY);
        }
        
        // Pulse Overlay based on Audio
        const pulse = audioManager.getPulseFactor();
        g.beginFill(0x06b6d4, 0.05 * pulse);
        g.drawRect(0,0,w,h);
        g.endFill();
    }

    private renderGrid(cellSize: number) {
        const g = this.gridGraphics;
        // Grid border reacts to beat
        const pulse = audioManager.getPulseFactor();
        const gridAlpha = 0.04 + (pulse * 0.05);
        
        g.lineStyle(VISUAL_THEME.GRID.WIDTH, 0xFFFFFF, gridAlpha);
        
        for (let x = 0; x <= STAGE_WIDTH; x++) {
            g.moveTo(x * cellSize, 0);
            g.lineTo(x * cellSize, STAGE_HEIGHT * cellSize);
        }
        for (let y = 0; y <= STAGE_HEIGHT; y++) {
            g.moveTo(0, y * cellSize);
            g.lineTo(STAGE_WIDTH * cellSize, y * cellSize);
        }
    }

    private renderBoard(stage: Board, cellSize: number) {
        for (let y = 0; y < STAGE_HEIGHT; y++) {
            for (let x = 0; x < STAGE_WIDTH; x++) {
                const cell = stage[y][x];
                const type = cell[0];
                const modifier = cell[2];
                const drawY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - y : y;

                if (type) {
                    this.drawBlock(x, drawY, cellSize, type, cell[3]);
                } else if (modifier) {
                    this.drawModifier(x, drawY, cellSize, modifier);
                }
            }
        }
    }

    private drawBlock(x: number, y: number, size: number, type: TetrominoType | 'G', colorOverride?: string) {
        const { blockSkin } = this.config;
        const canvas = this.spriteManager.getBlockSprite(type, blockSkin, size, colorOverride);
        const texture = PIXI.Texture.from(canvas);
        const sprite = new PIXI.Sprite(texture);
        
        sprite.x = x * size;
        sprite.y = y * size;
        this.blockContainer.addChild(sprite);
    }

    private drawModifier(x: number, y: number, size: number, modifier: CellModifier) {
        const g = new PIXI.Graphics();
        const colorStr = MODIFIER_COLORS[modifier.type] || '#fff';
        const color = parseInt(colorStr.replace('#', ''), 16) || 0xFFFFFF;

        g.lineStyle(2, color, 1);
        g.drawRect(x * size + 2, y * size + 2, size - 4, size - 4);
        this.blockContainer.addChild(g);
    }

    private renderDynamic(engine: GameCore, cellSize: number) {
        const player = engine.pieceManager.player;
        const { flippedGravity } = this.config;
        
        const ghostY = this.calculateGhostY(engine, player);
        const shape = player.tetromino.shape;
        
        shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) {
                    // Draw Ghost
                    const gy = flippedGravity ? STAGE_HEIGHT - 1 - (ghostY + y) : (ghostY + y);
                    const gSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
                    gSprite.tint = parseInt(player.tetromino.color.replace('#', ''), 16) || 0x00FFFF;
                    gSprite.alpha = 0.2;
                    gSprite.width = cellSize;
                    gSprite.height = cellSize;
                    gSprite.x = (player.pos.x + x) * cellSize;
                    gSprite.y = gy * cellSize;
                    this.blockContainer.addChild(gSprite);

                    // Draw Active
                    const ay = flippedGravity ? STAGE_HEIGHT - 1 - (player.pos.y + y) : (player.pos.y + y);
                    this.drawBlock(player.pos.x + x, ay, cellSize, player.tetromino.type, player.colorOverride);
                }
            });
        });
        
        // AI Hint
        if (this.config.showAi && this.config.aiHint) {
            const hint = this.config.aiHint;
            const hg = new PIXI.Graphics();
            hg.lineStyle(2, 0xFFD700, 0.8);
            const drawY = flippedGravity ? STAGE_HEIGHT - 1 - hint.y! : hint.y!;
            const width = hint.type === 'I' ? 4 : (hint.type === 'O' ? 2 : 3);
            const height = hint.type === 'I' ? 1 : 2;
            hg.drawRect(hint.x * cellSize, drawY * cellSize, width * cellSize, height * cellSize);
            this.uiContainer.addChild(hg);
        }
    }

    private calculateGhostY(engine: GameCore, player: Player): number {
        let ghostY = player.pos.y;
        const moveY = this.config.flippedGravity ? -1 : 1;
        while (!engine.collisionManager.checkCollision(player, engine.boardManager.stage, { x: 0, y: ghostY + moveY - player.pos.y }, this.config.flippedGravity)) {
            ghostY += moveY;
        }
        return ghostY;
    }

    private renderEffects(cellSize: number) {
        const g = new PIXI.Graphics();
        this.beams = this.beams.filter(beam => {
            beam.life -= 0.05;
            const alpha = beam.life;
            const color = parseInt(beam.color.replace('#', ''), 16) || 0xFFFFFF;
            g.beginFill(color, alpha);
            const startY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - beam.startY : beam.startY;
            const endY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - beam.endY : beam.endY;
            const y = Math.min(startY, endY);
            const h = Math.abs(endY - startY) + 1;
            g.drawRect(beam.x * cellSize, y * cellSize, cellSize, h * cellSize);
            g.endFill();
            return beam.life > 0;
        });
        this.effectContainer.addChild(g);
    }
    
    public destroy() {
        this.app.destroy(true, { children: true, texture: true, baseTexture: true });
    }
}
