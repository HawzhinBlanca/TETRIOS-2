
import React, { useRef, useEffect } from 'react';
import { MoveScore } from '../types';
import { COLORS, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS } from '../constants';
import { rotateMatrix } from '../utils/gameUtils';
import { audioManager } from '../utils/audioManager';
import { GameCore } from '../utils/GameCore';

interface Props {
  engine: React.MutableRefObject<GameCore>;
  aiHint: MoveScore | null;
  showAi: boolean;
  cellSize?: number; 
  ghostStyle?: 'neon' | 'dashed' | 'solid';
  ghostOpacity?: number;
  ghostOutlineThickness?: number;
  ghostGlowIntensity?: number;
  ghostShadow?: string;
  lockWarningEnabled?: boolean;
}

// --- RENDER HELPERS ---

const RGB_CACHE: Record<string, string> = {};
const getRgbString = (color: string): string => {
    if (RGB_CACHE[color]) return RGB_CACHE[color];
    const matches = color.match(/\d+/g);
    const res = matches ? matches.join(',') : '255,255,255';
    RGB_CACHE[color] = res;
    return res;
};

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const calculateGhostY = (stage: any[][], player: any): number => {
    let ghostY = player.pos.y;
    const shape = player.tetromino.shape;
    const hasBlocks = shape.some((row: any[]) => row.some((cell: any) => cell !== 0));
    if (!hasBlocks) return ghostY;

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
};

// --- SPECIALIZED DRAW FUNCTIONS ---

const drawGhostPiece = (
    ctx: CanvasRenderingContext2D, 
    player: any, 
    ghostY: number,
    cellSize: number,
    gap: number,
    size: number, 
    radius: number, 
    config: { style: string, opacity: number, thickness: number, glow: number, shadow?: string }
) => {
    const { style, opacity, thickness, glow, shadow } = config;
    const rgb = getRgbString(player.tetromino.color);
    const pulseFactor = (Math.sin(Date.now() / 300) + 1) / 2;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Apply styles once for the whole piece to optimize performance
    if (style === 'dashed') {
        ctx.strokeStyle = `rgba(${rgb}, 0.6)`;
        ctx.lineWidth = Math.max(1, thickness);
        ctx.setLineDash([size * 0.25, size * 0.15]); 
        ctx.fillStyle = `rgba(${rgb}, 0.05)`;
    } else if (style === 'solid') {
        ctx.fillStyle = `rgba(${rgb}, 0.5)`; 
        if (thickness > 0) {
            ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
            ctx.lineWidth = thickness;
        }
    } else { 
        // Neon (Default)
        ctx.shadowColor = shadow || `rgba(${rgb}, 1)`; 
        const baseBlur = size * 0.4 * glow;
        const pulseBlur = size * 0.2 * glow * pulseFactor;
        ctx.shadowBlur = baseBlur + pulseBlur;
        ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
        ctx.lineWidth = Math.max(1, thickness);
        ctx.fillStyle = `rgba(${rgb}, 0.15)`;
    }

    player.tetromino.shape.forEach((row: any, y: number) => {
        row.forEach((value: any, x: number) => {
            if (value !== 0) {
                const px = (x + player.pos.x) * cellSize + gap;
                const py = (y + ghostY) * cellSize + gap;
                
                drawRoundedRect(ctx, px, py, size, size, radius);
                
                if (style === 'dashed') {
                    if (thickness > 0) ctx.stroke();
                    ctx.fill();
                } else if (style === 'solid') {
                    ctx.fill();
                    if (thickness > 0) ctx.stroke();
                } else { // Neon
                    if (thickness > 0) ctx.stroke();
                    ctx.fill();
                }
            }
        });
    });

    ctx.restore();
};

const drawActiveCell = (ctx: CanvasRenderingContext2D, px: number, py: number, size: number, radius: number, rgb: string, lockData: any) => {
    const { isLocking, progress } = lockData;
    const pulse = isLocking ? (Math.sin(Date.now() / (60 - (progress * 40))) + 1) / 2 : 0;

    if (isLocking) {
        ctx.shadowColor = `rgba(255, 255, 255, ${0.6 + (pulse * 0.4) + (progress * 0.4)})`;
        ctx.shadowBlur = size * 0.6 + (pulse * size * 0.3) + (progress * size * 0.5);
        ctx.fillStyle = `rgba(${rgb}, 0.9)`;
    } else {
        ctx.fillStyle = `rgba(${rgb}, 0.9)`;
        ctx.shadowColor = `rgba(${rgb}, 0.8)`;
        ctx.shadowBlur = size * 0.5;
    }

    drawRoundedRect(ctx, px, py, size, size, radius / 1.5);
    ctx.fill();
    
    if (isLocking) {
        const overlayOpacity = 0.1 + (progress * 0.4) + (pulse * 0.1);
        ctx.fillStyle = `rgba(255, 255, 255, ${overlayOpacity})`;
        ctx.beginPath();
        drawRoundedRect(ctx, px, py, size, size, radius / 1.5);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + (progress * 0.2)})`;
        ctx.lineWidth = Math.max(1, size * 0.06);
    } else {
        ctx.strokeStyle = `rgba(${rgb}, 1)`;
        ctx.lineWidth = Math.max(1, size * 0.03);
    }

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.rect(px, py, size, size/2);
    ctx.fill();
    
    ctx.stroke();
};

// --- MAIN COMPONENT ---

const BoardCanvas: React.FC<Props> = ({ 
  engine,
  aiHint, 
  showAi, 
  cellSize = 30, 
  ghostStyle = 'neon',
  ghostOpacity = 0.6,
  ghostOutlineThickness = 2,
  ghostGlowIntensity = 1.0,
  ghostShadow,
  lockWarningEnabled = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !engine.current) return;

    const e = engine.current;
    const { stage, player, floatingTexts } = e;
    const hasBlocks = player.tetromino.shape.some((row: any[]) => row.some((cell: any) => cell !== 0));
    const ghostY = calculateGhostY(stage, player);

    // Setup Canvas
    const dpr = window.devicePixelRatio || 1;
    const logicWidth = STAGE_WIDTH * cellSize;
    const logicHeight = STAGE_HEIGHT * cellSize;
    if (canvas.width !== logicWidth * dpr || canvas.height !== logicHeight * dpr) {
        canvas.width = logicWidth * dpr;
        canvas.height = logicHeight * dpr;
        canvas.style.width = `${logicWidth}px`;
        canvas.style.height = `${logicHeight}px`;
        ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, logicWidth, logicHeight);

    // Cell Config
    const gap = cellSize * 0.05; 
    const size = cellSize - (gap * 2); 
    const radius = cellSize * 0.12; 

    // Draw Grid
    let gridAlpha = 0.05;
    const audioData = audioManager.getFrequencyData();
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
      ctx.lineTo(x * cellSize, logicHeight);
    }
    for (let y = 0; y <= STAGE_HEIGHT; y++) {
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(logicWidth, y * cellSize);
    }
    ctx.stroke();

    // Draw Static Blocks
    stage.forEach((row: any, y: number) => {
      row.forEach((cell: any, x: number) => {
        if (cell[1] !== 'clear') {
           const type = cell[0];
           const color = COLORS[type] || 'rgb(255,255,255)';
           const rgb = getRgbString(color);
           ctx.save();
           drawActiveCell(ctx, x * cellSize + gap, y * cellSize + gap, size, radius, rgb, { isLocking: false, progress: 0 });
           ctx.restore();
        }
      });
    });

    // Draw Ghost Piece
    if (hasBlocks) {
       drawGhostPiece(ctx, player, ghostY, cellSize, gap, size, radius, {
           style: ghostStyle || 'neon',
           opacity: ghostOpacity || 0.6,
           thickness: ghostOutlineThickness ?? 2,
           glow: ghostGlowIntensity || 1.0,
           shadow: ghostShadow
       });
    }

    // Draw AI Hint
    if (showAi && aiHint && aiHint.y !== undefined) {
        const type = e.player.tetromino.type;
        if (type && TETROMINOS[type]) {
             let aiShape = TETROMINOS[type].shape;
             for (let i = 0; i < aiHint.r; i++) aiShape = rotateMatrix(aiShape, 1);
             
             aiShape.forEach((row: any[], dy: number) => {
                 row.forEach((cell: any, dx: number) => {
                     if (cell !== 0) {
                         ctx.save();
                         const pulse = (Math.sin(Date.now() / 300) + 1) / 2; 
                         const alpha = 0.4 + pulse * 0.4;
                         ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`; 
                         ctx.setLineDash([cellSize * 0.2, cellSize * 0.15]);
                         ctx.lineWidth = Math.max(1, cellSize * 0.06);
                         ctx.fillStyle = `rgba(255, 215, 0, 0.1)`; 
                         drawRoundedRect(ctx, (aiHint.x + dx) * cellSize + gap, (aiHint.y! + dy) * cellSize + gap, size, size, radius);
                         ctx.fill();
                         ctx.stroke();
                         ctx.restore();
                     }
                 })
             });
        }
    }

    // Draw Active Piece
    if (hasBlocks) {
       const dropTime = e.dropTime || 1000; // fallback safety
       const offsetY = Math.min(1, e.dropCounter / dropTime);
       const visualY = player.pos.y + offsetY;
       
       // Lock Logic
       const isLocking = lockWarningEnabled && (e.lockTimer !== null);
       let lockProgress = 0;
       if (isLocking && e.lockStartTime) {
           const elapsed = Date.now() - e.lockStartTime;
           lockProgress = Math.min(1, Math.max(0, elapsed / (e.lockDelayDuration || 500)));
       }

       player.tetromino.shape.forEach((row: any, y: number) => {
         row.forEach((value: any, x: number) => {
           if (value !== 0) {
              const rgb = getRgbString(player.tetromino.color);
              ctx.save();
              drawActiveCell(ctx, (x + player.pos.x) * cellSize + gap, (y + visualY) * cellSize + gap, size, radius, rgb, { isLocking, progress: lockProgress });
              ctx.restore();
           }
         });
       });
       
       // Lock Reset Flash Overlay
       if (e.lockResetFlash > 0.01) {
            ctx.save();
            ctx.globalAlpha = e.lockResetFlash;
            ctx.fillStyle = 'white';
            player.tetromino.shape.forEach((row: any, y: number) => {
                row.forEach((value: any, x: number) => {
                    if (value !== 0) {
                        drawRoundedRect(ctx, ((x + player.pos.x) * cellSize) + (cellSize * 0.05), ((y + visualY) * cellSize) + (cellSize * 0.05), size, size, cellSize * 0.15);
                        ctx.fill();
                    }
                });
            });
            ctx.restore();
            e.lockResetFlash *= 0.85;
       } else {
           e.lockResetFlash = 0;
       }
    }

    // T-Spin Flash Overlay
    if (e.tSpinFlash && e.tSpinFlash > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = e.tSpinFlash;
        ctx.fillStyle = 'rgba(217, 70, 239, 0.4)';
        ctx.fillRect(0, 0, logicWidth, logicHeight);
        ctx.restore();
        e.tSpinFlash *= 0.9;
    }

    // Floating Texts
    floatingTexts.forEach((ft: any) => {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${cellSize * 0.7}px Rajdhani`;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = cellSize * 0.3;
        ctx.textAlign = 'center';
        const fx = ft.x * cellSize + (cellSize * 2); 
        const fy = ft.y * cellSize;
        ctx.translate(fx, fy);
        ctx.scale(ft.scale + 1, ft.scale + 1);
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
    });
  };

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, ghostShadow, showAi, aiHint, lockWarningEnabled, cellSize]); 

  return (
    <div className="relative flex justify-center items-center bg-gray-900 rounded border-4 border-gray-800 shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)]">
       <canvas ref={canvasRef} className="block rounded-sm" />
    </div>
  );
};

export default BoardCanvas;
