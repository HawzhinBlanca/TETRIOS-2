
import { useState, useCallback, useEffect, useRef } from 'react';
import { createStage, createPuzzleStage, addGarbageLines, checkCollision, rotateMatrix, generateBag, getWallKicks, isTSpin } from '../utils/gameUtils';
import { audioManager } from '../utils/audioManager';
import { createAiWorker } from '../utils/aiWorker';
import { STAGE_WIDTH, STAGE_HEIGHT, SCORES, TETROMINOS, PUZZLE_LEVELS } from '../constants';
import { Player, Board, GameState, TetrominoType, GameStats, MoveScore, FloatingText, GameMode, KeyAction, KeyMap } from '../types';

const LOCK_DELAY_MS = 500;
const MAX_MOVES_BEFORE_LOCK = 15;

// Default Controls
const DEFAULT_CONTROLS: KeyMap = {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    hardDrop: [' '],
    rotateCW: ['ArrowUp', 'x'],
    rotateCCW: ['z', 'Control'],
    hold: ['c', 'Shift'],
    pause: ['Escape', 'p']
};

// Mutable Game Engine State (No React)
export class GameEngine {
    stage: Board = createStage();
    player: Player = {
        pos: { x: 0, y: 0 },
        tetromino: { shape: [[0]], color: '0,0,0', type: 'I' },
        collided: false,
    };
    stats: GameStats = { score: 0, rows: 0, level: 0, time: 0 };
    mode: GameMode = 'MARATHON';
    
    // Queue System
    nextQueue: TetrominoType[] = [];
    
    heldPiece: TetrominoType | null = null;
    canHold = true;
    rotationState = 0;
    lockTimer: any = null;
    lockStartTime = 0; // Track when lock delay started
    lockDelayDuration = LOCK_DELAY_MS;
    movesOnGround = 0;
    lastMoveWasRotation = false;
    comboCount = -1;
    isBackToBack = false;
    
    // Interpolation Data
    dropCounter = 0;
    dropTime = 1000;
    speedMultiplier = 1;
    
    // Tuning (DAS/ARR)
    das = 133; // Delayed Auto Shift (ms)
    arr = 10;  // Auto Repeat Rate (ms)

    // Battle / Puzzle Specifics
    battleTimer = 0;
    garbagePending = 0;
    puzzleIndex = 0;

    // Visuals
    lockResetFlash = 0; // Flash intensity (0 to 1)
    tSpinFlash = 0;     // T-Spin Flash intensity (0 to 1)

    // Input Stack (SOCD)
    moveStack: string[] = [];
    keyTimers: Record<string, number> = { left: 0, right: 0, down: 0 };
    keys: Record<string, boolean> = { down: false, left: false, right: false };
    
    // Control Map
    keyMap: KeyMap = JSON.parse(JSON.stringify(DEFAULT_CONTROLS));

    // Visuals
    floatingTexts: FloatingText[] = [];
    visualEffectsQueue: { type: 'SHAKE' | 'PARTICLE' | 'FLASH', payload?: any }[] = [];
}

export const useTetrios = () => {
  // The Engine Ref - The Source of Truth
  const engine = useRef(new GameEngine());
  const aiWorker = useRef<Worker | null>(null);
  
  // Reactive State (Only for UI HUD, not for game loop)
  const [stats, setStats] = useState<GameStats>({ score: 0, rows: 0, level: 0, time: 0 });
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [aiHint, setAiHint] = useState<MoveScore | null>(null);
  const [inputState, setInputState] = useState<{ moveStack: string[], isDown: boolean }>({ moveStack: [], isDown: false });
  const [controls, setControlsState] = useState<KeyMap>(DEFAULT_CONTROLS);
  const [gameMode, setGameMode] = useState<GameMode>('MARATHON');
  
  // Effect Triggers
  const [visualEffect, setVisualEffect] = useState<{ type: 'SHAKE' | 'PARTICLE' | 'FLASH', payload?: any } | null>(null);
  const [lastHoldTime, setLastHoldTime] = useState<number>(0);

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem('tetrios_state');
    const savedControls = localStorage.getItem('tetrios_controls');
    
    // Hydrate controls
    if (savedControls) {
        try {
            const parsedControls = JSON.parse(savedControls);
            engine.current.keyMap = parsedControls;
            setControlsState(parsedControls);
        } catch(e) {}
    }

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Hydrate engine state
            const e = new GameEngine();
            // Restore controls to the new engine instance
            if (savedControls) e.keyMap = JSON.parse(savedControls);
            
            // Safe Assign with Defaults for missing keys (migration)
            Object.assign(e, parsed);
            
            if (!e.nextQueue) e.nextQueue = generateBag();
            if (!e.mode) e.mode = 'MARATHON';
            
            // Reset flash/timer state on load to avoid stuck visuals
            e.lockResetFlash = 0;
            e.tSpinFlash = 0;
            e.lockStartTime = 0;
            e.lockTimer = null;

            engine.current = e;
            
            // Sync React state
            setStats(e.stats);
            setNextQueue([...e.nextQueue]);
            setHeldPiece(e.heldPiece);
            setCanHold(e.canHold);
            setGameMode(e.mode);
            setGameState('PAUSED');
        } catch(e) { 
            console.error("Failed to load save", e); 
            // Fallback if save is corrupt
            engine.current = new GameEngine();
        }
    }

    aiWorker.current = createAiWorker();
    aiWorker.current.onmessage = (e) => setAiHint(e.data);
    return () => { aiWorker.current?.terminate(); };
  }, []);

  const saveState = () => {
     if(gameState === 'PLAYING' || gameState === 'PAUSED') {
         localStorage.setItem('tetrios_state', JSON.stringify(engine.current));
     }
  };

  // --- CONTROL MANAGEMENT ---
  const setKeyBinding = (action: KeyAction, key: string) => {
      const newControls = { ...engine.current.keyMap };
      
      // Remove key from other bindings to prevent conflicts
      Object.keys(newControls).forEach(k => {
          const act = k as KeyAction;
          newControls[act] = newControls[act].filter((k: string) => k !== key);
      });
      
      // Assign new key
      newControls[action] = [key]; 
      
      engine.current.keyMap = newControls;
      setControlsState(newControls);
      localStorage.setItem('tetrios_controls', JSON.stringify(newControls));
  };

  // --- LOGIC HELPERS ---

  const addFloatingText = (text: string, color: string = '#fff', scale: number = 0.5) => {
      const e = engine.current;
      e.floatingTexts.push({
          id: Date.now() + Math.random(),
          text,
          x: e.player.pos.x + 1,
          y: e.player.pos.y,
          life: 1.0,
          color,
          scale
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

  const setGameConfig = (config: { speed?: number, das?: number, arr?: number }) => {
      if (config.speed !== undefined) engine.current.speedMultiplier = config.speed;
      if (config.das !== undefined) engine.current.das = config.das;
      if (config.arr !== undefined) engine.current.arr = config.arr;
  };

  const spawnPiece = () => {
      const e = engine.current;
      
      // Check Puzzle Win Condition (Empty Queue)
      if (e.mode === 'PUZZLE' && e.nextQueue.length === 0) {
          // Check if board clear? Or is queue empty enough?
          const isBoardClear = e.stage.every(row => row.every(cell => cell[1] === 'clear'));
          if (isBoardClear) {
              setGameState('VICTORY');
              audioManager.playClear(4);
              return;
          } else {
              // If pieces ran out and board not clear
              setGameState('GAMEOVER');
              audioManager.playGameOver();
              return;
          }
      }
      
      // Ensure queue has buffer (Bag System) unless Puzzle
      if (e.mode !== 'PUZZLE') {
        while (e.nextQueue.length < 7) {
            e.nextQueue = [...e.nextQueue, ...generateBag()];
        }
      }
      
      if (e.nextQueue.length === 0) return; // Safety

      const type = e.nextQueue.shift()!;
      
      e.player = {
          pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
          tetromino: TETROMINOS[type], 
          collided: false
      };
      
      e.rotationState = 0;
      e.movesOnGround = 0;
      e.lastMoveWasRotation = false;
      e.canHold = e.mode !== 'PUZZLE'; 
      setCanHold(e.canHold);
      e.lockResetFlash = 0;
      e.tSpinFlash = 0;
      
      if (e.lockTimer) { clearTimeout(e.lockTimer); e.lockTimer = null; }
      e.lockStartTime = 0;
      
      if (checkCollision(e.player, e.stage, { x: 0, y: 0 })) {
          if (e.mode === 'ZEN') {
              // Zen Mode: Clear board instead of Game Over
              e.stage = createStage();
              audioManager.playClear(4);
              addFloatingText('ZEN RESET', '#06b6d4');
          } else {
              setGameState('GAMEOVER');
              localStorage.removeItem('tetrios_state');
              audioManager.playGameOver();
          }
      } else {
          setNextQueue([...e.nextQueue]);
          triggerAi();
      }
  };

  const resetGame = (mode: GameMode = 'MARATHON', startLevel = 0) => {
      const e = engine.current;
      e.mode = mode;
      setGameMode(mode);
      
      // Mode Initialization
      if (mode === 'PUZZLE') {
          // startLevel is actually puzzleIndex
          e.puzzleIndex = startLevel;
          e.stage = createPuzzleStage(PUZZLE_LEVELS[startLevel]);
          e.nextQueue = [...PUZZLE_LEVELS[startLevel].bag];
      } else {
          e.stage = createStage();
          e.nextQueue = generateBag();
      }

      // Stats Init
      e.stats = { 
          score: 0, 
          rows: 0, 
          level: (mode === 'TIME_ATTACK' || mode === 'SPRINT' || mode === 'PUZZLE') ? 0 : startLevel, 
          time: mode === 'TIME_ATTACK' ? 180 : 0 
      };

      // Gravity Init
      if (mode === 'ZEN') {
          e.dropTime = 1000000; 
      } else if (mode === 'MASTER') {
          e.dropTime = 0; 
      } else if (mode === 'PUZZLE') {
          e.dropTime = 1000000; // Puzzles usually have no gravity or manual drop
      } else {
          e.dropTime = Math.max(100, Math.pow(0.8 - ((startLevel - 1) * 0.007), startLevel) * 1000);
      }
      
      e.heldPiece = null;
      e.comboCount = -1;
      e.isBackToBack = false;
      e.floatingTexts = [];
      e.visualEffectsQueue = [];
      e.lockStartTime = 0;
      e.battleTimer = 0;
      e.garbagePending = 0;
      
      setStats(e.stats);
      setHeldPiece(null);
      setNextQueue([...e.nextQueue]);
      setGameState('PLAYING');
      
      spawnPiece();
      saveState();
      audioManager.init();
  };

  const sweepRows = (newStage: Board, isTSpin: boolean = false) => {
      const e = engine.current;
      let rowsCleared = 0;
      
      const sweepedStage = newStage.reduce((ack, row, y) => {
          // Standard clear check: if all cells are filled
          if (row.every(cell => cell[1] !== 'clear')) {
              rowsCleared += 1;
              ack.unshift(new Array(STAGE_WIDTH).fill([null, 'clear']));
              // Particle Effect - Pass relative Row Y
              e.visualEffectsQueue.push({ 
                  type: 'PARTICLE', 
                  payload: { isExplosion: true, y, color: 'white' } 
              });
              return ack;
          }
          ack.push(row);
          return ack;
      }, [] as Board);

      if (rowsCleared > 0) {
          // Scoring
          e.comboCount += 1;
          let score = 0;
          let text = '';
          
          if (isTSpin) {
              // T-Spin Scoring Rules
              const tSpinScores = [0, SCORES.TSPIN_SINGLE, SCORES.TSPIN_DOUBLE, SCORES.TSPIN_TRIPLE];
              score = (tSpinScores[rowsCleared] || SCORES.TSPIN_TRIPLE) * (e.stats.level + 1);
              text = rowsCleared === 3 ? 'T-SPIN TRIPLE' : rowsCleared === 2 ? 'T-SPIN DOUBLE' : 'T-SPIN SINGLE';
              
              // High-impact sound for T-Spin clears
              audioManager.playClear(4);
              
              // Back-to-Back Bonus
              if (e.isBackToBack) {
                  score *= SCORES.BACK_TO_BACK_MULTIPLIER;
                  text += ' B2B';
              }
              e.isBackToBack = true;
          } else {
              // Standard Scoring
              const basePoints = [0, SCORES.SINGLE, SCORES.DOUBLE, SCORES.TRIPLE, SCORES.TETRIS];
              score = basePoints[rowsCleared] * (e.stats.level + 1);
              
              if (rowsCleared === 4) {
                  text = 'TETRIS';
                  e.visualEffectsQueue.push({ type: 'SHAKE', payload: 'hard' });
                  audioManager.playClear(4);
                  if (e.isBackToBack) {
                      score *= SCORES.BACK_TO_BACK_MULTIPLIER;
                      text += ' B2B';
                  }
                  e.isBackToBack = true;
              } else {
                  text = rowsCleared === 3 ? 'TRIPLE' : rowsCleared === 2 ? 'DOUBLE' : 'SINGLE';
                  audioManager.playClear(rowsCleared);
                  e.isBackToBack = false;
              }
          }

          // Combo Bonus
          if (e.comboCount > 0) {
              score += 50 * e.comboCount * (e.stats.level + 1);
              text += ` +${e.comboCount} COMBO`;
          }

          // Game Mode Scoring Adjustments
          if (e.mode !== 'ZEN' && e.mode !== 'PUZZLE') {
            e.stats.score += score;
          }
          
          e.stats.rows += rowsCleared;
          
          // Level Up Logic
          if (e.mode === 'MARATHON') {
              e.stats.level = Math.floor(e.stats.rows / 10);
              e.dropTime = Math.max(100, 1000 * Math.pow(0.95, e.stats.level));
          } else if (e.mode === 'SPRINT') {
              if (e.stats.rows >= 40) {
                  setGameState('VICTORY');
                  audioManager.playClear(4); 
              }
          } else if (e.mode === 'PUZZLE') {
               // Check Victory (Empty Board)
               if (sweepedStage.every(row => row.every(c => c[1] === 'clear'))) {
                   setGameState('VICTORY');
                   audioManager.playClear(4);
               }
          }
          
          setStats({ ...e.stats });
          addFloatingText(text, isTSpin ? '#d946ef' : '#fff', isTSpin ? 0.8 : 0.5);
          e.stage = sweepedStage;
      } else {
          // No lines cleared
          if (isTSpin) {
              // T-Spin Zero
              if (e.mode !== 'ZEN' && e.mode !== 'PUZZLE') {
                  e.stats.score += SCORES.TSPIN * (e.stats.level + 1);
                  setStats({ ...e.stats });
              }
              addFloatingText('T-SPIN', '#d946ef', 0.6);
          }
          e.comboCount = -1;
          e.stage = sweepedStage; 
      }
      
      // Battle Mode Garbage Injection
      if (e.garbagePending > 0) {
          e.stage = addGarbageLines(e.stage, e.garbagePending);
          e.garbagePending = 0;
          e.visualEffectsQueue.push({ type: 'SHAKE', payload: 'soft' });
          addFloatingText("WARNING!", "#ef4444");
      }
  };

  const lockPiece = () => {
      const e = engine.current;
      const { player, stage } = e;
      
      let tSpinDetected = false;

      // Check T-Spin (Standard: 3 Corner Rule + Rotated Last)
      if (player.tetromino.type === 'T' && e.lastMoveWasRotation) {
           if (isTSpin(player, stage)) {
               tSpinDetected = true;
               e.tSpinFlash = 1.0;
               
               // Trigger T-Spin Visuals (Flash & Particles)
               e.visualEffectsQueue.push({ type: 'FLASH', payload: { color: '#d946ef', duration: 300 } });
               e.visualEffectsQueue.push({ 
                   type: 'PARTICLE', 
                   payload: { 
                       x: player.pos.x + 1, // Center of T piece
                       y: player.pos.y + 1, 
                       color: '#d946ef', // Magenta
                       amount: 20 
                   } 
               });

               audioManager.playRotate(); 
           }
      }

      // Merge
      const newStage = stage.map(row => [...row]);
      player.tetromino.shape.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value !== 0) {
                  if (y + player.pos.y >= 0 && y + player.pos.y < STAGE_HEIGHT) {
                      newStage[y + player.pos.y][x + player.pos.x] = [
                          player.tetromino.type,
                          'merged',
                      ];
                  }
              }
          });
      });

      e.stage = newStage;
      e.visualEffectsQueue.push({ type: 'SHAKE', payload: 'soft' });
      audioManager.playLock();
      
      sweepRows(e.stage, tSpinDetected);
      if(gameState === 'PLAYING') spawnPiece(); 
  };

  // --- MOVEMENT ---

  const move = (dir: number) => {
      const e = engine.current;
      if (!checkCollision(e.player, e.stage, { x: dir, y: 0 })) {
          e.player.pos.x += dir;
          e.lastMoveWasRotation = false;
          if (e.lockTimer) {
              e.movesOnGround++;
              if(e.movesOnGround < MAX_MOVES_BEFORE_LOCK) {
                 clearTimeout(e.lockTimer);
                 e.lockTimer = null;
                 e.lockStartTime = 0;
                 e.lockResetFlash = 0.5;
              }
          }
          audioManager.playMove();
          return true;
      }
      return false;
  };

  const rotate = (dir: number) => {
      const e = engine.current;
      const rotatedShape = rotateMatrix(e.player.tetromino.shape, dir);
      const clonedPlayer = JSON.parse(JSON.stringify(e.player));
      clonedPlayer.tetromino.shape = rotatedShape;

      const kicks = getWallKicks(e.player.tetromino.type, e.rotationState, dir);
      
      for (const offset of kicks) {
          if (!checkCollision(clonedPlayer, e.stage, { x: offset[0], y: offset[1] })) {
              e.player.tetromino.shape = rotatedShape;
              e.player.pos.x += offset[0];
              e.player.pos.y += offset[1];
              e.rotationState = (e.rotationState + dir + 4) % 4;
              e.lastMoveWasRotation = true;
              
              if (e.lockTimer) {
                  e.movesOnGround++;
                  if(e.movesOnGround < MAX_MOVES_BEFORE_LOCK) {
                      clearTimeout(e.lockTimer);
                      e.lockTimer = null;
                      e.lockStartTime = 0;
                      e.lockResetFlash = 0.5;
                  }
              }
              audioManager.playRotate();
              triggerAi();
              return;
          }
      }
  };

  const softDrop = () => {
      const e = engine.current;
      if (!checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
          e.player.pos.y += 1;
          if(e.mode !== 'ZEN' && e.mode !== 'PUZZLE') e.stats.score += SCORES.SOFT_DROP;
          e.lastMoveWasRotation = false;
          setStats({ ...e.stats }); 
          return true;
      }
      return false;
  };

  const hardDrop = () => {
      const e = engine.current;
      let dropped = 0;
      while (!checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
          e.player.pos.y += 1;
          dropped++;
      }
      if(e.mode !== 'ZEN' && e.mode !== 'PUZZLE') e.stats.score += dropped * SCORES.HARD_DROP;
      e.lastMoveWasRotation = false;
      setStats({ ...e.stats });
      
      // Spawn particle at drop location (visual cue)
      // x, y are grid coordinates
      e.visualEffectsQueue.push({ 
        type: 'PARTICLE', 
        payload: { 
            x: e.player.pos.x, 
            y: e.player.pos.y, 
            color: e.player.tetromino.color,
            isExplosion: false 
        } 
      });
      
      audioManager.playHardDrop();
      lockPiece();
  };

  const hold = () => {
      const e = engine.current;
      if (!e.canHold) return;

      const currentType = e.player.tetromino.type;
      if (e.heldPiece) {
          e.player.tetromino = TETROMINOS[e.heldPiece];
          e.heldPiece = currentType;
      } else {
          e.heldPiece = currentType;
          spawnPiece(); 
      }
      
      if (heldPiece === null) { 
           e.heldPiece = currentType;
           spawnPiece(); 
      } else {
           const temp = e.heldPiece;
           e.heldPiece = currentType;
           e.player = {
               pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
               tetromino: TETROMINOS[temp!],
               collided: false
           };
           e.rotationState = 0;
           e.lockTimer = null;
           e.lockStartTime = 0;
      }
      
      e.canHold = false;
      setCanHold(false);
      setHeldPiece(e.heldPiece);
      setLastHoldTime(Date.now());
      audioManager.playUiSelect();
      triggerAi();
  };

  // --- GAME LOOP ---
  
  const update = (time: number) => {
      const e = engine.current;
      if (gameState !== 'PLAYING') return;

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // --- Mode Logic ---
      if (e.mode === 'TIME_ATTACK') {
          e.stats.time -= deltaTime / 1000;
          if (e.stats.time <= 0) {
              e.stats.time = 0;
              setGameState('GAMEOVER');
              audioManager.playGameOver();
          }
      } else if (e.mode === 'SPRINT') {
          e.stats.time += deltaTime / 1000;
      } else if (e.mode === 'BATTLE') {
          // Simulated Opponent
          e.battleTimer += deltaTime;
          const interval = Math.max(2000, 8000 - (e.stats.rows * 100)); 
          if (e.battleTimer > interval) {
              const garbageAmount = 1 + Math.floor(Math.random() * 2); 
              e.garbagePending += garbageAmount;
              e.battleTimer = 0;
          }
      }

      // Gravity (Skip in ZEN/PUZZLE unless holding down, force fast in MASTER)
      const effectiveGravity = ((e.mode === 'ZEN' || e.mode === 'PUZZLE') && !e.keys.down) ? Infinity : e.dropTime;
      
      e.dropCounter += deltaTime * e.speedMultiplier;
      if (e.dropCounter > effectiveGravity) {
          if (!checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
              e.player.pos.y += 1;
              e.lastMoveWasRotation = false;
          } else {
              // Lock Delay
              if (!e.lockTimer) {
                  e.lockTimer = setTimeout(() => {
                      if (checkCollision(e.player, e.stage, { x: 0, y: 1 })) {
                          lockPiece();
                      }
                  }, LOCK_DELAY_MS);
                  e.lockStartTime = Date.now();
              }
          }
          e.dropCounter = 0;
      }

      // Input Handling (DAS/ARR)
      const activeKey = e.moveStack[e.moveStack.length - 1];
      if (activeKey && (activeKey === 'left' || activeKey === 'right')) {
          if (!e.keyTimers[activeKey]) {
               e.keyTimers[activeKey] = 0; // Initial press handled by keydown
          }
          e.keyTimers[activeKey] += deltaTime;
          
          if (e.keyTimers[activeKey] > e.das) {
               const arrSpeed = e.arr;
               if (arrSpeed === 0) {
                   // Instant DAS
                   while(move(activeKey === 'left' ? -1 : 1)) {}
               } else if ((e.keyTimers[activeKey] - e.das) % arrSpeed < deltaTime) {
                   move(activeKey === 'left' ? -1 : 1);
               }
          }
      }
      
      if (e.keys.down && (e.mode === 'ZEN' || e.mode === 'PUZZLE')) {
          softDrop(); // Manual gravity
      } else if (e.keys.down) {
          softDrop();
      }

      // Process Visual Queue
      while (e.visualEffectsQueue.length > 0) {
          const effect = e.visualEffectsQueue.shift();
          if (effect) setVisualEffect(effect);
      }
      
      if (Math.random() > 0.9) setStats({ ...e.stats });

      requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
      if (gameState === 'PLAYING') {
          lastTimeRef.current = performance.now();
          requestRef.current = requestAnimationFrame(update);
      }
      return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  // --- INPUT LISTENER ---
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      const { key } = event;
      const e = engine.current;
      const map = e.keyMap;
      
      const isAction = (act: KeyAction) => map[act].includes(key);

      if (isAction('moveLeft')) {
          if (!e.keys.left) {
              e.keys.left = true;
              e.moveStack.push('left');
              e.keyTimers.left = 0;
              move(-1);
              setInputState({ moveStack: [...e.moveStack], isDown: e.keys.down });
          }
      }
      else if (isAction('moveRight')) {
          if (!e.keys.right) {
              e.keys.right = true;
              e.moveStack.push('right');
              e.keyTimers.right = 0;
              move(1);
              setInputState({ moveStack: [...e.moveStack], isDown: e.keys.down });
          }
      }
      else if (isAction('softDrop')) {
          e.keys.down = true;
          setInputState({ moveStack: [...e.moveStack], isDown: true });
      }
      else if (isAction('hardDrop')) {
          if (!event.repeat) hardDrop();
      }
      else if (isAction('rotateCW')) {
          if (!event.repeat) rotate(1);
      }
      else if (isAction('rotateCCW')) {
          if (!event.repeat) rotate(-1);
      }
      else if (isAction('hold')) {
          if (!event.repeat) hold();
      }
      else if (isAction('pause')) {
          setGameState('PAUSED');
      }

  }, [gameState]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
      const { key } = event;
      const e = engine.current;
      const map = e.keyMap;
      
      const isAction = (act: KeyAction) => map[act].includes(key);

      if (isAction('moveLeft')) {
          e.keys.left = false;
          e.moveStack = e.moveStack.filter(k => k !== 'left');
          e.keyTimers.left = 0;
          setInputState({ moveStack: [...e.moveStack], isDown: e.keys.down });
      }
      else if (isAction('moveRight')) {
          e.keys.right = false;
          e.moveStack = e.moveStack.filter(k => k !== 'right');
          e.keyTimers.right = 0;
          setInputState({ moveStack: [...e.moveStack], isDown: e.keys.down });
      }
      else if (isAction('softDrop')) {
          e.keys.down = false;
          setInputState({ moveStack: [...e.moveStack], isDown: false });
      }
  }, []);

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [handleKeyDown, handleKeyUp]);

  const touchControls = {
      move: (dir: number) => move(dir),
      rotate: (dir: number) => rotate(dir),
      softDrop,
      hardDrop,
      hold
  };

  return {
      engine,
      score: stats.score,
      rows: stats.rows,
      level: stats.level,
      time: stats.time,
      nextQueue,
      heldPiece,
      canHold,
      visualEffect,
      lastHoldTime,
      setVisualEffect,
      resetGame,
      setGameState,
      gameState,
      gameMode,
      touchControls,
      aiHint,
      setGameConfig,
      inputState,
      controls,
      setKeyBinding
  };
};
