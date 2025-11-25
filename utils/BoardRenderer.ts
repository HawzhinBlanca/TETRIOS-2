
import { STAGE_WIDTH, STAGE_HEIGHT, COLORS, MODIFIER_COLORS } from '../constants';
import { BoardRenderConfig, Player, Board, CellModifier, TetrominoType, MoveScore, BlockSkin, CellState } from '../types';
import { GameCore } from './GameCore';
import { VISUAL_THEME } from './visualTheme';
import { SpriteManager } from './SpriteManager';

export type RenderConfig = BoardRenderConfig;

interface BeamEffect {
    x: number;
    startY: number;
    endY: number;
    color: string;
    life: number;
}

interface ClearingRowEffect {
    row: number;
    life: number;
}

export class BoardRenderer {
    private staticCtx: CanvasRenderingContext2D;
    private dynamicCtx: CanvasRenderingContext2D;
    private config: RenderConfig;
    private width: number = 0;
    private height: number = 0;
    private beams: BeamEffect[] = [];
    private clearingRows: ClearingRowEffect[] = [];
    
    private lastRenderedRevision: number = -1;
    private lastRenderedGravity: boolean = false;
    private lastRenderedSkin: BlockSkin = 'NEON';

    private spriteManager: SpriteManager;
    
    // Recoil Physics State
    private recoilOffset: number = 0;

    constructor(staticCtx: CanvasRenderingContext2D, dynamicCtx: CanvasRenderingContext2D, config: RenderConfig) {
        this.staticCtx = staticCtx;
        this.dynamicCtx = dynamicCtx;
        this.config = config;
        this.spriteManager = new SpriteManager();
    }

    public setSize(width: number, height: number, dpr: number) {
        this.width = width;
        this.height = height;
        
        if (this.staticCtx.canvas.width !== width * dpr || this.staticCtx.canvas.height !== height * dpr) {
            this.staticCtx.canvas.width = width * dpr;
            this.staticCtx.canvas.height = height * dpr;
            this.dynamicCtx.canvas.width = width * dpr;
            this.dynamicCtx.canvas.height = height * dpr;
            this.staticCtx.scale(dpr, dpr);
            this.dynamicCtx.scale(dpr, dpr);
            this.lastRenderedRevision = -1;
            
            // Clear sprite cache on resize
            this.spriteManager.clearCache();
        }
    }

    public updateConfig(config: RenderConfig) {
        // If skin changed, clear cache
        if (config.blockSkin !== this.config.blockSkin) {
            this.spriteManager.clearCache();
        }
        this.config = config;
    }

    public addBeam(x: number, startY: number, endY: number, color: string) {
        this.beams.push({ x, startY, endY, color, life: 1.0 });
        // Also apply recoil on hard drop impact
        this.recoilOffset = 6; 
    }

    public addClearingRows(rows: number[]) {
        rows.forEach(row => {
            this.clearingRows.push({ row, life: 1.0 });
        });
    }

    public render(engine: GameCore) {
        const { cellSize, flippedGravity, blockSkin } = this.config;
        
        // Decay Recoil
        if (Math.abs(this.recoilOffset) > 0.1) {
            this.recoilOffset *= 0.85;
        } else {
            this.recoilOffset = 0;
        }

        // Static Layer (Grid + Placed Blocks)
        if (this.lastRenderedRevision !== engine.boardManager.revision || 
            this.lastRenderedGravity !== flippedGravity ||
            this.lastRenderedSkin !== blockSkin) {
            
            this.staticCtx.clearRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
            
            // If recoil is active, force redraw of static layer
            if (this.recoilOffset !== 0) {
                // Force redraw next frame
                this.lastRenderedRevision = -1; 
            } else {
                this.lastRenderedRevision = engine.boardManager.revision;
            }
            
            this.staticCtx.save();
            if (this.recoilOffset !== 0) {
                this.staticCtx.translate(0, this.recoilOffset);
            }

            this.renderGrid(this.staticCtx, cellSize);
            this.renderBoard(this.staticCtx, engine.boardManager.stage, cellSize);
            this.staticCtx.restore();
            
            this.lastRenderedGravity = flippedGravity;
            this.lastRenderedSkin = blockSkin;
        }

        // Dynamic Layer (Active Piece, Ghosts, Effects)
        this.dynamicCtx.clearRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        this.dynamicCtx.save();
        if (this.recoilOffset !== 0) {
            this.dynamicCtx.translate(0, this.recoilOffset);
        }
        this.renderDynamic(engine, cellSize);
        this.renderComboHeat(this.dynamicCtx, engine, cellSize);
        this.dynamicCtx.restore();
    }

    private renderGrid(ctx: CanvasRenderingContext2D, cellSize: number) {
        ctx.beginPath();
        ctx.strokeStyle = VISUAL_THEME.GRID.COLOR; 
        ctx.lineWidth = VISUAL_THEME.GRID.WIDTH;
        if (this.config.blockSkin === 'RETRO') ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        
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

    private renderComboHeat(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number) {
        const combo = engine.scoreManager.comboCount;
        if (combo < 2) return;

        const intensity = Math.min(combo / 10, 1);
        let color = `rgba(34, 211, 238, ${intensity * 0.5})`; 
        if (combo > 5) color = `rgba(168, 85, 247, ${intensity * 0.6})`; 
        if (combo > 8) color = `rgba(250, 204, 21, ${intensity * 0.8})`; 

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4 + (intensity * 4);
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 * intensity;
        ctx.strokeRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);
        ctx.restore();
    }

    private renderBoard(ctx: CanvasRenderingContext2D, stage: Board, cellSize: number) {
        for (let y = 0; y < STAGE_HEIGHT; y++) {
            for (let x = 0; x < STAGE_WIDTH; x++) {
                const cell = stage[y][x];
                const type = cell[0];
                const state = cell[1];
                const modifier = cell[2];
                const colorOverride = cell[3];
                
                const drawY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - y : y;
                
                if (type) {
                    this.drawBlock(ctx, x, drawY, cellSize, type, state, modifier, 0, colorOverride);
                } else if (modifier) {
                    this.drawModifier(ctx, x, drawY, cellSize, modifier);
                }
            }
        }
    }

    private drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: TetrominoType | 'G', state: CellState = 'merged', modifier?: CellModifier, lockProgress: number = 0, colorOverride?: string) {
        const { blockSkin } = this.config;
        
        let sprite;
        if (colorOverride) {
            sprite = this.spriteManager.getBlockSprite(type, blockSkin, size, colorOverride);
        } else {
            sprite = this.spriteManager.getBlockSprite(type, blockSkin, size);
        }
        
        // Draw Sprite
        ctx.drawImage(sprite, x * size, y * size);

        // Zoned Visuals (Deferred Clear State)
        if (state === 'zoned') {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 215, 0, 0.4)'; // Gold tint
            ctx.fillRect(x * size, y * size, size, size);
            
            // Glitch overlay
            if (Math.random() > 0.8) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                const h = Math.random() * size;
                const oy = Math.random() * size;
                ctx.fillRect(x * size, y * size + oy, size, h * 0.2);
            }
            
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * size, y * size, size, size);
            ctx.restore();
        }

        // Lock Warning Visuals (Still drawn manually as they are dynamic)
        if (lockProgress > 0) {
            ctx.save();
            // Red tint increasing with progress
            ctx.fillStyle = `rgba(255, 50, 50, ${lockProgress * 0.3})`;
            ctx.fillRect(x * size, y * size, size, size);
            
            // White pulse overlay
            const pulse = (Math.sin(Date.now() / 60) + 1) / 2; 
            const whiteAlpha = pulse * lockProgress * 0.4;
            ctx.fillStyle = `rgba(255, 255, 255, ${whiteAlpha})`;
            ctx.fillRect(x * size, y * size, size, size);
            
            // Warning Border
            ctx.strokeStyle = `rgba(255, 255, 255, ${lockProgress})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x * size, y * size, size, size);
            ctx.restore();
        }

        if (modifier) {
            this.drawModifier(ctx, x, y, size, modifier);
        }
    }

    private drawModifier(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, modifier: CellModifier) {
        const color = MODIFIER_COLORS[modifier.type] || '#fff';
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (modifier.type === 'CRACKED_ICE') ctx.setLineDash([size * 0.2, size * 0.1]);
        ctx.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);
        if (modifier.type === 'BOMB' && modifier.timer !== undefined) {
            ctx.fillStyle = '#fff';
            ctx.font = `900 ${size * 0.6}px "Rajdhani", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 4;
            ctx.fillText(modifier.timer.toString(), x * size + size / 2, y * size + size / 2 + 1);
        }
        ctx.restore();
    }

    private renderDynamic(engine: GameCore, cellSize: number) {
        const ctx = this.dynamicCtx;
        const player = engine.pieceManager.player;
        const ghostY = this.calculateGhostY(engine, engine.boardManager.stage, player, this.config.flippedGravity);
        
        this.drawPredictiveClear(ctx, engine, player, ghostY, cellSize, this.config.flippedGravity);

        const isGhostWarning = this.config.lockWarningEnabled && engine.pieceManager.pieceIsGrounded && engine.pieceManager.lockTimer !== null;
        this.drawGhost(ctx, player, ghostY, cellSize, isGhostWarning);
        
        // Draw Motion Trails
        this.drawTrails(ctx, player, cellSize);

        this.drawActivePiece(ctx, engine, cellSize);

        if (isGhostWarning) this.drawLockTimer(ctx, engine, player, cellSize);
        this.renderOverlays(ctx, cellSize);

        if (this.config.showAi && this.config.aiHint) this.drawAiHint(ctx, this.config.aiHint, cellSize);
        this.renderEffects(ctx, cellSize);
    }

    private drawTrails(ctx: CanvasRenderingContext2D, player: Player, cellSize: number) {
        if (!player.trail || player.trail.length === 0) return;
        const { flippedGravity } = this.config;
        const shape = player.tetromino.shape;

        ctx.save();
        player.trail.forEach((pos, index) => {
            const opacity = (index + 1) / (player.trail.length + 2) * 0.2; // 0.05 to 0.2
            ctx.globalAlpha = opacity;
            
            shape.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val !== 0) {
                        const boardY = pos.y + y;
                        const drawY = flippedGravity ? STAGE_HEIGHT - 1 - boardY : boardY;
                        const drawX = pos.x + x;
                        
                        // Use override color if present
                        ctx.fillStyle = player.colorOverride || player.tetromino.color;
                        ctx.fillRect(drawX * cellSize, drawY * cellSize, cellSize, cellSize);
                    }
                });
            });
        });
        ctx.restore();
    }

    private calculateGhostY(engine: GameCore, stage: Board, player: Player, flippedGravity: boolean): number {
        let ghostY = player.pos.y;
        const moveY = flippedGravity ? -1 : 1;
        while (!engine.collisionManager.checkCollision(player, stage, { x: 0, y: ghostY + moveY - player.pos.y }, flippedGravity)) {
            ghostY += moveY;
        }
        return ghostY;
    }

    private drawPredictiveClear(ctx: CanvasRenderingContext2D, engine: GameCore, player: Player, ghostY: number, cellSize: number, flippedGravity: boolean): void {
        const predictedRowsToClear: number[] = [];
        const shape = player.tetromino.shape;
        const stage = engine.boardManager.stage;
        const affectedRows = new Set<number>();
        
        shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) {
                    const boardY = y + ghostY;
                    if (boardY >= 0 && boardY < STAGE_HEIGHT) affectedRows.add(boardY);
                }
            });
        });

        affectedRows.forEach(y => {
            let occupiedCount = 0;
            for (let x = 0; x < STAGE_WIDTH; x++) {
                // In Zone mode, 'zoned' cells count as empty for clearing prediction purposes (they are already cleared)
                // Wait, no, predictive clear shows if placing piece *completes* a row.
                // If a row has 'zoned' cells, it is technically full of zoned cells.
                // We only care if *active* placement fills the *remaining* holes in a *merged* row.
                // Zoned rows are already pushed to bottom.
                
                const cell = stage[y][x];
                const isBoardFilled = cell[1] !== 'clear';
                
                const ghostRelY = y - ghostY;
                const ghostRelX = x - player.pos.x;
                let isGhostFilled = false;
                if (ghostRelY >= 0 && ghostRelY < shape.length && ghostRelX >= 0 && ghostRelX < shape[0].length) {
                    if (shape[ghostRelY][ghostRelX] !== 0) isGhostFilled = true;
                }
                
                if (isBoardFilled || isGhostFilled) occupiedCount++;
            }
            if (occupiedCount === STAGE_WIDTH) predictedRowsToClear.push(y);
        });

        if (predictedRowsToClear.length > 0) {
            ctx.save();
            const alpha = 0.2 + (Math.sin(Date.now() / 100) * 0.1); 
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 15;
            predictedRowsToClear.forEach(y => {
                const drawY = flippedGravity ? STAGE_HEIGHT - 1 - y : y;
                ctx.fillRect(0, drawY * cellSize, STAGE_WIDTH * cellSize, cellSize);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(0, drawY * cellSize, 4, cellSize);
                ctx.fillRect(STAGE_WIDTH * cellSize - 4, drawY * cellSize, 4, cellSize);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            });
            ctx.restore();
        }
    }

    private drawLockTimer(ctx: CanvasRenderingContext2D, engine: GameCore, player: Player, cellSize: number) {
        const startTime = engine.pieceManager.lockStartTime;
        const duration = engine.pieceManager.lockDelayDuration;
        if (!startTime) return;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const remaining = 1 - progress;
        const shape = player.tetromino.shape;
        const centerX = (player.pos.x + shape[0].length / 2) * cellSize;
        const centerY = (this.config.flippedGravity 
            ? STAGE_HEIGHT - 1 - (player.pos.y + shape.length / 2) 
            : player.pos.y + shape.length / 2) * cellSize;
        const radius = (cellSize * shape.length) / 1.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, (-Math.PI / 2) + (remaining * Math.PI * 2));
        ctx.lineWidth = 4;
        ctx.strokeStyle = `hsl(${120 * remaining}, 100%, 50%)`; 
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.restore();
    }

    private drawGhost(ctx: CanvasRenderingContext2D, player: Player, ghostY: number, cellSize: number, isWarning: boolean) {
        const { ghostOpacity, ghostStyle, ghostOutlineThickness, ghostGlowIntensity, flippedGravity } = this.config;
        const shape = player.tetromino.shape;
        let alpha = ghostOpacity;
        let color = player.colorOverride || player.tetromino.color;
        let glowScale = ghostGlowIntensity;

        if (isWarning) {
            const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
            alpha = ghostOpacity + (pulse * (1 - ghostOpacity));
            color = '#ff4500';
            glowScale *= 1.5;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = ghostOutlineThickness;
        if (ghostStyle === 'dashed') ctx.setLineDash([cellSize * 0.25, cellSize * 0.25]);
        else if (ghostStyle === 'neon') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15 * glowScale;
        }

        shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) {
                    const drawY = flippedGravity ? STAGE_HEIGHT - 1 - (ghostY + y) : (ghostY + y);
                    const px = (player.pos.x + x) * cellSize;
                    const py = drawY * cellSize;
                    if (ghostStyle === 'solid') {
                        ctx.save();
                        ctx.globalAlpha = alpha * 0.6;
                        ctx.fillRect(px, py, cellSize, cellSize);
                        ctx.restore();
                        if (ghostOutlineThickness > 0) {
                            ctx.save();
                            ctx.globalAlpha = alpha;
                            const offset = ghostOutlineThickness / 2;
                            ctx.strokeRect(px + offset, py + offset, cellSize - ghostOutlineThickness, cellSize - ghostOutlineThickness);
                            ctx.restore();
                        }
                    } else {
                        if (ghostStyle === 'neon') {
                            ctx.save();
                            ctx.globalAlpha = alpha * 0.15;
                            ctx.shadowBlur = 0;
                            ctx.fillRect(px, py, cellSize, cellSize);
                            ctx.restore();
                        }
                        ctx.strokeRect(px, py, cellSize, cellSize);
                    }
                }
            });
        });
        ctx.restore();
    }

    private drawActivePiece(ctx: CanvasRenderingContext2D, engine: GameCore, cellSize: number) {
        const { flippedGravity } = this.config;
        const player = engine.pieceManager.player;
        const shape = player.tetromino.shape;
        let offsetX = 0;
        let offsetY = 0;
        let lockProgress = 0;

        if (engine.pieceManager.lockStartTime) {
            const elapsed = Date.now() - engine.pieceManager.lockStartTime;
            lockProgress = Math.min(1, elapsed / engine.pieceManager.lockDelayDuration);
            
            if (lockProgress > 0.7) {
                const intensity = (lockProgress - 0.7) * 0.1 * cellSize;
                offsetX = (Math.random() - 0.5) * intensity;
                offsetY = (Math.random() - 0.5) * intensity;
            }
        }

        shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) {
                    const boardY = player.pos.y + y;
                    const drawY = flippedGravity ? STAGE_HEIGHT - 1 - boardY : boardY;
                    const drawX = player.pos.x + x;
                    this.drawBlock(ctx, drawX + (offsetX / cellSize), drawY + (offsetY / cellSize), cellSize, player.tetromino.type, 'merged', undefined, lockProgress, player.colorOverride);
                }
            });
        });
    }

    private renderOverlays(ctx: CanvasRenderingContext2D, cellSize: number) {
        if (this.config.bombSelectionRows) {
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            this.config.bombSelectionRows.forEach(y => {
                const drawY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - y : y;
                ctx.fillRect(0, drawY * cellSize, STAGE_WIDTH * cellSize, cellSize);
            });
            ctx.restore();
        }
        if (this.config.lineClearerSelectedRow !== null && this.config.lineClearerSelectedRow !== undefined) {
            const y = this.config.lineClearerSelectedRow;
            const drawY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - y : y;
            ctx.save();
            ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
            ctx.shadowColor = 'cyan';
            ctx.shadowBlur = 15;
            ctx.fillRect(0, drawY * cellSize, STAGE_WIDTH * cellSize, cellSize);
            ctx.restore();
        }
    }

    private drawAiHint(ctx: CanvasRenderingContext2D, hint: MoveScore, cellSize: number) {
        if (!hint) return;
        const drawY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - hint.y! : hint.y!;
        ctx.save();
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2; 
        ctx.globalAlpha = 0.3 + (pulse * 0.2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'; 
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -Date.now() / 20; 
        const width = hint.type === 'I' ? 4 : (hint.type === 'O' ? 2 : 3);
        const height = hint.type === 'I' ? 1 : 2; 
        ctx.strokeRect(hint.x * cellSize, drawY * cellSize, width * cellSize, height * cellSize);
        ctx.fillStyle = 'gold';
        ctx.font = `bold ${cellSize/2}px monospace`;
        ctx.fillText("AI", hint.x * cellSize, drawY * cellSize - 2);
        ctx.restore();
    }

    private renderEffects(ctx: CanvasRenderingContext2D, cellSize: number) {
        this.beams = this.beams.filter(beam => {
            beam.life -= 0.05;
            ctx.save();
            ctx.globalAlpha = beam.life;
            ctx.fillStyle = beam.color;
            ctx.shadowColor = beam.color;
            ctx.shadowBlur = 10 * beam.life;
            const startY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - beam.startY : beam.startY;
            const endY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - beam.endY : beam.endY;
            const y = Math.min(startY, endY);
            const h = Math.abs(endY - startY) + 1;
            ctx.fillRect(beam.x * cellSize, y * cellSize, cellSize, h * cellSize);
            ctx.restore();
            return beam.life > 0;
        });
        this.clearingRows = this.clearingRows.filter(effect => {
            effect.life -= 0.08; 
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${effect.life})`;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 20 * effect.life;
            const drawY = this.config.flippedGravity ? STAGE_HEIGHT - 1 - effect.row : effect.row;
            ctx.fillRect(0, drawY * cellSize, STAGE_WIDTH * cellSize, cellSize);
            ctx.restore();
            return effect.life > 0;
        });
    }
}
