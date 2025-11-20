
import React, { useRef, useEffect } from 'react';
import { MoveScore } from '../types';
import { COLORS, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS } from '../constants';
import { rotateMatrix } from '../utils/gameUtils';
import { audioManager } from '../utils/audioManager';

interface Props {
  engine: React.MutableRefObject<any>; // Using any to avoid circular dep types
  aiHint: MoveScore | null;
  showAi: boolean;
  cellSize?: number; 
  
  // Ghost Config
  ghostStyle?: 'neon' | 'dashed' | 'solid';
  ghostOpacity?: number;
  ghostOutlineThickness?: number;
  ghostGlowIntensity?: number;
  ghostShadow?: string;
  lockWarningEnabled?: boolean;
}

// --- UTILS & HELPERS ---

// Memoize color parsing to avoid thousands of regex calls per frame
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
    
    // Safety: Check if shape has blocks
    const hasBlocks = shape.some((row: any[]) => row.some((cell: any) => cell !== 0));
    if (!hasBlocks) return ghostY;

    // Loop bound by stage height to prevent infinite loops
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

  // --- DRAWING LOGIC ---
  const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isGhost = false, isAi = false, isLocking = false) => {
     const px = x * cellSize;
     const py = y * cellSize;
     
     // Responsive dimensions
     const gap = cellSize * 0.05; 
     const size = cellSize - (gap * 2); 
     const radius = cellSize * 0.12; 
     
     ctx.save();
     const rgb = getRgbString(color);

     if (isGhost) {
        ctx.globalAlpha = ghostOpacity;
        const lw = ghostOutlineThickness; // User preference, usually absolute pixels

        if (ghostStyle === 'dashed') {
            ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
            ctx.lineWidth = lw;
            ctx.setLineDash([cellSize * 0.25, cellSize * 0.12]); 
            ctx.fillStyle = 'transparent';
            drawRoundedRect(ctx, px + gap, py + gap, size, size, radius);
            if (lw > 0) ctx.stroke();
        } else if (ghostStyle === 'solid') {
            ctx.fillStyle = `rgba(${rgb}, 0.5)`; 
            drawRoundedRect(ctx, px + gap, py + gap, size, size, radius / 2);
            ctx.fill();
            if (lw > 0) {
                ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
                ctx.lineWidth = lw;
                ctx.stroke();
            }
        } else {
            // Neon
            ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
            ctx.lineWidth = lw;
            ctx.fillStyle = `rgba(${rgb}, 0.1)`;
            const pulse = (Math.sin(Date.now() / 200) + 1) / 2; 
            
            if (ghostShadow) {
                ctx.shadowColor = ghostShadow; 
                ctx.shadowBlur = (cellSize * 0.3 + pulse * cellSize * 0.25) * ghostGlowIntensity;
            } else {
                ctx.shadowBlur = (cellSize * 0.15 + pulse * cellSize * 0.3) * ghostGlowIntensity;
                ctx.shadowColor = `rgba(${rgb}, 0.8)`;
            }
            
            drawRoundedRect(ctx, px + gap, py + gap, size, size, radius);
            if (lw > 0) ctx.stroke();
            ctx.fill();
        }
        
     } else if (isAi) {
         // AI Hint
         const pulse = (Math.sin(Date.now() / 300) + 1) / 2; 
         const alpha = 0.4 + pulse * 0.4;
         
         ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`; 
         ctx.setLineDash([cellSize * 0.2, cellSize * 0.15]);
         ctx.lineWidth = Math.max(1, cellSize * 0.06);
         ctx.fillStyle = `rgba(255, 215, 0, 0.1)`; 
         
         drawRoundedRect(ctx, px + gap, py + gap, size, size, radius);
         ctx.fill();
         ctx.stroke();
     } else {
         // Active/Locked Block
         const pulse = isLocking ? (Math.sin(Date.now() / 60) + 1) / 2 : 0;

         if (isLocking) {
             ctx.shadowColor = `rgba(255, 255, 255, ${0.6 + pulse * 0.4})`;
             ctx.shadowBlur = cellSize * 0.6 + (pulse * cellSize * 0.3);
             ctx.fillStyle = `rgba(${rgb}, 0.9)`;
         } else {
             ctx.fillStyle = `rgba(${rgb}, 0.9)`;
             ctx.shadowColor = `rgba(${rgb}, 0.8)`;
             ctx.shadowBlur = cellSize * 0.5;
         }

         drawRoundedRect(ctx, px + gap, py + gap, size, size, radius / 1.5);
         ctx.fill();
         
         // Locking Overlay
         if (isLocking) {
             ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + pulse * 0.2})`;
             ctx.beginPath();
             drawRoundedRect(ctx, px + gap, py + gap, size, size, radius / 1.5);
             ctx.fill();
             
             ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
             ctx.lineWidth = Math.max(1, cellSize * 0.06);
         } else {
             ctx.strokeStyle = `rgba(${rgb}, 1)`;
             ctx.lineWidth = Math.max(1, cellSize * 0.03);
         }

         // Inner highlight
         ctx.fillStyle = 'rgba(255,255,255,0.2)';
         ctx.beginPath();
         ctx.rect(px + gap, py + gap, size, size/2);
         ctx.fill();
         
         ctx.stroke();
     }
     ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !engine.current) return;

    const e = engine.current;
    const { stage, player, comboCount, dropCounter, dropTime, floatingTexts } = e;

    // --- GHOST CALC ---
    const ghostY = calculateGhostY(stage, player);
    const hasBlocks = player.tetromino.shape.some((row: any[]) => row.some((cell: any) => cell !== 0));

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

    // --- GRID (Audio Reactive) ---
    let gridAlpha = 0.05;
    const audioData = audioManager.getFrequencyData();
    if (audioData) {
        // Calculate bass energy (approx 40-250Hz)
        let bassEnergy = 0;
        for(let i=2; i<12; i++) bassEnergy += audioData[i];
        const normalizedBass = bassEnergy / (10 * 255); 
        gridAlpha = 0.05 + (normalizedBass * 0.25);
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

    // --- LOCKED BLOCKS ---
    stage.forEach((row: any, y: number) => {
      row.forEach((cell: any, x: number) => {
        if (cell[1] !== 'clear') {
           const type = cell[0];
           const color = COLORS[type] || 'rgb(255,255,255)';
           drawCell(ctx, x, y, color);
        }
      });
    });

    // --- GHOST PIECE ---
    if (hasBlocks) {
       player.tetromino.shape.forEach((row: any, y: number) => {
         row.forEach((value: any, x: number) => {
           if (value !== 0) {
             drawCell(ctx, x + player.pos.x, y + ghostY, player.tetromino.color, true);
           }
         });
       });
    }

    // --- AI HINT ---
    if (showAi && aiHint && aiHint.y !== undefined) {
        const type = e.player.tetromino.type;
        if (type && TETROMINOS[type]) {
             let aiShape = TETROMINOS[type].shape;
             for (let i = 0; i < aiHint.r; i++) aiShape = rotateMatrix(aiShape, 1);
             
             aiShape.forEach((row: any[], dy: number) => {
                 row.forEach((cell: any, dx: number) => {
                     if (cell !== 0) {
                         drawCell(ctx, aiHint.x + dx, aiHint.y! + dy, 'rgb(255, 215, 0)', false, true); 
                     }
                 })
             });
        }
    }

    // --- ACTIVE PIECE ---
    if (hasBlocks) {
       const offsetY = Math.min(1, dropCounter / dropTime);
       const visualY = player.pos.y + offsetY;
       const isLocking = lockWarningEnabled && (e.lockTimer !== null);

       player.tetromino.shape.forEach((row: any, y: number) => {
         row.forEach((value: any, x: number) => {
           if (value !== 0) {
              drawCell(ctx, x + player.pos.x, y + visualY, player.tetromino.color, false, false, isLocking);
           }
         });
       });
       
       // Lock Reset Flash
       if (e.lockResetFlash > 0.01) {
            ctx.save();
            ctx.globalAlpha = e.lockResetFlash;
            ctx.fillStyle = 'white';
            player.tetromino.shape.forEach((row: any, y: number) => {
                row.forEach((value: any, x: number) => {
                    if (value !== 0) {
                        const px = (x + player.pos.x) * cellSize;
                        const py = (y + visualY) * cellSize;
                        const size = cellSize * 0.9;
                        drawRoundedRect(ctx, px + (cellSize * 0.05), py + (cellSize * 0.05), size, size, cellSize * 0.15);
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

    // --- OVERLAYS ---
    
    // T-Spin Flash
    if (e.tSpinFlash && e.tSpinFlash > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = e.tSpinFlash;
        ctx.fillStyle = 'rgba(217, 70, 239, 0.4)';
        ctx.fillRect(0, 0, logicWidth, logicHeight);
        ctx.restore();
        e.tSpinFlash *= 0.9;
    } else {
        e.tSpinFlash = 0;
    }

    // Combo Meter
    if (comboCount > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = cellSize * 0.6;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${cellSize * 0.8}px Rajdhani`; 
        const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
        ctx.translate(logicWidth / 2, cellSize * 3);
        ctx.scale(scale, scale);
        ctx.fillText(`${comboCount}x COMBO`, 0, 0);
        ctx.restore();
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
