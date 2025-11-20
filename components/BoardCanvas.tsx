
import React, { useRef, useEffect } from 'react';
import { MoveScore } from '../types';
import { COLORS, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS } from '../constants';
import { rotateMatrix } from '../utils/gameUtils';
import { audioManager } from '../utils/audioManager';

interface Props {
  engine: React.MutableRefObject<any>; // Using any to avoid circular dep types for now, usually GameEngine
  aiHint: MoveScore | null;
  showAi: boolean;
  
  // Ghost Config
  ghostStyle?: 'neon' | 'dashed' | 'solid';
  ghostOpacity?: number;
  ghostOutlineThickness?: number;
  ghostShadow?: string;
  lockWarningEnabled?: boolean;
}

const CELL_SIZE = 30; 

const BoardCanvas: React.FC<Props> = ({ 
  engine,
  aiHint, 
  showAi, 
  ghostStyle = 'neon',
  ghostOpacity = 0.6,
  ghostOutlineThickness = 2,
  ghostShadow,
  lockWarningEnabled = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isGhost = false, isAi = false, isLocking = false) => {
     const px = x * CELL_SIZE;
     const py = y * CELL_SIZE;
     const size = CELL_SIZE - 2; 
     const gap = 1;

     ctx.save();
     
     // Robust parsing for RGB strings (e.g., "rgb(255, 0, 0)")
     const matches = color ? color.match(/\d+/g) : null;
     const rgb = matches ? matches.join(',') : '255,255,255';

     if (isGhost) {
        ctx.globalAlpha = ghostOpacity;
        
        const lw = ghostOutlineThickness;

        if (ghostStyle === 'dashed') {
            ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
            ctx.lineWidth = lw;
            ctx.setLineDash([8, 4]); 
            ctx.fillStyle = 'transparent';
            drawRoundedRect(ctx, px + gap, py + gap, size, size, 4);
            if (lw > 0) ctx.stroke();
        } else if (ghostStyle === 'solid') {
            ctx.fillStyle = `rgba(${rgb}, 0.5)`; 
            drawRoundedRect(ctx, px + gap, py + gap, size, size, 2);
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
                ctx.shadowBlur = 10 + pulse * 8;
            } else {
                ctx.shadowBlur = 5 + pulse * 10;
                ctx.shadowColor = `rgba(${rgb}, 0.8)`;
            }
            
            drawRoundedRect(ctx, px + gap, py + gap, size, size, 4);
            if (lw > 0) ctx.stroke();
            ctx.fill();
        }
        
     } else if (isAi) {
         // Gold pulsating dashed outline for AI suggestion
         const pulse = (Math.sin(Date.now() / 300) + 1) / 2; // Gentle pulse
         const alpha = 0.4 + pulse * 0.4;
         
         ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`; 
         ctx.setLineDash([6, 4]);
         ctx.lineWidth = 2;
         ctx.fillStyle = `rgba(255, 215, 0, 0.1)`; // Faint gold fill
         
         drawRoundedRect(ctx, px + gap, py + gap, size, size, 3);
         ctx.fill();
         ctx.stroke();
     } else {
         // Active (Standard or Locking)
         if (isLocking) {
             const pulse = (Math.sin(Date.now() / 60) + 1) / 2; // Fast oscillation ~370ms period
             ctx.shadowColor = `rgba(255, 255, 255, ${0.6 + pulse * 0.4})`;
             ctx.shadowBlur = 20 + pulse * 10;
             ctx.fillStyle = `rgba(${rgb}, 0.9)`;
         } else {
             ctx.fillStyle = `rgba(${rgb}, 0.9)`;
             ctx.shadowColor = `rgba(${rgb}, 0.8)`;
             ctx.shadowBlur = 15;
         }

         drawRoundedRect(ctx, px + gap, py + gap, size, size, 2);
         ctx.fill();
         
         // Locking Overlay (White flash)
         if (isLocking) {
             const pulse = (Math.sin(Date.now() / 60) + 1) / 2;
             ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + pulse * 0.2})`;
             ctx.beginPath();
             drawRoundedRect(ctx, px + gap, py + gap, size, size, 2);
             ctx.fill();
             
             ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
             ctx.lineWidth = 2;
         } else {
             ctx.strokeStyle = `rgba(${rgb}, 1)`;
             ctx.lineWidth = 1;
         }

         // Inner highlight (Common)
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

    // --- GHOST CALC (Performed inside render to ensure sync) ---
    let ghostY = player.pos.y;
    const shape = player.tetromino.shape;
    
    // Safety check: If shape is dummy (all zeros) or empty, skip ghost calc to prevent infinite loop
    const hasBlocks = shape.some((row: any[]) => row.some((cell: any) => cell !== 0));

    if (hasBlocks) {
        // Use a for loop with max iterations (stage height) instead of while(true) to prevent crashes
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
    }

    const dpr = window.devicePixelRatio || 1;
    const logicWidth = STAGE_WIDTH * CELL_SIZE;
    const logicHeight = STAGE_HEIGHT * CELL_SIZE;
    
    if (canvas.width !== logicWidth * dpr || canvas.height !== logicHeight * dpr) {
        canvas.width = logicWidth * dpr;
        canvas.height = logicHeight * dpr;
        canvas.style.width = `${logicWidth}px`;
        canvas.style.height = `${logicHeight}px`;
        ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, logicWidth, logicHeight);

    // Grid (Audio Reactive)
    let gridAlpha = 0.05;
    const audioData = audioManager.getFrequencyData();
    if (audioData) {
        // Calculate bass energy for pulse (bins 2-12 roughly 40-250Hz)
        let bassEnergy = 0;
        for(let i=2; i<12; i++) bassEnergy += audioData[i];
        const normalizedBass = bassEnergy / (10 * 255); // 0 to 1
        gridAlpha = 0.05 + (normalizedBass * 0.25);
    }

    ctx.strokeStyle = `rgba(6, 182, 212, ${gridAlpha})`; // Cyan-500 with dynamic alpha
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= STAGE_WIDTH; x++) {
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, logicHeight);
    }
    for (let y = 0; y <= STAGE_HEIGHT; y++) {
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(logicWidth, y * CELL_SIZE);
    }
    ctx.stroke();

    // Locked Blocks
    stage.forEach((row: any, y: number) => {
      row.forEach((cell: any, x: number) => {
        if (cell[1] !== 'clear') {
           const type = cell[0];
           const color = COLORS[type] || 'rgb(255,255,255)';
           drawCell(ctx, x, y, color);
        }
      });
    });

    // Ghost Piece
    if (hasBlocks) {
       player.tetromino.shape.forEach((row: any, y: number) => {
         row.forEach((value: any, x: number) => {
           if (value !== 0) {
             const color = player.tetromino.color;
             drawCell(ctx, x + player.pos.x, y + ghostY, color, true);
           }
         });
       });
    }

    // AI Hint - Visualized as specific ghost piece
    if (showAi && aiHint && aiHint.y !== undefined) {
        const type = e.player.tetromino.type;
        if (type && TETROMINOS[type]) {
             let aiShape = TETROMINOS[type].shape;
             // Rotate shape to match AI suggestion
             for (let i = 0; i < aiHint.r; i++) {
                 aiShape = rotateMatrix(aiShape, 1);
             }
             
             aiShape.forEach((row: any[], dy: number) => {
                 row.forEach((cell: any, dx: number) => {
                     if (cell !== 0) {
                         // Use 'gold' dummy color, overridden by isAi=true flag styles
                         drawCell(ctx, aiHint.x + dx, aiHint.y! + dy, 'rgb(255, 215, 0)', false, true); 
                     }
                 })
             });
        }
    }

    // Active Piece (Interpolated)
    if (hasBlocks) {
       // Interpolation: visualY = y + (time / dropTime)
       const offsetY = Math.min(1, dropCounter / dropTime);
       const visualY = player.pos.y + offsetY;

       const isLocking = lockWarningEnabled && (e.lockTimer !== null);

       player.tetromino.shape.forEach((row: any, y: number) => {
         row.forEach((value: any, x: number) => {
           if (value !== 0) {
              const color = player.tetromino.color;
              drawCell(ctx, x + player.pos.x, y + visualY, color, false, false, isLocking);
           }
         });
       });
       
       // Lock Reset Flash Visual (One-shot)
       if (e.lockResetFlash > 0.01) {
            ctx.save();
            ctx.globalAlpha = e.lockResetFlash;
            ctx.fillStyle = 'white';
            
            player.tetromino.shape.forEach((row: any, y: number) => {
                row.forEach((value: any, x: number) => {
                    if (value !== 0) {
                        const px = (x + player.pos.x) * CELL_SIZE;
                        const py = (y + visualY) * CELL_SIZE;
                        const size = CELL_SIZE - 2; 
                        drawRoundedRect(ctx, px + 1, py + 1, size, size, 2);
                        ctx.fill();
                    }
                });
            });
            ctx.restore();
            
            e.lockResetFlash *= 0.85; // Decay
       } else {
           e.lockResetFlash = 0;
       }
    }

    // Combo Meter
    if (comboCount > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Rajdhani';
        const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
        ctx.translate(logicWidth / 2, 80);
        ctx.scale(scale, scale);
        ctx.fillText(`${comboCount}x COMBO`, 0, 0);
        ctx.restore();
    }

    // Floating Texts
    floatingTexts.forEach((ft: any) => {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px Rajdhani';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        
        // Convert grid pos to pixel
        const fx = ft.x * CELL_SIZE + (CELL_SIZE * 2); 
        const fy = ft.y * CELL_SIZE;
        
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
  }, [ghostStyle, ghostOpacity, ghostOutlineThickness, ghostShadow, showAi, aiHint, lockWarningEnabled]); 

  return (
    <div className="relative flex justify-center items-center bg-gray-900 rounded border-4 border-gray-800 shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)]">
       <canvas ref={canvasRef} className="block rounded-sm" />
    </div>
  );
};

export default BoardCanvas;
