
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
        const gap = cellSize * 0.05;
        const size = cellSize - (gap * 2);
        const radius = cellSize * 0.12;
        const stage = engine.boardManager.stage;

        this.staticCtx.clearRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        this.drawGrid(this.staticCtx, cellSize);
        this.drawStage(this.staticCtx, stage, cellSize, gap, size, radius, this.config.flippedGravity);
    }

    private renderDynamic(engine: GameCore): void {
        const { cellSize } = this.config;
        const gap = cellSize * 0.05;
        const size = cellSize - (gap * 2);
        const radius = cellSize * 0.12;
        
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
        let gridAlpha = 0.05;
        if (audioData) {
             let bassEnergy = 0;
             for(let i=2; i<12; i++) bassEnergy += audioData[i];
             gridAlpha = 0.05 + (bassEnergy / (10 * 255)) * 0.25; 
        }
        ctx.strokeStyle = `rgba(6, 182, 212, ${gridAlpha})`;
        ctx.lineWidth = Math.max(0.5, cellSize * 0.03);
        ctx.beginPath();
        for (let x = 0; x <= STAGE_WIDTH; x++) {
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, STAGE_HEIGHT * cellSize);
        }
        for (let y = 0; y <= STAGE_HEIGHT; y++) {
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(STAGE_WIDTH * cellSize, y * cellSize);
        }
        ctx.stroke();
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
        const pulse = isLocking ? (Math.sin(Date.now() / (60 - (progress * 40))) + 1) / 2 : 0;

        ctx.save();

        if (isLocking) {
            const warningColorRgb = '255, 69, 0'; 
            const baseColorRgb = rgb;

            const r = parseInt(baseColorRgb.split(',')[0]) * (1 - progress) + parseInt(warningColorRgb.split(',')[0]) * progress;
            const g = parseInt(baseColorRgb.split(',')[1]) * (1 - progress) + parseInt(warningColorRgb.split(',')[1]) * progress;
            const b = parseInt(baseColorRgb.split(',')[2]) * (1 - progress) + parseInt(warningColorRgb.split(',')[2]) * progress;
            const interpolatedColorRgb = `${r},${g},${b}`;

            const shadowColor = `rgba(${interpolatedColorRgb}, ${0.6 + (pulse * 0.4) + (progress * 0.4)})`;
            const shadowBlur = size * 0.6 + (pulse * size * 0.3) + (progress * size * 0.5);
            const fillStyle = `rgba(${interpolatedColorRgb}, ${0.7 + progress * 0.2})`;
            const overlayOpacity = 0.1 + (progress * 0.4) + (pulse * 0.1);
            const strokeStyle = `rgba(255, 255, 255, ${0.8 + (progress * 0.2)})`;
            const lineWidth = Math.max(1, size * 0.06 + (pulse * size * 0.03));

            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
            ctx.fillStyle = fillStyle;
            
            this.drawRoundedRect(ctx, px, py, size, size, radius / 1.5);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${overlayOpacity})`; 
            ctx.beginPath();
            this.traceRoundedRect(ctx, px, py, size, size, radius / 1.5);
            ctx.fill();

            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.fillStyle = `rgba(${rgb}, 0.9)`;
            ctx.shadowColor = `rgba(${rgb}, 0.8)`;
            ctx.shadowBlur = size * 0.5;
            this.drawRoundedRect(ctx, px, py, size, size, radius / 1.5);
            ctx.fill();
            ctx.strokeStyle = `rgba(${rgb}, 1)`;
            ctx.lineWidth = Math.max(1, size * 0.03);
            ctx.stroke();
        }
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.rect(px, py, size, size/2);
        ctx.fill();
        
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
         ctx.shadowBlur = size * 0.5;
         
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
        ctx.shadowBlur = size * 0.4;
        
        ctx.beginPath();
        ctx.moveTo(px + size / 2, py);
        ctx.lineTo(px + size, py + size / 2);
        ctx.lineTo(px + size / 2, py + size);
        ctx.lineTo(px, py + size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(px + size * 0.2, py + size * 0.2, size * 0.1, size * 0.1);
        ctx.fillRect(px + size * 0.7, py + size * 0.3, size * 0.1, size * 0.1);
    }

    private _drawBombModifier(ctx: CanvasRenderingContext2D, x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        const bombRgb = this.getRgb(MODIFIER_COLORS.BOMB);
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        ctx.fillStyle = `rgba(${bombRgb}, ${0.7 + pulse * 0.3})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + pulse * 0.2})`;
        ctx.lineWidth = Math.max(1, cellSize * 0.08);
        ctx.shadowColor = `rgba(${bombRgb}, ${0.8 + pulse * 0.2})`;
        ctx.shadowBlur = size * 0.6;

        this.drawRoundedRect(ctx, px, py, size, size, radius);
        ctx.fill();
        ctx.stroke();

        ctx.font = `bold ${cellSize * 0.6}px Rajdhani`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = MODIFIER_COLORS.BOMB_TEXT;
        ctx.fillText(modifier.timer!.toString(), px + size / 2, py + size / 2 + cellSize * 0.05);
    }

    private _drawIceModifier(ctx: CanvasRenderingContext2D, x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        const iceRgb = this.getRgb(MODIFIER_COLORS.ICE);
        const crackedRgb = this.getRgb(MODIFIER_COLORS.CRACKED_ICE);
        const iceColor = modifier.type === 'ICE' ? iceRgb : crackedRgb;

        ctx.fillStyle = `rgba(${iceColor}, 0.7)`;
        ctx.strokeStyle = `rgba(${this.getRgb(COLORS.I)}, 0.4)`;
        ctx.lineWidth = Math.max(1, cellSize * 0.03);
        ctx.shadowColor = `rgba(${iceColor}, 0.5)`;
        ctx.shadowBlur = size * 0.3;

        this.drawRoundedRect(ctx, px, py, size, size, radius / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
        ctx.fillRect(px, py, size, size * 0.3);
        ctx.fillRect(px + size * 0.7, py + size * 0.3, size * 0.3, size * 0.7);

        if (modifier.type === 'CRACKED_ICE') {
            ctx.strokeStyle = `rgba(0, 0, 0, 0.4)`;
            ctx.lineWidth = Math.max(1, cellSize * 0.05);
            ctx.beginPath();
            ctx.moveTo(px + size * 0.2, py + size * 0.3);
            ctx.lineTo(px + size * 0.8, py + size * 0.7);
            ctx.moveTo(px + size * 0.5, py + size * 0.1);
            ctx.lineTo(px + size * 0.5, py + size * 0.9);
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
        let effectiveGlowIntensity = ghostGlowIntensity;
        let effectiveOutlineThickness = ghostOutlineThickness;
        let effectiveShadow = ghostShadow;
        let useDashed = false;

        if (isGhostWarning) {
            displayRgb = '255, 69, 0'; 
            const elapsed = now - lockStartTime;
            const progress = Math.min(1, Math.max(0, elapsed / lockDelayDuration));

            effectiveOpacity = 0.6 + progress * 0.4;
            effectiveGlowIntensity = 1 + progress * 2;
            effectiveOutlineThickness = Math.max(2, ghostOutlineThickness + progress * 3);
            effectiveShadow = `0 0 ${8 * effectiveGlowIntensity}px rgba(${displayRgb}, 0.9), inset 0 0 ${4 * effectiveGlowIntensity}px rgba(${displayRgb}, 0.5)`;
        } else {
            switch (ghostStyle) {
                case 'dashed':
                    useDashed = true;
                    break;
                case 'solid':
                    effectiveOpacity = 0.4;
                    effectiveGlowIntensity = 0;
                    effectiveOutlineThickness = 0;
                    break;
                case 'neon':
                default:
                    effectiveShadow = ghostShadow || `0 0 ${8 * ghostGlowIntensity}px rgba(${displayRgb}, 0.6), inset 0 0 ${4 * ghostGlowIntensity}px rgba(${displayRgb}, 0.4)`;
                    break;
            }
        }
        
        const pulseFactor = (Math.sin(now / 300) + 1) / 2;

        ctx.globalAlpha = effectiveOpacity;

        if (useDashed) {
            ctx.strokeStyle = `rgba(${displayRgb}, 0.6)`;
            ctx.lineWidth = Math.max(1, effectiveOutlineThickness);
            this.DASHED_LINE_PATTERN[0] = size * 0.25;
            this.DASHED_LINE_PATTERN[1] = size * 0.15;
            ctx.setLineDash(this.DASHED_LINE_PATTERN);
            ctx.fillStyle = `rgba(${displayRgb}, 0.05)`;
        } else {
            if (effectiveShadow) {
                const shadowColorMatch = effectiveShadow.match(/rgba\((\d+,\s*\d+,\s*\d+),\s*([\d.]+)\)/);
                let shadowColorRgb = displayRgb;
                let shadowBaseAlpha = 0.6;
                if (shadowColorMatch) {
                    shadowColorRgb = shadowColorMatch[1];
                    shadowBaseAlpha = parseFloat(shadowColorMatch[2]);
                }

                ctx.shadowColor = `rgba(${shadowColorRgb}, ${shadowBaseAlpha + (pulseFactor * 0.3 * effectiveGlowIntensity)})`;
                ctx.shadowBlur = (effectiveShadow.includes('inset') ? 0 : parseFloat(effectiveShadow.split(' ')[1])) + (pulseFactor * size * 0.1 * effectiveGlowIntensity);
            }
            ctx.strokeStyle = `rgba(${displayRgb}, 0.9)`;
            ctx.lineWidth = Math.max(1, effectiveOutlineThickness);
            ctx.fillStyle = `rgba(${displayRgb}, ${isGhostWarning ? 0.25 : 0.15})`;
            ctx.setLineDash(this.EMPTY_LINE_PATTERN);
        }

        ctx.beginPath();
        player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
            row.forEach((value: TetrominoType | 0, x: number) => {
                if (value !== 0) {
                    const px = (x + player.pos.x) * cellSize + gap;
                    const py = (flippedGravity ? STAGE_HEIGHT - 1 - (y + ghostY) : (y + ghostY)) * cellSize + gap;
                    this.traceRoundedRect(ctx, px, py, size, size, radius);
                }
            });
        });

        ctx.fill();
        if (effectiveOutlineThickness > 0) {
            ctx.stroke();
        }
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
             const alpha = 0.4 + pulse * 0.4;
             ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
             this.DASHED_LINE_PATTERN[0] = cellSize * 0.2;
             this.DASHED_LINE_PATTERN[1] = cellSize * 0.15;
             ctx.setLineDash(this.DASHED_LINE_PATTERN);
             ctx.lineWidth = Math.max(1, cellSize * 0.06);
             ctx.fillStyle = `rgba(255, 215, 0, 0.1)`; 
             
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
             ctx.fill();
             ctx.stroke();
             ctx.restore();
        }
    }

    private drawActivePiece(ctx: CanvasRenderingContext2D, engine: GameCore, config: RenderConfig, cellSize: number, gap: number, size: number, radius: number): void {
       const dropTime = engine.pieceManager.dropTime || 1000;
       const effectiveDropTime = engine.scoreManager.frenzyActive ? dropTime / engine.scoreManager.frenzyMultiplier : dropTime; 
       const offsetY = Math.min(1, engine.pieceManager.dropCounter / effectiveDropTime);
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
       
       // Access visual flash via FXManager
       if (engine.fxManager.lockResetFlash > 0.01) {
            ctx.save();
            ctx.globalAlpha = engine.fxManager.lockResetFlash;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            engine.pieceManager.player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
                row.forEach((value: TetrominoType | 0, x: number) => {
                    if (value !== 0) {
                         const drawY = config.flippedGravity ? STAGE_HEIGHT - 1 - (y + visualY) : (y + visualY);
                         const px = ((x + engine.pieceManager.player.pos.x) * cellSize) + (cellSize * 0.05);
                         const py = (drawY * cellSize) + (cellSize * 0.05);
                         this.traceRoundedRect(ctx, px, py, size, size, cellSize * 0.15);
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
        ctx.globalCompositeOperation = 'overlay'; 

        const now = Date.now();
        const pulseFactor = (Math.sin(now / 200) + 1) / 2; 

        if (engine.scoreManager.isBackToBack) {
            ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + pulseFactor * 0.15})`; 
            ctx.fillRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        }

        if (engine.scoreManager.comboCount > 0) {
            const comboAlpha = Math.min(0.5, 0.1 + engine.scoreManager.comboCount * 0.05); 
            ctx.fillStyle = `rgba(34, 197, 94, ${comboAlpha + pulseFactor * 0.1})`; 
            ctx.fillRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        }

        ctx.restore();
    }

    private drawGarbageIndicator(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        if (engine.boardManager.garbagePending === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; 

        const now = Date.now();
        const flicker = (Math.sin(now / 100) + 1) / 2; 
        const baseAlpha = Math.min(0.6, 0.2 + engine.boardManager.garbagePending * 0.1); 

        ctx.fillStyle = `rgba(239, 68, 68, ${baseAlpha * (0.5 + flicker * 0.5)})`; 

        for (let i = 0; i < Math.min(engine.boardManager.garbagePending, STAGE_HEIGHT); i++) {
            const y = flippedGravity ? i : STAGE_HEIGHT - 1 - i;
            ctx.fillRect(0, y * cellSize, STAGE_WIDTH * cellSize, cellSize);
        }
        
        ctx.strokeStyle = `rgba(255, 100, 0, ${baseAlpha * (0.8 + flicker * 0.2)})`; 
        ctx.lineWidth = Math.max(1, cellSize * 0.1);
        
        const startY = flippedGravity ? 0 : (STAGE_HEIGHT - Math.min(engine.boardManager.garbagePending, STAGE_HEIGHT)) * cellSize;
        const height = Math.min(engine.boardManager.garbagePending, STAGE_HEIGHT) * cellSize;
        ctx.strokeRect(0, startY, STAGE_WIDTH * cellSize, height);

        ctx.restore();
    }

    private drawFrenzyOverlay(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number): void {
        if (!engine.scoreManager.frenzyActive) return;

        ctx.save();
        ctx.globalCompositeOperation = 'overlay'; 

        const now = Date.now();
        const pulse = (Math.sin(now / 150) + 1) / 2; 
        const alpha = 0.2 + pulse * 0.2;

        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; 
        ctx.shadowColor = `rgba(255, 215, 0, ${alpha * 1.5})`;
        ctx.shadowBlur = cellSize * (0.5 + pulse * 0.5);

        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }

    private drawOverlays(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        // Access flash via FXManager proxy
        if (engine.fxManager.tSpinFlash && engine.fxManager.tSpinFlash > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = engine.fxManager.tSpinFlash; 
            ctx.fillStyle = 'rgba(217, 70, 239, 0.6)'; 
            ctx.shadowColor = 'rgba(217, 70, 239, 1)';
            ctx.shadowBlur = cellSize * 2 * engine.fxManager.tSpinFlash; 
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
            let textShadowBlur = cellSize * 0.5 * ft.life;

            if (ft.variant === 'gem') {
                textColor = MODIFIER_COLORS.GEM;
                textShadowColor = MODIFIER_COLORS.GEM;
                textShadowBlur = cellSize * 0.8 * ft.life;
            } else if (ft.variant === 'bomb') {
                textColor = MODIFIER_COLORS.BOMB;
                textShadowColor = MODIFIER_COLORS.BOMB;
                textShadowBlur = cellSize * 0.8 * ft.life;
            } else if (ft.variant === 'frenzy') {
                textColor = 'gold';
                textShadowColor = 'gold';
                textShadowBlur = cellSize * 1.0 * ft.life;
            }
            
            ctx.fillStyle = textColor;
            const currentScale = ft.initialScale * (1 + 0.2 * ft.life) * (0.8 + 0.2 * ft.life);
            ctx.font = `bold ${cellSize * currentScale * 0.7}px Rajdhani`; 
            
            ctx.shadowColor = textShadowColor;
            ctx.shadowBlur = textShadowBlur; 
            
            ctx.translate(fx, fy);
            ctx.fillText(ft.text, 0, 0);
            ctx.restore();
        });
    }

    private drawGimmicks(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        const invisibleRowsGimmick = engine.adventureManager.config?.gimmicks?.find(g => g.type === 'INVISIBLE_ROWS');
        if (invisibleRowsGimmick && engine.adventureManager.invisibleRows.length > 0) {
            ctx.save();
            ctx.globalAlpha = 0.8; 
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
            ctx.lineWidth = 2;
            this.DASHED_LINE_PATTERN[0] = cellSize * 0.1;
            this.DASHED_LINE_PATTERN[1] = cellSize * 0.1;
            ctx.setLineDash(this.DASHED_LINE_PATTERN);

            engine.adventureManager.invisibleRows.forEach(y => {
                const py = (flippedGravity ? STAGE_HEIGHT - 1 - y : y) * cellSize;
                ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
                ctx.strokeRect(0, py, STAGE_WIDTH * cellSize, cellSize);
            });
            ctx.restore();
        }
    }

    private drawBombSelectionOverlay(ctx: CanvasRenderingContext2D, cellSize: number, bombSelectionRows: number[] | undefined, flippedGravity: boolean): void {
        if (!bombSelectionRows || bombSelectionRows.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; 
        ctx.globalAlpha = 0.5 + (Math.sin(Date.now() / 150) + 1) / 4; 

        ctx.fillStyle = `rgba(${this.getRgb(MODIFIER_COLORS.BOMB)}, 0.4)`;
        ctx.strokeStyle = `rgba(${this.getRgb(MODIFIER_COLORS.BOMB)}, 0.8)`;
        ctx.lineWidth = Math.max(1, cellSize * 0.1);
        ctx.shadowColor = MODIFIER_COLORS.BOMB;
        ctx.shadowBlur = cellSize * 0.8;

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
        ctx.globalCompositeOperation = 'lighter'; 
        ctx.globalAlpha = 0.5 + (Math.sin(Date.now() / 100) + 1) / 4; 

        ctx.fillStyle = `rgba(${this.getRgb(MODIFIER_COLORS.LASER_BLOCK)}, 0.4)`;
        ctx.strokeStyle = `rgba(${this.getRgb(MODIFIER_COLORS.LASER_BLOCK)}, 0.8)`;
        ctx.lineWidth = Math.max(1, cellSize * 0.1);
        ctx.shadowColor = MODIFIER_COLORS.LASER_BLOCK;
        ctx.shadowBlur = cellSize * 0.8;

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
