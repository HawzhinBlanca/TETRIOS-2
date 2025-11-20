
import { GameCore } from './GameCore';
import { STAGE_WIDTH, STAGE_HEIGHT, COLORS, TETROMINOS } from '../constants';
import { audioManager } from './audioManager';
import { rotateMatrix } from './gameUtils';

export interface RenderConfig {
    cellSize: number;
    ghostStyle: 'neon' | 'dashed' | 'solid';
    ghostOpacity: number;
    ghostOutlineThickness: number;
    ghostGlowIntensity: number;
    ghostShadow?: string;
    lockWarningEnabled: boolean;
    showAi: boolean;
    aiHint?: any; 
}

export class BoardRenderer {
    private ctx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;
    private rgbCache: Map<string, string> = new Map();

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public setSize(width: number, height: number, dpr: number) {
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

    public render(engine: GameCore, config: RenderConfig) {
        const { cellSize } = config;
        const gap = cellSize * 0.05;
        const size = cellSize - (gap * 2);
        const radius = cellSize * 0.12;

        // Clear frame
        this.ctx.clearRect(0, 0, STAGE_WIDTH * cellSize, STAGE_HEIGHT * cellSize);

        // 1. Grid
        this.drawGrid(cellSize);

        // 2. Stage (Static Blocks)
        this.drawStage(engine.stage, cellSize, gap, size, radius);

        const hasBlocks = engine.player.tetromino.shape.some((row: any[]) => row.some((cell: any) => cell !== 0));
        
        if (hasBlocks) {
            const ghostY = this.calculateGhostY(engine.stage, engine.player);

            // 3. Ghost Piece (Batched Path Optimization)
            this.drawGhost(engine.player, ghostY, config, cellSize, gap, size, radius);

            // 4. AI Hint
            if (config.showAi && config.aiHint && config.aiHint.y !== undefined) {
                this.drawAiHint(engine, config.aiHint, cellSize, gap, size, radius);
            }

            // 5. Active Piece
            this.drawActivePiece(engine, config, cellSize, gap, size, radius);
        }

        // 6. Visual Effects / Overlays
        this.drawOverlays(engine, cellSize);
    }

    private drawGrid(cellSize: number) {
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

    private drawStage(stage: any[][], cellSize: number, gap: number, size: number, radius: number) {
        stage.forEach((row, y) => {
            row.forEach((cell: any, x: number) => {
                if (cell[1] !== 'clear') {
                    const color = COLORS[cell[0] as keyof typeof COLORS] || 'rgb(255,255,255)';
                    this.ctx.save();
                    this.drawBlock(x, y, color, cellSize, gap, size, radius);
                    this.ctx.restore();
                }
            });
        });
    }

    private drawBlock(x: number, y: number, color: string, cellSize: number, gap: number, size: number, radius: number, lockData?: { isLocking: boolean, progress: number }) {
        const rgb = this.getRgb(color);
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;
        
        const isLocking = lockData?.isLocking || false;
        const progress = lockData?.progress || 0;
        const pulse = isLocking ? (Math.sin(Date.now() / (60 - (progress * 40))) + 1) / 2 : 0;

        if (isLocking) {
            this.ctx.shadowColor = `rgba(255, 255, 255, ${0.6 + (pulse * 0.4) + (progress * 0.4)})`;
            this.ctx.shadowBlur = size * 0.6 + (pulse * size * 0.3) + (progress * size * 0.5);
            this.ctx.fillStyle = `rgba(${rgb}, 0.9)`;
        } else {
            this.ctx.fillStyle = `rgba(${rgb}, 0.9)`;
            this.ctx.shadowColor = `rgba(${rgb}, 0.8)`;
            this.ctx.shadowBlur = size * 0.5;
        }

        this.drawRoundedRect(px, py, size, size, radius / 1.5);
        this.ctx.fill();
        
        if (isLocking) {
            const overlayOpacity = 0.1 + (progress * 0.4) + (pulse * 0.1);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${overlayOpacity})`;
            this.ctx.beginPath();
            this.drawRoundedRect(px, py, size, size, radius / 1.5);
            this.ctx.fill();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + (progress * 0.2)})`;
            this.ctx.lineWidth = Math.max(1, size * 0.06);
        } else {
            this.ctx.strokeStyle = `rgba(${rgb}, 1)`;
            this.ctx.lineWidth = Math.max(1, size * 0.03);
        }

        // Inner highlight
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.beginPath();
        this.ctx.rect(px, py, size, size/2);
        this.ctx.fill();
        
        this.ctx.stroke();
    }

    private drawGhost(player: any, ghostY: number, config: RenderConfig, cellSize: number, gap: number, size: number, radius: number) {
        const { ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, ghostShadow } = config;
        const rgb = this.getRgb(player.tetromino.color);
        const pulseFactor = (Math.sin(Date.now() / 300) + 1) / 2;

        this.ctx.save();
        this.ctx.globalAlpha = ghostOpacity;

        // 1. Configure Styles
        if (ghostStyle === 'dashed') {
            this.ctx.strokeStyle = `rgba(${rgb}, 0.6)`;
            this.ctx.lineWidth = Math.max(1, ghostOutlineThickness);
            this.ctx.setLineDash([size * 0.25, size * 0.15]); 
            this.ctx.fillStyle = `rgba(${rgb}, 0.05)`;
        } else if (ghostStyle === 'solid') {
            this.ctx.fillStyle = `rgba(${rgb}, 0.5)`; 
            this.ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
            this.ctx.lineWidth = ghostOutlineThickness;
        } else { // Neon
            this.ctx.shadowColor = ghostShadow || `rgba(${rgb}, 1)`; 
            const baseBlur = size * 0.4 * ghostGlowIntensity;
            const pulseBlur = size * 0.2 * ghostGlowIntensity * pulseFactor;
            this.ctx.shadowBlur = baseBlur + pulseBlur;
            this.ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
            this.ctx.lineWidth = Math.max(1, ghostOutlineThickness);
            this.ctx.fillStyle = `rgba(${rgb}, 0.15)`;
        }

        // 2. Batch Path Construction
        // We trace the path for ALL blocks first, then stroke/fill once.
        // This creates a unified shape look rather than individual blocks overlapping.
        this.ctx.beginPath();
        player.tetromino.shape.forEach((row: any, y: number) => {
            row.forEach((value: any, x: number) => {
                if (value !== 0) {
                    const px = (x + player.pos.x) * cellSize + gap;
                    const py = (y + ghostY) * cellSize + gap;
                    this.traceRoundedRect(px, py, size, size, radius);
                }
            });
        });

        // 3. Render Batch
        this.ctx.fill();
        if (ghostOutlineThickness > 0) {
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    private drawAiHint(engine: GameCore, aiHint: any, cellSize: number, gap: number, size: number, radius: number) {
        const type = engine.player.tetromino.type;
        if (type && TETROMINOS[type]) {
             let aiShape = TETROMINOS[type].shape;
             for (let i = 0; i < aiHint.r; i++) aiShape = rotateMatrix(aiShape, 1);
             
             this.ctx.save();
             const pulse = (Math.sin(Date.now() / 300) + 1) / 2; 
             const alpha = 0.4 + pulse * 0.4;
             this.ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`; 
             this.ctx.setLineDash([cellSize * 0.2, cellSize * 0.15]);
             this.ctx.lineWidth = Math.max(1, cellSize * 0.06);
             this.ctx.fillStyle = `rgba(255, 215, 0, 0.1)`; 
             
             this.ctx.beginPath();
             aiShape.forEach((row: any[], dy: number) => {
                 row.forEach((cell: any, dx: number) => {
                     if (cell !== 0) {
                         const px = (aiHint.x + dx) * cellSize + gap;
                         const py = (aiHint.y! + dy) * cellSize + gap;
                         this.traceRoundedRect(px, py, size, size, radius);
                     }
                 })
             });
             this.ctx.fill();
             this.ctx.stroke();
             this.ctx.restore();
        }
    }

    private drawActivePiece(engine: GameCore, config: RenderConfig, cellSize: number, gap: number, size: number, radius: number) {
       const dropTime = engine.dropTime || 1000;
       const offsetY = Math.min(1, engine.dropCounter / dropTime);
       const visualY = engine.player.pos.y + offsetY;
       
       const isLocking = config.lockWarningEnabled && (engine.lockTimer !== null);
       let lockProgress = 0;
       if (isLocking && engine.lockStartTime) {
           const elapsed = Date.now() - engine.lockStartTime;
           lockProgress = Math.min(1, Math.max(0, elapsed / (engine.lockDelayDuration || 500)));
       }

       const color = engine.player.tetromino.color;
       
       engine.player.tetromino.shape.forEach((row: any, y: number) => {
         row.forEach((value: any, x: number) => {
           if (value !== 0) {
              this.ctx.save();
              this.drawBlock(x + engine.player.pos.x, y + visualY, color, cellSize, gap, size, radius, { isLocking, progress: lockProgress });
              this.ctx.restore();
           }
         });
       });
       
       // Lock Reset Flash Overlay
       if (engine.lockResetFlash > 0.01) {
            this.ctx.save();
            this.ctx.globalAlpha = engine.lockResetFlash;
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            engine.player.tetromino.shape.forEach((row: any, y: number) => {
                row.forEach((value: any, x: number) => {
                    if (value !== 0) {
                         const px = ((x + engine.player.pos.x) * cellSize) + (cellSize * 0.05);
                         const py = ((y + visualY) * cellSize) + (cellSize * 0.05);
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

    private drawOverlays(engine: GameCore, cellSize: number) {
        // T-Spin Flash
        if (engine.tSpinFlash && engine.tSpinFlash > 0.01) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.globalAlpha = engine.tSpinFlash;
            this.ctx.fillStyle = 'rgba(217, 70, 239, 0.4)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
            engine.tSpinFlash *= 0.9;
        }

        // Floating Texts
        engine.floatingTexts.forEach((ft: any) => {
            this.ctx.save();
            this.ctx.globalAlpha = ft.life;
            this.ctx.fillStyle = ft.color;
            this.ctx.font = `bold ${cellSize * 0.7}px Rajdhani`;
            this.ctx.shadowColor = ft.color;
            this.ctx.shadowBlur = cellSize * 0.3;
            this.ctx.textAlign = 'center';
            const fx = ft.x * cellSize + (cellSize * 2); 
            const fy = ft.y * cellSize;
            this.ctx.translate(fx, fy);
            this.ctx.scale(ft.scale + 1, ft.scale + 1);
            this.ctx.fillText(ft.text, 0, 0);
            this.ctx.restore();
        });
    }

    private calculateGhostY(stage: any[][], player: any): number {
        let ghostY = player.pos.y;
        const shape = player.tetromino.shape;
        for (let i = 0; i < STAGE_HEIGHT + 2; i++) {
           let collision = false;
           const nextY = ghostY + 1;
           for(let r=0; r<shape.length; r++) {
               for(let c=0; c<shape[r].length; c++) {
                   if(shape[r][c] !== 0) {
                       const ny = nextY + r;
                       const nx = player.pos.x + c;
                       if(ny >= STAGE_HEIGHT || (ny >= 0 && stage[ny][nx][1] !== 'clear')) {
                           collision = true;
                       }
                   }
               }
           }
           if(collision) break;
           ghostY++;
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

    private drawRoundedRect(x: number, y: number, w: number, h: number, r: number) {
        this.ctx.beginPath();
        this.traceRoundedRect(x, y, w, h, r);
        this.ctx.closePath();
    }

    private traceRoundedRect(x: number, y: number, w: number, h: number, r: number) {
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.lineTo(x + r, y); // Close the loop cleanly
    }
}
