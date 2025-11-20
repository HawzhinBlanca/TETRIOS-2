
import { useState, useCallback, useEffect, useRef } from 'react';
import { GameCore } from '../utils/GameCore';
import { createAiWorker } from '../utils/aiWorker';
import { GameState, GameStats, MoveScore, GameMode, KeyAction, KeyMap, TetrominoType } from '../types';
import { STAGE_WIDTH } from '../constants';

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

export const useTetrios = () => {
  const [stats, setStats] = useState<GameStats>({ score: 0, rows: 0, level: 0, time: 0 });
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [aiHint, setAiHint] = useState<MoveScore | null>(null);
  const [inputState, setInputState] = useState<{ moveStack: string[], isDown: boolean }>({ moveStack: [], isDown: false });
  const [controls, setControlsState] = useState<KeyMap>(DEFAULT_CONTROLS);
  const [gameMode, setGameMode] = useState<GameMode>('MARATHON');
  const [visualEffect, setVisualEffect] = useState<{ type: 'SHAKE' | 'PARTICLE' | 'FLASH', payload?: any } | null>(null);
  const [lastHoldTime, setLastHoldTime] = useState<number>(0);

  const aiWorker = useRef<Worker | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const engine = useRef<GameCore>(null!);

  if (!engine.current) {
      engine.current = new GameCore({
          onStatsChange: (s) => setStats({...s}),
          onQueueChange: (q) => setNextQueue(q),
          onHoldChange: (p, c) => { setHeldPiece(p); setCanHold(c); if(!c) setLastHoldTime(Date.now()); },
          onVisualEffect: (t, p) => setVisualEffect({ type: t, payload: p }),
          onGameOver: (s) => setGameState(s),
          onAiTrigger: () => triggerAi()
      }, DEFAULT_CONTROLS);
  }

  const triggerAi = () => {
      if(aiWorker.current && engine.current.player.tetromino.type) {
          aiWorker.current.postMessage({
              stage: engine.current.stage,
              type: engine.current.player.tetromino.type
          });
      }
  };

  useEffect(() => {
    const saved = localStorage.getItem('tetrios_state');
    const savedControls = localStorage.getItem('tetrios_controls');
    
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
            if (parsed.stats) engine.current.stats = parsed.stats;
            if (parsed.stage) engine.current.stage = parsed.stage;
            if (parsed.mode) engine.current.mode = parsed.mode;
            
            setStats(engine.current.stats);
            setGameMode(engine.current.mode);
            setGameState('PAUSED');
        } catch(e) { 
            console.error("Failed to load save", e); 
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

  const resetGame = (mode: GameMode = 'MARATHON', startLevel = 0) => {
      engine.current.resetGame(mode, startLevel);
      setGameMode(mode);
      setGameState('PLAYING');
      saveState();
  };

  const setGameConfig = (config: { speed?: number, das?: number, arr?: number }) => {
      engine.current.setGameConfig(config);
  };

  const setKeyBinding = (action: KeyAction, key: string) => {
      const newControls = { ...engine.current.keyMap };
      Object.keys(newControls).forEach(k => {
          const act = k as KeyAction;
          newControls[act] = newControls[act].filter((k: string) => k !== key);
      });
      newControls[action] = [key]; 
      engine.current.keyMap = newControls;
      setControlsState(newControls);
      localStorage.setItem('tetrios_controls', JSON.stringify(newControls));
  };

  const update = (time: number) => {
      if (gameState !== 'PLAYING') return;
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      engine.current.update(deltaTime);
      
      if (Math.random() > 0.95) setStats({...engine.current.stats}); 

      requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
      if (gameState === 'PLAYING') {
          lastTimeRef.current = performance.now();
          requestRef.current = requestAnimationFrame(update);
      }
      return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      const { key } = event;
      const map = engine.current.keyMap;
      const isAction = (act: KeyAction) => map[act].includes(key);

      let action: KeyAction | null = null;
      if (isAction('moveLeft')) action = 'moveLeft';
      else if (isAction('moveRight')) action = 'moveRight';
      else if (isAction('softDrop')) action = 'softDrop';
      else if (isAction('hardDrop')) action = 'hardDrop';
      else if (isAction('rotateCW')) action = 'rotateCW';
      else if (isAction('rotateCCW')) action = 'rotateCCW';
      else if (isAction('hold')) action = 'hold';
      else if (isAction('pause')) { setGameState('PAUSED'); return; }

      if (action) {
          // Repeat handling is now done in GameCore, so we just pass down
          if (event.repeat) {
              if (['moveLeft', 'moveRight', 'softDrop', 'rotateCW', 'rotateCCW', 'hardDrop', 'hold'].includes(action)) return;
          }
          
          event.preventDefault(); // Prevent scrolling
          engine.current.handleInput(action, true);
          setInputState({ moveStack: [...engine.current.moveStack], isDown: engine.current.keys.down });
      }
  }, [gameState]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
      const { key } = event;
      const map = engine.current.keyMap;
      const isAction = (act: KeyAction) => map[act].includes(key);

      let action: KeyAction | null = null;
      if (isAction('moveLeft')) action = 'moveLeft';
      else if (isAction('moveRight')) action = 'moveRight';
      else if (isAction('softDrop')) action = 'softDrop';

      if (action) {
          engine.current.handleInput(action, false);
          setInputState({ moveStack: [...engine.current.moveStack], isDown: engine.current.keys.down });
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
      move: (dir: number) => engine.current.handleInput(dir === -1 ? 'moveLeft' : 'moveRight', true), // Simplified for gesture swipes
      rotate: (dir: number) => engine.current.handleInput(dir === 1 ? 'rotateCW' : 'rotateCCW', true),
      softDrop: () => engine.current.handleInput('softDrop', true),
      hardDrop: () => engine.current.handleInput('hardDrop', true),
      hold: () => engine.current.handleInput('hold', true)
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
