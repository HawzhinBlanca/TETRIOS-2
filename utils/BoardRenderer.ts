
import { GameCore } from './GameCore';
import { STAGE_WIDTH, STAGE_HEIGHT, COLORS, TETROMINOS, MODIFIER_COLORS } from '../constants';
import { audioManager } from '../utils/audioManager';
import { rotateMatrix } from './gameUtils';
import { Board, Player, TetrominoType, FloatingText, MoveScore, TetrominoShape, GhostStyle, AdventureLevelConfig, CellModifier } from '../types';

export interface RenderConfig {
    cellSize: number;
    ghostStyle: GhostStyle;
    ghostOpacity: number;
    ghostOutlineThickness: number;
    ghostGlowIntensity: number;
    ghostShadow?: string;
    lockWarningEnabled: boolean;
    showAi: boolean;
    aiHint?: MoveScore | null; 
    pieceIsGrounded: boolean; 
    gimmicks?: AdventureLevelConfig['gimmicks'];
    flippedGravity: boolean; 
    bombSelectionRows?: number[]; 
    lineClearerSelectedRow?: number | null;
    wildcardPieceAvailable: boolean;
}

export class BoardRenderer {
    private staticCtx: CanvasRenderingContext2D;
    private dynamicCtx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;
    private rgbCache: Map<string, string> = new Map();
    private config: RenderConfig;
    
    private readonly DASHED_LINE_PATTERN = [0, 0]; 
    private readonly EMPTY_LINE_PATTERN = [];
    private lastRenderedRevision: number = -1;

    constructor(staticCtx: CanvasRenderingContext2D, dynamicCtx: CanvasRenderingContext2D, initialConfig: RenderConfig) {
        this.staticCtx = staticCtx;
        this.dynamicCtx = dynamicCtx;
        this.config = initialConfig;
    }

    public setSize(width: number, height: number, dpr: number): void {
        if (this.width !== width || this.height !== height) {
            this.width = width;
            this.height = height;
            
            this.staticCtx.canvas.width = width * dpr;
            this.staticCtx.canvas.height = height * dpr;
            this.staticCtx.canvas.style.width = `${width}px`;
            this.staticCtx.canvas.style.height = `${height}px`;
            this.staticCtx.scale(dpr, dpr);

            this.dynamicCtx.canvas.width = width * dpr;
            this.dynamicCtx.canvas.height = height * dpr;
            this.dynamicCtx.canvas.style.width = `${width}px`;
            this.dynamicCtx.canvas.style.height = `${height}px`;
            this.dynamicCtx.scale(dpr, dpr);
            
            // Force redraw of static on resize
            this.lastRenderedRevision = -1;
        }
    }

    public updateConfig(newConfig: Partial<RenderConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public render(engine: GameCore): void {
        // Static Layer (Grid + Board) - Only redraw if board changed
        if (engine.boardManager.revision !== this.lastRenderedRevision) {
            this.renderStatic(engine);
            this.lastRenderedRevision = engine.boardManager.revision;
        }

        // Dynamic Layer (Piece, Ghost, Effects) - Redraw every frame
        this.renderDynamic(engine);
    }

    private renderStatic(engine: GameCore): void {
        const { cellSize } = this.config;
        const gap = 1; // Tighter gap for premium feel
        const size = cellSize - (gap * 2);
        const radius = Math.max(2, size * 0.2); // Smoother rounded corners
        const stage = engine.boardManager.stage;

        this.staticCtx.clearRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        this.drawGrid(this.staticCtx, cellSize);
        this.drawStage(this.staticCtx, stage, cellSize, gap, size, radius, this.config.flippedGravity);
    }

    private renderDynamic(engine: GameCore): void {
        const { cellSize } = this.config;
        const gap = 1;
        const size = cellSize - (gap * 2);
        const radius = Math.max(2, size * 0.2);
        
        this.dynamicCtx.clearRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);

        const player = engine.pieceManager.player;
        const hasBlocks = player.tetromino.shape.some((row: (TetrominoType | 0)[]) => row.some((cell: TetrominoType | 0) => cell !== 0));

        this.drawComboB2BOverlay(this.dynamicCtx, engine, cellSize);
        this.drawGarbageIndicator(this.dynamicCtx, engine, cellSize, this.config.flippedGravity);

        if (hasBlocks) {
            const stage = engine.boardManager.stage;
            const ghostY = this.calculateGhostY(stage, player, this.config.flippedGravity);
            const isGhostWarning = this.config.lockWarningEnabled && engine.pieceManager.pieceIsGrounded && engine.pieceManager.lockTimer !== null;
            this.drawGhost(this.dynamicCtx, player, ghostY, this.config, cellSize, gap, size, radius, isGhostWarning, engine.pieceManager.lockStartTime, engine.pieceManager.lockDelayDuration);

            if (this.config.showAi && this.config.aiHint && this.config.aiHint.y !== undefined) {
                this.drawAiHint(this.dynamicCtx, engine, this.config.aiHint, cellSize, gap, size, radius);
            }
            this.drawActivePiece(this.dynamicCtx, engine, this.config, cellSize, gap, size, radius);
        }

        this.drawFrenzyOverlay(this.dynamicCtx, engine, cellSize);
        this.drawOverlays(this.dynamicCtx, engine, cellSize, this.config.flippedGravity);
        this.drawGimmicks(this.dynamicCtx, engine, cellSize, this.config.flippedGravity);
        this.drawBombSelectionOverlay(this.dynamicCtx, cellSize, this.config.bombSelectionRows, this.config.flippedGravity);
        this.drawLineSelectionOverlay(this.dynamicCtx, cellSize, this.config.lineClearerSelectedRow, this.config.flippedGravity);
    }

    private drawGrid(ctx: CanvasRenderingContext2D, cellSize: number): void {
        const audioData = audioManager.getFrequencyData();
        let gridAlpha = 0.08;
        if (audioData) {
             let bassEnergy = 0;
             for(let i=2; i<8; i++) bassEnergy += audioData[i];
             gridAlpha = 0.08 + (bassEnergy / (6 * 255)) * 0.15; 
        }
        
        ctx.fillStyle = `rgba(255, 255, 255, ${gridAlpha})`;
        
        // Use dots for a cleaner, modern grid look
        for (let x = 0; x <= STAGE_WIDTH; x++) {
            for (let y = 0; y <= STAGE_HEIGHT; y++) {
                ctx.beginPath();
                ctx.arc(x * cellSize, y * cellSize, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private drawStage(ctx: CanvasRenderingContext2D, stage: Board, cellSize: number, gap: number, size: number, radius: number, flippedGravity: boolean): void {
        stage.forEach((row, y) => {
            row.forEach((cell, x: number) => {
                const drawY = flippedGravity ? STAGE_HEIGHT - 1 - y : y;
                if (cell[1] !== 'clear') {
                    const color = COLORS[cell[0] as TetrominoType] || 'rgb(255,255,255)';
                    ctx.save();
                    this.drawBlock(ctx, x, drawY, color, cellSize, gap, size, radius, undefined, cell[2]); 
                    ctx.restore();
                } else if (cell[2]) {
                    ctx.save();
                    this.drawModifier(ctx, x, drawY, cell[2], cellSize, gap, size, radius);
                    ctx.restore();
                }
            });
        });
    }

    private drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, cellSize: number, gap: number, size: number, radius: number, lockData?: { isLocking: boolean, progress: number }, modifier?: CellModifier): void {
        const rgb = this.getRgb(color);
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;
        
        const isLocking = lockData?.isLocking || false;
        const progress = lockData?.progress || 0;
        
        ctx.save();

        // Create Premium Gradient Look
        const [r, g, b] = rgb.split(',').map(Number);
        
        // Gradient from top-left to bottom-right
        const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
        
        if (isLocking) {
            // Intense white flash ramping up
            const flashAmt = Math.min(1, progress * 1.2); 
            const whiteR = r + (255 - r) * flashAmt;
            const whiteG = g + (255 - g) * flashAmt;
            const whiteB = b + (255 - b) * flashAmt;
            
            gradient.addColorStop(0, `rgba(${whiteR}, ${whiteG}, ${whiteB}, 1)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.9)`);
            
            ctx.shadowColor = `rgba(255, 255, 255, ${progress * 0.8})`;
            ctx.shadowBlur = size * progress * 1.5;
        } else {
            // Standard: Glossy top-left, darker bottom-right
            gradient.addColorStop(0, `rgba(${Math.min(255, r+50)}, ${Math.min(255, g+50)}, ${Math.min(255, b+50)}, 1)`);
            gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.9)`);
            gradient.addColorStop(1, `rgba(${Math.max(0, r-30)}, ${Math.max(0, g-30)}, ${Math.max(0, b-30)}, 1)`);
            
            // Subtle Ambient Shadow
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
            ctx.shadowBlur = size * 0.15;
        }

        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, px, py, size, size, radius);
        ctx.fill();

        // Top Inner Highlight (Bevel)
        ctx.beginPath();
        this.traceRoundedRect(ctx, px + 1, py + 1, size - 2, size - 2, radius);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Locking Border
        if (isLocking) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + progress * 0.4})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();

        if (modifier) {
            this.drawModifier(ctx, x, y, modifier, cellSize, gap, size, radius, true); 
        }
    }

    private drawModifier(ctx: CanvasRenderingContext2D, x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number, onBlock: boolean = false): void {
        ctx.save();
        if (onBlock) {
            ctx.globalAlpha = 0.8;
        }
        
        switch (modifier.type) {
            case 'GEM':
                this._drawGemModifier(ctx, x, y, cellSize, gap, size, radius);
                break;
            case 'BOMB':
                this._drawBombModifier(ctx, x, y, modifier, cellSize, gap, size, radius);
                break;
            case 'ICE':
            case 'CRACKED_ICE':
                this._drawIceModifier(ctx, x, y, modifier, cellSize, gap, size, radius);
                break;
            case 'WILDCARD_BLOCK':
            case 'LASER_BLOCK':
            case 'NUKE_BLOCK':
                 this._drawGenericModifier(ctx, x, y, modifier, cellSize, gap, size, radius);
                 break;
        }

        ctx.restore();
    }

    private _drawGenericModifier(ctx: CanvasRenderingContext2D, x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number): void {
         const px = x * cellSize + gap;
         const py = y * cellSize + gap;
         const color = MODIFIER_COLORS[modifier.type as keyof typeof MODIFIER_COLORS] || '#fff';
         
         ctx.fillStyle = color;
         ctx.shadowColor = color;
         ctx.shadowBlur = size * 0.6;
         
         this.drawRoundedRect(ctx, px + size*0.25, py + size*0.25, size*0.5, size*0.5, radius);
         ctx.fill();
    }

    private _drawGemModifier(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        ctx.fillStyle = MODIFIER_COLORS.GEM;
        ctx.strokeStyle = `rgba(${this.getRgb(MODIFIER_COLORS.GEM)}, 0.8)`;
        ctx.lineWidth = Math.max(1, cellSize * 0.05);
        ctx.shadowColor = MODIFIER_COLORS.GEM;
        ctx.shadowBlur = size * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(px + size / 2, py + size * 0.1);
        ctx.lineTo(px + size * 0.9, py + size / 2);
        ctx.lineTo(px + size / 2, py + size * 0.9);
        ctx.lineTo(px + size * 0.1, py + size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(px + size * 0.35, py + size * 0.35, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    private _drawBombModifier(ctx: CanvasRenderingContext2D, x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        const bombRgb = this.getRgb(MODIFIER_COLORS.BOMB);
        const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
        
        // Bomb Base
        ctx.fillStyle = `rgba(${bombRgb}, 0.8)`;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgba(${bombRgb}, 1)`;
        ctx.shadowBlur = size * (0.5 + pulse * 0.3);

        ctx.beginPath();
        ctx.arc(px + size/2, py + size/2, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Timer Text
        ctx.font = `bold ${cellSize * 0.5}px Rajdhani`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillText(modifier.timer!.toString(), px + size / 2, py + size / 2 + 1);
    }

    private _drawIceModifier(ctx: CanvasRenderingContext2D, x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        const iceRgb = this.getRgb(MODIFIER_COLORS.ICE);
        
        const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
        gradient.addColorStop(0, `rgba(200, 230, 255, 0.8)`);
        gradient.addColorStop(1, `rgba(${iceRgb}, 0.6)`);

        ctx.fillStyle = gradient;
        ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
        ctx.lineWidth = 1;
        
        this.drawRoundedRect(ctx, px, py, size, size, radius);
        ctx.fill();
        ctx.stroke();

        // Glare
        ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + size * 0.6, py);
        ctx.lineTo(px, py + size * 0.6);
        ctx.fill();

        if (modifier.type === 'CRACKED_ICE') {
            ctx.strokeStyle = `rgba(255, 255, 255, 0.7)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px + size * 0.2, py + size * 0.2);
            ctx.lineTo(px + size * 0.8, py + size * 0.8);
            ctx.moveTo(px + size * 0.8, py + size * 0.2);
            ctx.lineTo(px + size * 0.2, py + size * 0.8);
            ctx.stroke();
        }
    }

    private drawGhost(ctx: CanvasRenderingContext2D, player: Player, ghostY: number, config: RenderConfig, cellSize: number, gap: number, size: number, radius: number, isGhostWarning: boolean, lockStartTime: number, lockDelayDuration: number): void {
        const { ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, ghostShadow, flippedGravity } = config;
        const rgb = this.getRgb(player.tetromino.color);
        const now = Date.now();

        ctx.save();

        let displayRgb = rgb;
        let effectiveOpacity = ghostOpacity;
        let effectiveOutlineThickness = ghostOutlineThickness;
        let useDashed = false;

        if (isGhostWarning) {
            displayRgb = '255, 69, 0'; 
            const elapsed = now - lockStartTime;
            const progress = Math.min(1, Math.max(0, elapsed / lockDelayDuration));
            effectiveOpacity = 0.5 + progress * 0.5;
            effectiveOutlineThickness = Math.max(2, ghostOutlineThickness + progress * 2);
            ctx.shadowColor = `rgba(${displayRgb}, 1)`;
            ctx.shadowBlur = 15 * progress;
        } else {
            switch (ghostStyle) {
                case 'dashed':
                    useDashed = true;
                    break;
                case 'solid':
                    effectiveOpacity = 0.3;
                    break;
                case 'neon':
                default:
                     ctx.shadowColor = `rgba(${displayRgb}, ${0.5 * ghostGlowIntensity})`;
                     ctx.shadowBlur = 10 * ghostGlowIntensity;
                    break;
            }
        }
        
        ctx.globalAlpha = effectiveOpacity;

        if (useDashed) {
            ctx.strokeStyle = `rgba(${displayRgb}, 0.5)`;
            ctx.lineWidth = Math.max(1, effectiveOutlineThickness);
            this.DASHED_LINE_PATTERN[0] = size * 0.25;
            this.DASHED_LINE_PATTERN[1] = size * 0.15;
            ctx.setLineDash(this.DASHED_LINE_PATTERN);
        } else {
            ctx.strokeStyle = `rgba(${displayRgb}, 0.8)`;
            ctx.lineWidth = Math.max(1, effectiveOutlineThickness);
            ctx.fillStyle = `rgba(${displayRgb}, 0.1)`;
            ctx.setLineDash(this.EMPTY_LINE_PATTERN);
        }

        ctx.beginPath();
        player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
            row.forEach((value: TetrominoType | 0, x: number) => {
                if (value !== 0) {
                    const px = (x + player.pos.x) * cellSize + gap;
                    const py = (flippedGravity ? STAGE_HEIGHT - 1 - (y + ghostY) : (y + ghostY)) * cellSize + gap;
                    this.traceRoundedRect(ctx, px, py, size, size, radius);
                    if (!useDashed) ctx.fill();
                }
            });
        });

        ctx.stroke();
        ctx.restore();
    }

    private drawAiHint(ctx: CanvasRenderingContext2D, engine: GameCore, aiHint: MoveScore, cellSize: number, gap: number, size: number, radius: number): void {
        const type = engine.pieceManager.player.tetromino.type;
        const flippedGravity = engine.flippedGravity;
        if (type && TETROMINOS[type]) {
             let aiShape: TetrominoShape = TETROMINOS[type].shape;
             for (let i = 0; i < aiHint.r; i++) aiShape = rotateMatrix(aiShape, 1);
             
             ctx.save();
             const pulse = (Math.sin(Date.now() / 300) + 1) / 2; 
             const alpha = 0.3 + pulse * 0.3;
             
             ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
             ctx.lineWidth = 2;
             ctx.shadowColor = 'gold';
             ctx.shadowBlur = 5;
             
             ctx.beginPath();
             aiShape.forEach((row: TetrominoShape[number], dy: number) => {
                 row.forEach((cell: TetrominoType | 0, dx: number) => {
                     if (cell !== 0) {
                         const px = (aiHint.x + dx) * cellSize + gap;
                         const py = (flippedGravity ? STAGE_HEIGHT - 1 - (aiHint.y! + dy) : (aiHint.y! + dy)) * cellSize + gap;
                         this.traceRoundedRect(ctx, px, py, size, size, radius);
                     }
                 })
             });
             ctx.stroke();
             ctx.restore();
        }
    }

    private drawActivePiece(ctx: CanvasRenderingContext2D, engine: GameCore, config: RenderConfig, cellSize: number, gap: number, size: number, radius: number): void {
       const dropTime = engine.pieceManager.dropTime || 1000;
       const effectiveDropTime = engine.scoreManager.frenzyActive ? dropTime / engine.scoreManager.frenzyMultiplier : dropTime; 
       const offsetY = Math.min(1, engine.pieceManager.dropCounter / effectiveDropTime);
       // Interpolate Y for smooth animation
       const visualY = engine.pieceManager.player.pos.y + (config.flippedGravity ? -offsetY : offsetY);
       
       const isLocking = config.lockWarningEnabled && engine.pieceManager.lockTimer !== null && engine.pieceManager.pieceIsGrounded;
       let lockProgress = 0;
       if (isLocking && engine.pieceManager.lockStartTime) {
           const elapsed = Date.now() - engine.pieceManager.lockStartTime;
           lockProgress = Math.min(1, Math.max(0, elapsed / engine.pieceManager.lockDelayDuration));
       }

       const color = engine.pieceManager.player.tetromino.color;
       
       engine.pieceManager.player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
         row.forEach((value: TetrominoType | 0, x: number) => {
           if (value !== 0) {
              ctx.save();
              const drawY = config.flippedGravity ? STAGE_HEIGHT - 1 - (y + visualY) : (y + visualY);
              this.drawBlock(ctx, x + engine.pieceManager.player.pos.x, drawY, color, cellSize, gap, size, radius, { isLocking, progress: lockProgress });
              ctx.restore();
           }
         });
       });
       
       // Visual flash on lock/T-Spin
       if (engine.fxManager.lockResetFlash > 0.01) {
            ctx.save();
            ctx.globalAlpha = engine.fxManager.lockResetFlash * 0.5;
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            engine.pieceManager.player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
                row.forEach((value: TetrominoType | 0, x: number) => {
                    if (value !== 0) {
                         const drawY = config.flippedGravity ? STAGE_HEIGHT - 1 - (y + visualY) : (y + visualY);
                         const px = ((x + engine.pieceManager.player.pos.x) * cellSize) + gap;
                         const py = (drawY * cellSize) + gap;
                         this.traceRoundedRect(ctx, px, py, size, size, radius);
                    }
                });
            });
            ctx.fill();
            ctx.restore();
       }
    }

    private drawComboB2BOverlay(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number): void {
        if (!engine.scoreManager.isBackToBack && engine.scoreManager.comboCount < 1) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 

        const now = Date.now();
        const pulseFactor = (Math.sin(now / 250) + 1) / 2; 

        if (engine.scoreManager.isBackToBack) {
            // Subtle purple glow for B2B
            ctx.fillStyle = `rgba(192, 132, 252, ${0.05 + pulseFactor * 0.05})`; 
            ctx.fillRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        }

        if (engine.scoreManager.comboCount > 0) {
            // Green glow intensity scales with combo
            const comboAlpha = Math.min(0.3, 0.05 + engine.scoreManager.comboCount * 0.02); 
            ctx.fillStyle = `rgba(74, 222, 128, ${comboAlpha})`; 
            ctx.fillRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        }

        ctx.restore();
    }

    private drawGarbageIndicator(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        if (engine.boardManager.garbagePending === 0) return;

        ctx.save();
        // Red bar indicating incoming garbage
        const height = Math.min(engine.boardManager.garbagePending, STAGE_HEIGHT) * cellSize;
        const startY = flippedGravity ? 0 : (STAGE_HEIGHT * cellSize) - height;
        
        const gradient = ctx.createLinearGradient(0, startY, 0, startY + height);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, startY, STAGE_WIDTH * cellSize, height);
        
        // Warning Line
        const lineY = flippedGravity ? height : startY;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(STAGE_WIDTH * cellSize, lineY);
        ctx.stroke();

        ctx.restore();
    }

    private drawFrenzyOverlay(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number): void {
        if (!engine.scoreManager.frenzyActive) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 

        const now = Date.now();
        const pulse = (Math.sin(now / 100) + 1) / 2; 
        const alpha = 0.1 + pulse * 0.1;

        // Gold Overlay
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; 
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Cinematic Borders
        const borderGradient = ctx.createLinearGradient(0, 0, 0, this.height);
        borderGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        borderGradient.addColorStop(0.1, 'transparent');
        borderGradient.addColorStop(0.9, 'transparent');
        borderGradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
        
        ctx.fillStyle = borderGradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.restore();
    }

    private drawOverlays(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        // Access flash via FXManager proxy
        if (engine.fxManager.tSpinFlash && engine.fxManager.tSpinFlash > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = engine.fxManager.tSpinFlash * 0.8; 
            ctx.fillStyle = 'rgba(217, 70, 239, 0.8)'; 
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.restore();
        }

        engine.fxManager.floatingTexts.forEach((ft: FloatingText) => {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.textAlign = 'center';
            const fx = ft.x * cellSize + (cellSize * 2); 
            const fy = ft.y * cellSize + (flippedGravity ? cellSize * 0.5 : cellSize * 0.5);

            let textColor = ft.color;
            let textShadowColor = ft.color;
            
            // Use distinct styling for different variants
            if (ft.variant === 'gem') {
                textColor = '#f472b6';
                textShadowColor = '#be185d';
            } else if (ft.variant === 'bomb') {
                textColor = '#4ade80';
                textShadowColor = '#15803d';
            } else if (ft.variant === 'frenzy') {
                textColor = '#fcd34d';
                textShadowColor = '#b45309';
            }
            
            const currentScale = ft.initialScale * (1.5 - 0.5 * ft.life); // Grow slightly
            ctx.font = `900 ${cellSize * currentScale}px Rajdhani`; 
            
            // Stroke outline for readability
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            
            ctx.translate(fx, fy);
            ctx.strokeText(ft.text, 0, 0);
            
            ctx.fillStyle = textColor;
            ctx.shadowColor = textShadowColor;
            ctx.shadowBlur = 15 * ft.life;
            ctx.fillText(ft.text, 0, 0);
            
            ctx.restore();
        });
    }

    private drawGimmicks(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        const invisibleRowsGimmick = engine.adventureManager.config?.gimmicks?.find(g => g.type === 'INVISIBLE_ROWS');
        if (invisibleRowsGimmick && engine.adventureManager.invisibleRows.length > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(3, 7, 18, 0.9)'; 
            
            // Fog effect
            const fogGradient = ctx.createLinearGradient(0,0, this.width, 0);
            fogGradient.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
            fogGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.0)');
            fogGradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');

            engine.adventureManager.invisibleRows.forEach(y => {
                const py = (flippedGravity ? STAGE_HEIGHT - 1 - y : y) * cellSize;
                ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
                
                // Draw fog
                ctx.fillStyle = fogGradient;
                ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
                
                // Reset fill
                ctx.fillStyle = 'rgba(3, 7, 18, 0.9)';
            });
            ctx.restore();
        }
    }

    private drawBombSelectionOverlay(ctx: CanvasRenderingContext2D, cellSize: number, bombSelectionRows: number[] | undefined, flippedGravity: boolean): void {
        if (!bombSelectionRows || bombSelectionRows.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'source-over'; 
        const pulse = (Math.sin(Date.now() / 150) + 1) / 2; 

        ctx.fillStyle = `rgba(239, 68, 68, ${0.3 + pulse * 0.2})`;
        ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.lineWidth = 2;

        bombSelectionRows.forEach(y => {
            const py = (flippedGravity ? STAGE_HEIGHT - 1 - y : y) * cellSize;
            ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
            ctx.strokeRect(0, py, STAGE_WIDTH * cellSize, cellSize);
        });

        ctx.restore();
    }

    private drawLineSelectionOverlay(ctx: CanvasRenderingContext2D, cellSize: number, selectedRow: number | null | undefined, flippedGravity: boolean): void {
        if (selectedRow === null || selectedRow === undefined) return;

        ctx.save();
        const pulse = (Math.sin(Date.now() / 100) + 1) / 2; 

        ctx.fillStyle = `rgba(6, 182, 212, ${0.3 + pulse * 0.2})`;
        ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.lineWidth = 2;

        const py = (flippedGravity ? STAGE_HEIGHT - 1 - selectedRow : selectedRow) * cellSize;
        ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
        ctx.strokeRect(0, py, STAGE_WIDTH * cellSize, cellSize);

        ctx.restore();
    }

    private calculateGhostY(stage: Board, player: Player, flippedGravity: boolean): number {
        let ghostY = player.pos.y;
        const shape = player.tetromino.shape;
        const moveIncrement = flippedGravity ? -1 : 1;
        const boundaryCheck = (ny: number) => flippedGravity ? ny < 0 : ny >= STAGE_HEIGHT;

        for (let i = 0; i < STAGE_HEIGHT + 2; i++) { 
           let collision = false;
           const nextY = ghostY + moveIncrement;
           for(let r=0; r<shape.length; r++) {
               for(let c=0; c<shape[r].length; c++) {
                   if(shape[r][c] !== 0) {
                       const ny = nextY + r;
                       const nx = player.pos.x + c;
                       if(boundaryCheck(ny) || (ny >= 0 && ny < STAGE_HEIGHT && nx >= 0 && nx < STAGE_WIDTH && stage[ny][nx][1] !== 'clear')) {
                           collision = true;
                           break;
                       }
                   }
               }
               if(collision) break;
           }
           if(collision) break;
           ghostY += moveIncrement;
        }
        return ghostY;
    }

    private getRgb(color: string): string {
        if (this.rgbCache.has(color)) return this.rgbCache.get(color)!;
        const matches = color.match(/\d+/g);
        const res = matches ? matches.join(',') : '255,255,255';
        this.rgbCache.set(color, res);
        return res;
    }

    private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        ctx.beginPath();
        this.traceRoundedRect(ctx, x, y, w, h, r);
        ctx.closePath();
    }

    private traceRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }
}
