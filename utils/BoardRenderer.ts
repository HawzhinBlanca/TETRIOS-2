

import { GameCore } from './GameCore';
import { STAGE_WIDTH, STAGE_HEIGHT, COLORS, TETROMINOS, MODIFIER_COLORS } from '../constants';
import { audioManager } from '../utils/audioManager';
import { rotateMatrix } from './gameUtils';
import { Board, Player, TetrominoType, FloatingText, MoveScore, TetrominoShape, GhostStyle, AdventureLevelConfig, CellModifier, FloatingTextVariant, GameGimmickType, CellModifierType } from '../types';

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
    pieceIsGrounded: boolean; // Added for grounded state
    // Adventure mode specific rendering configs
    gimmicks?: AdventureLevelConfig['gimmicks'];
    flippedGravity: boolean; // Pass flipped gravity state to renderer
    bombSelectionRows?: number[]; // Rows highlighted for bomb selection
    lineClearerSelectedRow?: number | null; // New: Row highlighted for line clearer
}

export class BoardRenderer {
    private ctx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;
    private rgbCache: Map<string, string> = new Map();
    private config: RenderConfig;

    constructor(ctx: CanvasRenderingContext2D, initialConfig: RenderConfig) {
        this.ctx = ctx;
        this.config = initialConfig;
    }

    public setSize(width: number, height: number, dpr: number): void {
        if (this.width !== width || this.height !== height) {
            this.width = width;
            this.height = height;
            this.ctx.canvas.width = width * dpr;
            this.ctx.canvas.height = height * dpr;
            this.ctx.canvas.style.width = `${width}px`;
            this.ctx.canvas.style.height = `${height}px`;
            this.ctx.scale(dpr, dpr);
        }
    }

    public updateConfig(newConfig: Partial<RenderConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public render(engine: GameCore): void {
        const { cellSize } = this.config;
        const gap = cellSize * 0.05;
        const size = cellSize - (gap * 2);
        const radius = cellSize * 0.12;

        this.ctx.clearRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        this.drawGrid(cellSize);
        this.drawStage(engine.stage, cellSize, gap, size, radius, this.config.flippedGravity);
        
        this.drawComboB2BOverlay(engine, cellSize); // Draw combo/B2B overlay
        this.drawGarbageIndicator(engine, cellSize, this.config.flippedGravity); // Draw garbage indicator

        const hasBlocks = engine.player.tetromino.shape.some((row: (TetrominoType | 0)[]) => row.some((cell: TetrominoType | 0) => cell !== 0));
        
        if (hasBlocks) {
            const ghostY = this.calculateGhostY(engine.stage, engine.player, this.config.flippedGravity);
            // Determine if ghost should show warning based on engine state and config
            const isGhostWarning = this.config.lockWarningEnabled && engine.pieceIsGrounded && engine.lockTimer !== null;
            this.drawGhost(engine.player, ghostY, this.config, cellSize, gap, size, radius, isGhostWarning, engine.lockStartTime, engine.lockDelayDuration);

            if (this.config.showAi && this.config.aiHint && this.config.aiHint.y !== undefined) {
                this.drawAiHint(engine, this.config.aiHint, cellSize, gap, size, radius);
            }
            this.drawActivePiece(engine, this.config, cellSize, gap, size, radius);
        }
        this.drawFrenzyOverlay(engine, cellSize); // Draw frenzy overlay
        this.drawOverlays(engine, cellSize, this.config.flippedGravity);
        this.drawGimmicks(engine, cellSize, this.config.flippedGravity); // Draw gimmicks last to overlay everything
        this.drawBombSelectionOverlay(cellSize, this.config.bombSelectionRows, this.config.flippedGravity); // Draw bomb selection last
        this.drawLineSelectionOverlay(cellSize, this.config.lineClearerSelectedRow, this.config.flippedGravity); // New: Draw line selection last
    }

    private drawGrid(cellSize: number): void {
        const audioData = audioManager.getFrequencyData();
        let gridAlpha = 0.05;
        if (audioData) {
             let bassEnergy = 0;
             for(let i=2; i<12; i++) bassEnergy += audioData[i];
             gridAlpha = 0.05 + (bassEnergy / (10 * 255)) * 0.25; 
        }
        this.ctx.strokeStyle = `rgba(6, 182, 212, ${gridAlpha})`;
        this.ctx.lineWidth = Math.max(0.5, cellSize * 0.03);
        this.ctx.beginPath();
        for (let x = 0; x <= STAGE_WIDTH; x++) {
            this.ctx.moveTo(x * cellSize, 0);
            this.ctx.lineTo(x * cellSize, STAGE_HEIGHT * cellSize);
        }
        for (let y = 0; y <= STAGE_HEIGHT; y++) {
            this.ctx.moveTo(0, y * cellSize);
            this.ctx.lineTo(STAGE_WIDTH * cellSize, y * cellSize);
        }
        this.ctx.stroke();
    }

    private drawStage(stage: Board, cellSize: number, gap: number, size: number, radius: number, flippedGravity: boolean): void {
        stage.forEach((row, y) => {
            row.forEach((cell, x: number) => {
                const drawY = flippedGravity ? STAGE_HEIGHT - 1 - y : y;
                if (cell[1] !== 'clear') { // Draw merged blocks
                    const color = COLORS[cell[0] as TetrominoType] || 'rgb(255,255,255)';
                    this.ctx.save();
                    this.drawBlock(x, drawY, color, cellSize, gap, size, radius, undefined, cell[2]); // Pass modifier to drawBlock
                    this.ctx.restore();
                } else if (cell[2]) { // Draw modifier if cell is 'clear'
                    this.ctx.save();
                    this.drawModifier(x, drawY, cell[2], cellSize, gap, size, radius);
                    this.ctx.restore();
                }
            });
        });
    }

    private drawBlock(x: number, y: number, color: string, cellSize: number, gap: number, size: number, radius: number, lockData?: { isLocking: boolean, progress: number }, modifier?: CellModifier): void {
        const rgb = this.getRgb(color);
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;
        
        const isLocking = lockData?.isLocking || false;
        const progress = lockData?.progress || 0;
        const pulse = isLocking ? (Math.sin(Date.now() / (60 - (progress * 40))) + 1) / 2 : 0; // Faster pulse as it nears lock

        this.ctx.save();

        if (isLocking) {
            const warningColorRgb = '255, 69, 0'; // Orange-Red for warning
            const baseColorRgb = rgb;

            // Interpolate color towards warning color as progress increases
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

            this.ctx.shadowColor = shadowColor;
            this.ctx.shadowBlur = shadowBlur;
            this.ctx.fillStyle = fillStyle;
            
            this.drawRoundedRect(px, py, size, size, radius / 1.5);
            this.ctx.fill();

            this.ctx.fillStyle = `rgba(255, 255, 255, ${overlayOpacity})`; 
            this.ctx.beginPath();
            this.traceRoundedRect(px, py, size, size, radius / 1.5);
            this.ctx.fill();

            this.ctx.strokeStyle = strokeStyle;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        } else {
            this.ctx.fillStyle = `rgba(${rgb}, 0.9)`;
            this.ctx.shadowColor = `rgba(${rgb}, 0.8)`;
            this.ctx.shadowBlur = size * 0.5;
            this.drawRoundedRect(px, py, size, size, radius / 1.5);
            this.ctx.fill();
            this.ctx.strokeStyle = `rgba(${rgb}, 1)`;
            this.ctx.lineWidth = Math.max(1, size * 0.03);
            this.ctx.stroke();
        }
        
        // Inner detail / highlight
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.beginPath();
        this.ctx.rect(px, py, size, size/2);
        this.ctx.fill();
        
        this.ctx.restore();

        if (modifier) { // Draw modifier on top of block if present
            this.drawModifier(x, y, modifier, cellSize, gap, size, radius, true); // True to indicate drawing on a block
        }
    }

    private drawModifier(x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number, onBlock: boolean = false): void {
        this.ctx.save();
        if (onBlock) {
            this.ctx.globalAlpha = 0.8;
        }
        
        switch (modifier.type) {
            case 'GEM':
                this._drawGemModifier(x, y, cellSize, gap, size, radius);
                break;
            case 'BOMB':
                this._drawBombModifier(x, y, modifier, cellSize, gap, size, radius);
                break;
            case 'ICE':
            case 'CRACKED_ICE':
                this._drawIceModifier(x, y, modifier, cellSize, gap, size, radius);
                break;
        }

        this.ctx.restore();
    }

    private _drawGemModifier(x: number, y: number, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        this.ctx.fillStyle = MODIFIER_COLORS.GEM;
        this.ctx.strokeStyle = `rgba(${this.getRgb(MODIFIER_COLORS.GEM)}, 0.8)`;
        this.ctx.lineWidth = Math.max(1, cellSize * 0.05);
        this.ctx.shadowColor = MODIFIER_COLORS.GEM;
        this.ctx.shadowBlur = size * 0.4;
        
        this.ctx.beginPath();
        this.ctx.moveTo(px + size / 2, py);
        this.ctx.lineTo(px + size, py + size / 2);
        this.ctx.lineTo(px + size / 2, py + size);
        this.ctx.lineTo(px, py + size / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillRect(px + size * 0.2, py + size * 0.2, size * 0.1, size * 0.1);
        this.ctx.fillRect(px + size * 0.7, py + size * 0.3, size * 0.1, size * 0.1);
    }

    private _drawBombModifier(x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        const bombRgb = this.getRgb(MODIFIER_COLORS.BOMB);
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        this.ctx.fillStyle = `rgba(${bombRgb}, ${0.7 + pulse * 0.3})`;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + pulse * 0.2})`;
        this.ctx.lineWidth = Math.max(1, cellSize * 0.08);
        this.ctx.shadowColor = `rgba(${bombRgb}, ${0.8 + pulse * 0.2})`;
        this.ctx.shadowBlur = size * 0.6;

        this.drawRoundedRect(px, py, size, size, radius);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = `bold ${cellSize * 0.6}px Rajdhani`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = MODIFIER_COLORS.BOMB_TEXT;
        this.ctx.fillText(modifier.timer!.toString(), px + size / 2, py + size / 2 + cellSize * 0.05);
    }

    private _drawIceModifier(x: number, y: number, modifier: CellModifier, cellSize: number, gap: number, size: number, radius: number): void {
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;

        const iceRgb = this.getRgb(MODIFIER_COLORS.ICE);
        const crackedRgb = this.getRgb(MODIFIER_COLORS.CRACKED_ICE);
        const iceColor = modifier.type === 'ICE' ? iceRgb : crackedRgb;

        this.ctx.fillStyle = `rgba(${iceColor}, 0.7)`;
        this.ctx.strokeStyle = `rgba(${this.getRgb(COLORS.I)}, 0.4)`;
        this.ctx.lineWidth = Math.max(1, cellSize * 0.03);
        this.ctx.shadowColor = `rgba(${iceColor}, 0.5)`;
        this.ctx.shadowBlur = size * 0.3;

        this.drawRoundedRect(px, py, size, size, radius / 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
        this.ctx.fillRect(px, py, size, size * 0.3);
        this.ctx.fillRect(px + size * 0.7, py + size * 0.3, size * 0.3, size * 0.7);

        if (modifier.type === 'CRACKED_ICE') {
            this.ctx.strokeStyle = `rgba(0, 0, 0, 0.4)`;
            this.ctx.lineWidth = Math.max(1, cellSize * 0.05);
            this.ctx.beginPath();
            this.ctx.moveTo(px + size * 0.2, py + size * 0.3);
            this.ctx.lineTo(px + size * 0.8, py + size * 0.7);
            this.ctx.moveTo(px + size * 0.5, py + size * 0.1);
            this.ctx.lineTo(px + size * 0.5, py + size * 0.9);
            this.ctx.stroke();
        }
    }


    private drawGhost(player: Player, ghostY: number, config: RenderConfig, cellSize: number, gap: number, size: number, radius: number, isGhostWarning: boolean, lockStartTime: number, lockDelayDuration: number): void {
        const { ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, ghostShadow, flippedGravity } = config;
        const rgb = this.getRgb(player.tetromino.color);
        const now = Date.now();

        this.ctx.save();

        let displayRgb = rgb;
        let effectiveOpacity = ghostOpacity;
        let effectiveGlowIntensity = ghostGlowIntensity;
        let effectiveOutlineThickness = ghostOutlineThickness;
        let effectiveShadow = ghostShadow;
        let useDashed = false;

        if (isGhostWarning) {
            displayRgb = '255, 69, 0'; // Orange-Red for warning
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
        
        const pulseFactor = (Math.sin(now / 300) + 1) / 2; // Pulsing for neon/warning glow

        this.ctx.globalAlpha = effectiveOpacity;

        if (useDashed) {
            this.ctx.strokeStyle = `rgba(${displayRgb}, 0.6)`;
            this.ctx.lineWidth = Math.max(1, effectiveOutlineThickness);
            this.ctx.setLineDash([size * 0.25, size * 0.15]);
            this.ctx.fillStyle = `rgba(${displayRgb}, 0.05)`;
        } else {
            if (effectiveShadow) {
                // Extract color from shadow string for more control
                const shadowColorMatch = effectiveShadow.match(/rgba\((\d+,\s*\d+,\s*\d+),\s*([\d.]+)\)/);
                let shadowColorRgb = displayRgb;
                let shadowBaseAlpha = 0.6;
                if (shadowColorMatch) {
                    shadowColorRgb = shadowColorMatch[1];
                    shadowBaseAlpha = parseFloat(shadowColorMatch[2]);
                }

                this.ctx.shadowColor = `rgba(${shadowColorRgb}, ${shadowBaseAlpha + (pulseFactor * 0.3 * effectiveGlowIntensity)})`;
                this.ctx.shadowBlur = (effectiveShadow.includes('inset') ? 0 : parseFloat(effectiveShadow.split(' ')[1])) + (pulseFactor * size * 0.1 * effectiveGlowIntensity);
            }
            this.ctx.strokeStyle = `rgba(${displayRgb}, 0.9)`;
            this.ctx.lineWidth = Math.max(1, effectiveOutlineThickness);
            this.ctx.fillStyle = `rgba(${displayRgb}, ${isGhostWarning ? 0.25 : 0.15})`;
            this.ctx.setLineDash([]);
        }


        this.ctx.beginPath();
        player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
            row.forEach((value: TetrominoType | 0, x: number) => {
                if (value !== 0) {
                    const px = (x + player.pos.x) * cellSize + gap;
                    // Adjust py for flipped gravity
                    const py = (flippedGravity ? STAGE_HEIGHT - 1 - (y + ghostY) : (y + ghostY)) * cellSize + gap;
                    this.traceRoundedRect(px, py, size, size, radius);
                }
            });
        });

        this.ctx.fill();
        if (effectiveOutlineThickness > 0) {
            this.ctx.stroke();
        }
        this.ctx.restore();
    }


    private drawAiHint(engine: GameCore, aiHint: MoveScore, cellSize: number, gap: number, size: number, radius: number): void {
        const type = engine.player.tetromino.type;
        const flippedGravity = engine.flippedGravity;
        if (type && TETROMINOS[type]) {
             let aiShape: TetrominoShape = TETROMINOS[type].shape;
             for (let i = 0; i < aiHint.r; i++) aiShape = rotateMatrix(aiShape, 1);
             
             this.ctx.save();
             const pulse = (Math.sin(Date.now() / 300) + 1) / 2; 
             const alpha = 0.4 + pulse * 0.4;
             this.ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
             this.ctx.setLineDash([cellSize * 0.2, cellSize * 0.15]);
             this.ctx.lineWidth = Math.max(1, cellSize * 0.06);
             this.ctx.fillStyle = `rgba(255, 215, 0, 0.1)`; 
             
             this.ctx.beginPath();
             aiShape.forEach((row: TetrominoShape[number], dy: number) => {
                 row.forEach((cell: TetrominoType | 0, dx: number) => {
                     if (cell !== 0) {
                         const px = (aiHint.x + dx) * cellSize + gap;
                         // Adjust py for flipped gravity
                         const py = (flippedGravity ? STAGE_HEIGHT - 1 - (aiHint.y! + dy) : (aiHint.y! + dy)) * cellSize + gap;
                         this.traceRoundedRect(px, py, size, size, radius);
                     }
                 })
             });
             this.ctx.fill();
             this.ctx.stroke();
             this.ctx.restore();
        }
    }

    private drawActivePiece(engine: GameCore, config: RenderConfig, cellSize: number, gap: number, size: number, radius: number): void {
       const dropTime = engine.dropTime || 1000;
       const effectiveDropTime = engine.frenzyActive ? dropTime / engine.frenzyMultiplier : dropTime; // Faster drop in frenzy
       const offsetY = Math.min(1, engine.dropCounter / effectiveDropTime);
       // Adjust visualY based on flipped gravity for smooth dropping
       const visualY = engine.player.pos.y + (config.flippedGravity ? -offsetY : offsetY);
       
       // Calculate lock warning progress for the active piece
       const isLocking = config.lockWarningEnabled && engine.lockTimer !== null && engine.pieceIsGrounded;
       let lockProgress = 0;
       if (isLocking && engine.lockStartTime) {
           const elapsed = Date.now() - engine.lockStartTime;
           lockProgress = Math.min(1, Math.max(0, elapsed / engine.lockDelayDuration));
       }

       const color = engine.player.tetromino.color;
       
       engine.player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
         row.forEach((value: TetrominoType | 0, x: number) => {
           if (value !== 0) {
              this.ctx.save();
              // Adjust drawY for flipped gravity
              const drawY = config.flippedGravity ? STAGE_HEIGHT - 1 - (y + visualY) : (y + visualY);
              this.drawBlock(x + engine.player.pos.x, drawY, color, cellSize, gap, size, radius, { isLocking, progress: lockProgress });
              this.ctx.restore();
           }
         });
       });
       
       if (engine.lockResetFlash > 0.01) {
            this.ctx.save();
            this.ctx.globalAlpha = engine.lockResetFlash;
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            engine.player.tetromino.shape.forEach((row: TetrominoShape[number], y: number) => {
                row.forEach((value: TetrominoType | 0, x: number) => {
                    if (value !== 0) {
                         // Adjust drawY for flipped gravity
                         const drawY = config.flippedGravity ? STAGE_HEIGHT - 1 - (y + visualY) : (y + visualY);
                         const px = ((x + engine.player.pos.x) * cellSize) + (cellSize * 0.05);
                         const py = (drawY * cellSize) + (cellSize * 0.05);
                         this.traceRoundedRect(px, py, size, size, cellSize * 0.15);
                    }
                });
            });
            this.ctx.fill();
            this.ctx.restore();
            engine.lockResetFlash *= 0.85;
       } else {
           engine.lockResetFlash = 0;
       }
    }

    private drawComboB2BOverlay(engine: GameCore, cellSize: number): void {
        if (!engine.isBackToBack && engine.comboCount < 1) return;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'overlay'; // Blend mode for subtle effect

        const now = Date.now();
        const pulseFactor = (Math.sin(now / 200) + 1) / 2; // Fast pulse

        if (engine.isBackToBack) {
            this.ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + pulseFactor * 0.15})`; // Purple
            this.ctx.fillRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        }

        if (engine.comboCount > 0) {
            const comboAlpha = Math.min(0.5, 0.1 + engine.comboCount * 0.05); // Stronger alpha for higher combos
            this.ctx.fillStyle = `rgba(34, 197, 94, ${comboAlpha + pulseFactor * 0.1})`; // Green
            this.ctx.fillRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        }

        this.ctx.restore();
    }

    private drawGarbageIndicator(engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        if (engine.garbagePending === 0) return;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow effect

        const now = Date.now();
        const flicker = (Math.sin(now / 100) + 1) / 2; // Fast flicker
        const baseAlpha = Math.min(0.6, 0.2 + engine.garbagePending * 0.1); // Stronger alpha for more garbage

        this.ctx.fillStyle = `rgba(239, 68, 68, ${baseAlpha * (0.5 + flicker * 0.5)})`; // Red color

        // Draw rectangle overlays on the bottom 'garbagePending' rows (or top if flipped)
        for (let i = 0; i < Math.min(engine.garbagePending, STAGE_HEIGHT); i++) {
            const y = flippedGravity ? i : STAGE_HEIGHT - 1 - i;
            this.ctx.fillRect(0, y * cellSize, STAGE_WIDTH * cellSize, cellSize);
        }
        
        // Add a subtle border around the affected area
        this.ctx.strokeStyle = `rgba(255, 100, 0, ${baseAlpha * (0.8 + flicker * 0.2)})`; // Orange border
        this.ctx.lineWidth = Math.max(1, cellSize * 0.1);
        
        const startY = flippedGravity ? 0 : (STAGE_HEIGHT - Math.min(engine.garbagePending, STAGE_HEIGHT)) * cellSize;
        const height = Math.min(engine.garbagePending, STAGE_HEIGHT) * cellSize;
        this.ctx.strokeRect(0, startY, STAGE_WIDTH * cellSize, height);

        this.ctx.restore();
    }

    private drawFrenzyOverlay(engine: GameCore, cellSize: number): void {
        if (!engine.frenzyActive) return;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'overlay'; // Blend mode for subtle effect

        const now = Date.now();
        const pulse = (Math.sin(now / 150) + 1) / 2; // Fast, intense pulse
        const alpha = 0.2 + pulse * 0.2;

        this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; // Gold color
        this.ctx.shadowColor = `rgba(255, 215, 0, ${alpha * 1.5})`;
        this.ctx.shadowBlur = cellSize * (0.5 + pulse * 0.5);

        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }


    private drawOverlays(engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        // T-Spin Flash Overlay
        if (engine.tSpinFlash && engine.tSpinFlash > 0.01) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.globalAlpha = engine.tSpinFlash; // Use tSpinFlash as alpha
            this.ctx.fillStyle = 'rgba(217, 70, 239, 0.6)'; // More opaque purple
            this.ctx.shadowColor = 'rgba(217, 70, 239, 1)';
            this.ctx.shadowBlur = cellSize * 2 * engine.tSpinFlash; // Glow intensifies with flash
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
            engine.tSpinFlash *= 0.9; // Fast fade
        }

        // Floating Texts
        engine.floatingTexts.forEach((ft: FloatingText) => {
            this.ctx.save();
            this.ctx.globalAlpha = ft.life;
            this.ctx.textAlign = 'center';
            const fx = ft.x * cellSize + (cellSize * 2); 
            // Adjust fy based on flipped gravity for text drift direction
            // Floating text Y position is already updated by GameCore.update, so no need to add deltaTime here.
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
            
            this.ctx.fillStyle = textColor;
            // Scale animation: pop in, then shrink and fade
            const currentScale = ft.initialScale * (1 + 0.2 * ft.life) * (0.8 + 0.2 * ft.life);
            this.ctx.font = `bold ${cellSize * currentScale * 0.7}px Rajdhani`; // Scale font dynamically
            
            this.ctx.shadowColor = textShadowColor;
            this.ctx.shadowBlur = textShadowBlur; // Glow fades with life
            
            this.ctx.translate(fx, fy);
            this.ctx.fillText(ft.text, 0, 0);
            this.ctx.restore();
        });
    }

    private drawGimmicks(engine: GameCore, cellSize: number, flippedGravity: boolean): void {
        // Invisible Rows Gimmick
        const invisibleRowsGimmick = engine.adventureManager.config?.gimmicks?.find(g => g.type === 'INVISIBLE_ROWS');
        if (invisibleRowsGimmick && engine.adventureManager.invisibleRows.length > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.8; // Semi-transparent
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Dark overlay
            this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([cellSize * 0.1, cellSize * 0.1]);

            engine.adventureManager.invisibleRows.forEach(y => {
                const py = (flippedGravity ? STAGE_HEIGHT - 1 - y : y) * cellSize;
                this.ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
                this.ctx.strokeRect(0, py, STAGE_WIDTH * cellSize, cellSize);
            });
            this.ctx.restore();
        }
    }

    private drawBombSelectionOverlay(cellSize: number, bombSelectionRows: number[] | undefined, flippedGravity: boolean): void {
        if (!bombSelectionRows || bombSelectionRows.length === 0) return;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter'; // Additive blending
        this.ctx.globalAlpha = 0.5 + (Math.sin(Date.now() / 150) + 1) / 4; // Pulsing alpha

        this.ctx.fillStyle = `rgba(${this.getRgb(MODIFIER_COLORS.BOMB)}, 0.4)`;
        this.ctx.strokeStyle = `rgba(${this.getRgb(MODIFIER_COLORS.BOMB)}, 0.8)`;
        this.ctx.lineWidth = Math.max(1, cellSize * 0.1);
        this.ctx.shadowColor = MODIFIER_COLORS.BOMB;
        this.ctx.shadowBlur = cellSize * 0.8;

        bombSelectionRows.forEach(y => {
            const py = (flippedGravity ? STAGE_HEIGHT - 1 - y : y) * cellSize;
            this.ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
            this.ctx.strokeRect(0, py, STAGE_WIDTH * cellSize, cellSize);
        });

        this.ctx.restore();
    }

    // New: Draw Line Selection Overlay
    private drawLineSelectionOverlay(cellSize: number, selectedRow: number | null | undefined, flippedGravity: boolean): void {
        if (selectedRow === null || selectedRow === undefined) return;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter'; // Additive blending
        this.ctx.globalAlpha = 0.5 + (Math.sin(Date.now() / 100) + 1) / 4; // Pulsing alpha

        this.ctx.fillStyle = `rgba(${this.getRgb(MODIFIER_COLORS.LASER_BLOCK)}, 0.4)`;
        this.ctx.strokeStyle = `rgba(${this.getRgb(MODIFIER_COLORS.LASER_BLOCK)}, 0.8)`;
        this.ctx.lineWidth = Math.max(1, cellSize * 0.1);
        this.ctx.shadowColor = MODIFIER_COLORS.LASER_BLOCK;
        this.ctx.shadowBlur = cellSize * 0.8;

        const py = (flippedGravity ? STAGE_HEIGHT - 1 - selectedRow : selectedRow) * cellSize;
        this.ctx.fillRect(0, py, STAGE_WIDTH * cellSize, cellSize);
        this.ctx.strokeRect(0, py, STAGE_WIDTH * cellSize, cellSize);

        this.ctx.restore();
    }

    private calculateGhostY(stage: Board, player: Player, flippedGravity: boolean): number {
        let ghostY = player.pos.y;
        const shape = player.tetromino.shape;
        const moveIncrement = flippedGravity ? -1 : 1;
        // Boundary check adjusted for flipped gravity
        const boundaryCheck = (ny: number) => flippedGravity ? ny < 0 : ny >= STAGE_HEIGHT;

        for (let i = 0; i < STAGE_HEIGHT + 2; i++) { // Max iterations to go through whole board
           let collision = false;
           const nextY = ghostY + moveIncrement;
           for(let r=0; r<shape.length; r++) {
               for(let c=0; c<shape[r].length; c++) {
                   if(shape[r][c] !== 0) {
                       const ny = nextY + r;
                       const nx = player.pos.x + c;
                       // Collision check for boundaries or merged blocks
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

    private drawRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
        this.ctx.beginPath();
        this.traceRoundedRect(x, y, w, h, r);
        this.ctx.closePath();
    }

    private traceRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
    }
}