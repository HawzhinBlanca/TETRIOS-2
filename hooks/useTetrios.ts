
import { useState, useCallback, useEffect, useRef } from 'react';
import { createStage, checkCollision, randomTetromino, rotateMatrix, generateBag, getWallKicks, isTSpin } from '../utils/gameUtils';
import { audioManager } from '../utils/audioManager';
import { createAiWorker } from '../utils/aiWorker';
import { STAGE_WIDTH, STAGE_HEIGHT, SCORES } from '../constants';
import { Player, Board, GameState, TetrominoType, GameStats, MoveScore, FloatingText } from '../types';

const LOCK_DELAY_MS = 500;
const MAX_MOVES_BEFORE_LOCK = 15;
const DAS = 133; 
const ARR = 10;

// Mutable Game Engine State (No React)
export class GameEngine {
    stage: Board = createStage();
    player: Player = {
        pos: { x: 0, y: 0 },
        tetromino: { shape: [[0]], color: '0,0,0', type: 'I' },
        collided: false,
    };
    stats: GameStats = { score: 0, rows: 0, level: 0 };
    bag: TetrominoType[] = [];
    nextPiece: TetrominoType | null = null;
    heldPiece: TetrominoType | null = null;
    canHold = true;
    rotationState = 0;
    lockTimer: number | null = null;
    movesOnGround = 0;
    lastMoveWasRotation = false;
    comboCount = -1;
    isBackToBack = false;
    
    // Interpolation Data
    dropCounter = 0;
    dropTime = 1000;
    speedMultiplier = 1;
    
    // Visuals
    lockResetFlash = 0; // Flash intensity (0 to 1)

    // Input Stack (SOCD)
    moveStack: string[] = [];
    keyTimers: Record<string, number> = { left: 0, right: 0, down: 0 };
    keys: { down: boolean } = { down: false };

    // Visuals
    floatingTexts: FloatingText[] = [];
    visualEffectsQueue: { type: 'SHAKE' | 'PARTICLE', payload?: any }[] = [];
}

export const useTetrios = () => {
  // The Engine Ref - The Source of Truth
  const engine = useRef(new GameEngine());
  const aiWorker = useRef<Worker | null>(null);
  
  // Reactive State (Only for UI HUD, not for game loop)
  const [stats, setStats] = useState<GameStats>({ score: 0, rows: 0, level: 0 });
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [nextPiece, setNextPiece] = useState<TetrominoType | null>(null);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [aiHint, setAiHint] = useState<MoveScore | null>(null);
  
  // Effect Triggers
  const [visualEffect, setVisualEffect] = useState<{ type: 'SHAKE' | 'PARTICLE', payload?: any } | null>(null);
  const [lastHoldTime, setLastHoldTime] = useState<number>(0);

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem('tetrios_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Hydrate engine
            const e = new GameEngine();
            Object.assign(e, parsed);
            // Reset flash state on load to avoid stuck visuals
            e.lockResetFlash = 0;
            engine.current = e;
            // Sync React state
            setStats(e.stats);
            setNextPiece(e.nextPiece);
            setHeldPiece(e.heldPiece);
            setGameState('PAUSED');
        } catch(e) { console.error("Failed to load save", e); }
    }

    aiWorker.current = createAiWorker();
    aiWorker.current.onmessage = (e) => setAiHint(e.data);
    return () => { aiWorker.current?.terminate(); };
  }, []);

  const saveState = () => {
     if(gameState === 'PLAYING') {
         localStorage.setItem('tetrios_state', JSON.stringify(engine.current));
     }
  };

  // --- LOGIC HELPERS ---

  const addFloatingText = (text: string, color: string = '#fff') => {
      const e = engine.current;
      e.floatingTexts.push({
          id: Date.now() + Math.random(),
          text,
          x: e.player.pos.x + 1,
          y: e.player.pos.y,
          life: 1.0,
          color,
          scale: 0.5
      });
  };

  const triggerAi = () => {
      if(aiWorker.current && engine.current.player.tetromino.type) {
          aiWorker.current.postMessage({
              stage: engine.current.stage,
              type: engine.current.player.tetromino.type
          });
      }
  };

  const setGameSpeed = (speed: number) => {
      engine.current.speedMultiplier = speed;
  };

  const spawnPiece = () => {
      const e = engine.current;
      if (e.bag.length < 7) e.bag = [...generateBag(), ...e.bag];
      if (!e.nextPiece) {
          e.bag = [...generateBag(), ...generateBag()];
          e.nextPiece = e.bag.pop()!;
      }
      const type = e.nextPiece;
      e.nextPiece = e.bag.pop()!;
      
      e.player = {
          pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
          tetromino: randomTetromino([type]).piece, 
          collided: false
      };
      
      e.rotationState = 0;
      e.movesOnGround = 0;
      e.lastMoveWasRotation = false;
      e.canHold = true;
      e.lockResetFlash = 0;
      
      if (e.lockTimer) { clearTimeout(e.lockTimer); e.lockTimer = null; }
      
      if (checkCollision(e.player, e.stage, { x: 0, y: 0 })) {
          setGameState('GAMEOVER');
          localStorage.removeItem('tetrios_state');
          audioManager.playGameOver();
          return;
      }

      // Sync React State
      setNextPiece(e.nextPiece);
      setHeldPiece(e.heldPiece);
      triggerAi();
  };

  const resetGame = useCallback(() => {
      audioManager.init();
      const currentSpeed = engine.current.speedMultiplier; // Preserve speed setting
      const e = new GameEngine(); // Reset engine
      e.speedMultiplier = currentSpeed; // Restore speed
      e.bag = [...generateBag(), ...generateBag()];
      
      const first = e.bag.pop()!;
      e.nextPiece = e.bag.pop()!;
      e.player = {
          pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
          tetromino: randomTetromino([first]).piece,
          collided: false
      };

      engine.current = e;
      setStats(e.stats);
      setNextPiece(e.nextPiece);
      setHeldPiece(null);
      setAiHint(null);
      setLastHoldTime(0);
      setGameState('PLAYING');
      triggerAi();
  }, []);

  const lockPiece = () => {
      const e = engine.current;
      audioManager.playLock();
      
      const newStage = e.stage.map(row => [...row]);
      e.player.tetromino.shape.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value !== 0) {
                  const ny = y + e.player.pos.y;
                  const nx = x + e.player.pos.x;
                  if (ny >= 0 && ny < STAGE_HEIGHT && nx >= 0 && nx < STAGE_WIDTH) {
                       // @ts-ignore
                       newStage[ny][nx] = [value, 'merged'];
                  }
              }
          });
      });
      e.stage = newStage as Board;

      // T-Spin Logic
      const tSpin = e.player.tetromino.type === 'T' && e.lastMoveWasRotation && isTSpin(e.player, newStage as Board);

      let clearedRows: number[] = [];
      let cleared = 0;
      const sweptStage = e.stage.reduce((ack, row, idx) => {
          if (row.every(cell => cell[1] !== 'clear')) {
              cleared++;
              clearedRows.push(idx);
              ack.unshift(new Array(STAGE_WIDTH).fill([null, 'clear']));
              return ack;
          }
          ack.push(row);
          return ack;
      }, [] as Board);
      e.stage = sweptStage;

      if (cleared > 0 || tSpin) {
          if(cleared > 0) {
              audioManager.playClear(cleared);
              setVisualEffect({ type: 'SHAKE', payload: cleared >= 4 ? 'hard' : 'soft' });
              setVisualEffect({ type: 'PARTICLE', payload: { isExplosion: true, clearedRows } });
          }
          e.comboCount++;
          
          let baseScore = 0;
          let text = "";
          
          if(tSpin) {
              if (cleared === 0) { baseScore = SCORES.TSPIN; text = "T-SPIN"; }
              else if (cleared === 1) { baseScore = SCORES.TSPIN_SINGLE; text = "T-SPIN SINGLE"; }
              else if (cleared === 2) { baseScore = SCORES.TSPIN_DOUBLE; text = "T-SPIN DOUBLE"; }
              else if (cleared === 3) { baseScore = SCORES.TSPIN_TRIPLE; text = "T-SPIN TRIPLE"; }
              
              if(e.isBackToBack) {
                  baseScore = baseScore * SCORES.BACK_TO_BACK_MULTIPLIER;
                  text = "B2B " + text;
              }
              e.isBackToBack = true;
          } else {
              if(cleared === 4) { 
                  baseScore = SCORES.TETRIS; 
                  text = "TETRIS"; 
                  if(e.isBackToBack) {
                      baseScore = baseScore * SCORES.BACK_TO_BACK_MULTIPLIER;
                      text = "B2B TETRIS";
                  }
                  e.isBackToBack = true;
              } else if (cleared > 0) {
                  if(cleared === 1) baseScore = SCORES.SINGLE;
                  if(cleared === 2) baseScore = SCORES.DOUBLE;
                  if(cleared === 3) baseScore = SCORES.TRIPLE;
                  e.isBackToBack = false;
              }
          }
          
          if(e.comboCount > 0 && baseScore > 0) {
              baseScore += e.comboCount * 50 * (e.stats.level + 1);
              text += ` ${e.comboCount}x COMBO`;
          }
          
          if (baseScore > 0) {
             e.stats.score += baseScore * (e.stats.level + 1);
             addFloatingText(text, tSpin ? '#d946ef' : '#facc15'); // Fuchsia for TSpin, Yellow for Normal
             setStats({...e.stats}); // Update UI
          }
          
          e.stats.rows += cleared;
          e.stats.level = Math.floor(e.stats.rows / 10);
      } else {
          e.comboCount = -1;
      }

      spawnPiece();
      saveState();
  };

  const resetLockTimer = () => {
      const e = engine.current;
      if (e.lockTimer) clearTimeout(e.lockTimer);
      e.lockTimer = null;
      if (checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
          if (e.movesOnGround < MAX_MOVES_BEFORE_LOCK) {
              // @ts-ignore
              e.lockTimer = setTimeout(lockPiece, LOCK_DELAY_MS);
              e.lockResetFlash = 0.5; // Visual Cue
          } else {
              lockPiece();
          }
      }
  };

  // --- MOVEMENT ---
  const move = (dir: number) => {
      const e = engine.current;
      if (!checkCollision(e.player, e.stage, { x: dir, y: 0 })) {
          e.player.pos.x += dir;
          e.lastMoveWasRotation = false;
          audioManager.playMove();
          if (checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
              e.movesOnGround++;
              resetLockTimer();
          }
          triggerAi();
      }
  };

  const rotate = (dir: number) => {
      const e = engine.current;
      const clonedP = JSON.parse(JSON.stringify(e.player));
      clonedP.tetromino.shape = rotateMatrix(clonedP.tetromino.shape, dir);
      const kicks = getWallKicks(e.player.tetromino.type, e.rotationState, dir);
      
      for (const [ox, oy] of kicks) {
          if (!checkCollision({ ...clonedP, pos: { x: clonedP.pos.x + ox, y: clonedP.pos.y - oy } }, e.stage, { x: 0, y: 0 })) {
              e.player.tetromino.shape = clonedP.tetromino.shape;
              e.player.pos.x += ox;
              e.player.pos.y -= oy;
              e.rotationState = (e.rotationState + dir + 4) % 4;
              e.lastMoveWasRotation = true;
              audioManager.playRotate();
              if (checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
                  e.movesOnGround++;
                  resetLockTimer();
              }
              triggerAi();
              return;
          }
      }
  };

  const hardDrop = () => {
      const e = engine.current;
      let y = 0;
      while (!checkCollision(e.player, e.stage, { x: 0, y: y + 1 })) {
          y++;
      }
      e.player.pos.y += y;
      e.stats.score += y * 2;
      if (y > 0) e.lastMoveWasRotation = false;
      
      setStats({...e.stats}); // Sync Score
      audioManager.playHardDrop();
      setVisualEffect({ type: 'SHAKE', payload: 'soft' });
      setVisualEffect({ type: 'PARTICLE', payload: { x: e.player.pos.x+1, y: e.player.pos.y+2, color: e.player.tetromino.color } });
      if (e.lockTimer) clearTimeout(e.lockTimer);
      lockPiece();
  };
  
  const hold = () => {
      const e = engine.current;
      if(!e.canHold) return;
      setLastHoldTime(Date.now()); 

      const curr = e.player.tetromino.type;
      const next = e.heldPiece || e.nextPiece; 
      if (e.heldPiece === null) {
           e.heldPiece = curr;
           spawnPiece();
      } else {
           e.heldPiece = curr;
           e.player = {
              pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
              tetromino: randomTetromino([next]).piece,
              collided: false,
           };
           e.rotationState = 0;
           e.movesOnGround = 0;
           e.lastMoveWasRotation = false;
           if(e.lockTimer) clearTimeout(e.lockTimer);
      }
      e.canHold = false;
      setHeldPiece(e.heldPiece); // Sync React State
      setNextPiece(e.nextPiece); // Sync React State
      audioManager.playMove();
      triggerAi();
  };

  // --- MAIN GAME LOOP (Decoupled) ---
  const loop = (time: number) => {
      if (gameState !== 'PLAYING') {
          lastTimeRef.current = time;
          requestRef.current = requestAnimationFrame(loop);
          return;
      }

      let delta = time - lastTimeRef.current;
      if(delta > 100) delta = 100; 
      lastTimeRef.current = time;
      
      const e = engine.current;
      // Apply Speed Multiplier: Higher speed = lower time
      const baseDropTime = Math.max(100, 1000 - (e.stats.level * 50)); 
      const dropTime = baseDropTime / e.speedMultiplier;
      e.dropTime = dropTime; // Expose for interpolation
      e.dropCounter += delta;
      
      if (e.dropCounter > dropTime) {
          if (!checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
              e.player.pos.y += 1;
              e.lastMoveWasRotation = false;
          } else {
              if (!e.lockTimer) resetLockTimer();
          }
          e.dropCounter = 0;
      }

      // SOCD Input Handling
      // We prioritize the last pressed key in the stack
      const activeDir = e.moveStack[e.moveStack.length - 1];
      
      if (activeDir === 'right') {
          if (e.keyTimers.right === 0) { move(1); e.keyTimers.right = 1; } 
          else {
              e.keyTimers.right += delta;
              if (e.keyTimers.right > DAS && (e.keyTimers.right - DAS) % ARR < delta) move(1);
          }
          e.keyTimers.left = 0; 
      } else if (activeDir === 'left') {
          if (e.keyTimers.left === 0) { move(-1); e.keyTimers.left = 1; } 
          else {
              e.keyTimers.left += delta;
              if (e.keyTimers.left > DAS && (e.keyTimers.left - DAS) % ARR < delta) move(-1);
          }
          e.keyTimers.right = 0;
      } else {
          e.keyTimers.right = 0;
          e.keyTimers.left = 0;
      }
      
      if (e.keys.down) e.dropCounter += delta * 10; 

      // Update Floating Texts
      for (let i = e.floatingTexts.length - 1; i >= 0; i--) {
          const ft = e.floatingTexts[i];
          ft.life -= 0.02;
          ft.y -= 0.02;
          ft.scale += 0.01;
          if (ft.life <= 0) e.floatingTexts.splice(i, 1);
      }

      requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
      requestRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState]);

  // Input Listeners (SOCD Stack Logic)
  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          if (gameState !== 'PLAYING') return;
          const e = engine.current;
          
          // Prevent repeating events from OS
          if(event.repeat && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return;

          switch(event.key) {
              case 'ArrowLeft': 
                  if(!e.moveStack.includes('left')) e.moveStack.push('left');
                  break;
              case 'ArrowRight': 
                  if(!e.moveStack.includes('right')) e.moveStack.push('right');
                  break;
              case 'ArrowDown': e.keys.down = true; break;
              case 'ArrowUp': rotate(1); break;
              case 'z': rotate(-1); break; 
              case ' ': hardDrop(); break;
              case 'c': hold(); break;
              case 'Escape': setGameState('PAUSED'); break;
          }
      };
      const handleKeyUp = (event: KeyboardEvent) => {
          const e = engine.current;
          switch(event.key) {
              case 'ArrowLeft': 
                  e.moveStack = e.moveStack.filter(k => k !== 'left');
                  break;
              case 'ArrowRight': 
                  e.moveStack = e.moveStack.filter(k => k !== 'right');
                  break;
              case 'ArrowDown': e.keys.down = false; break;
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [gameState]);

  return {
      engine, // Expose entire engine ref for Canvas
      score: stats.score,
      rows: stats.rows,
      level: stats.level,
      nextPiece,
      heldPiece,
      canHold: engine.current.canHold,
      gameState,
      visualEffect,
      lastHoldTime, 
      setVisualEffect,
      resetGame,
      setGameState,
      aiHint,
      setGameSpeed,
      touchControls: {
          move: (dir: number) => move(dir),
          rotate,
          hardDrop,
          softDrop: () => { engine.current.keys.down = true; setTimeout(() => engine.current.keys.down = false, 200) },
          hold
      }
  };
};
