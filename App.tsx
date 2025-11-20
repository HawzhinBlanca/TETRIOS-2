
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useTetrios } from './hooks/useTetrios';
import { useGestures } from './hooks/useGestures';
import BoardCanvas from './components/BoardCanvas';
import Display from './components/Display';
import Preview from './components/Preview';
import Particles, { ParticlesHandle } from './components/Particles';
import Settings from './components/Settings';
import MusicVisualizer from './components/MusicVisualizer';
import { audioManager } from './utils/audioManager';
import { Play, Pause, Settings as SettingsIcon, Volume2, VolumeX, Brain, ArrowLeftRight } from 'lucide-react';

const GHOST_SHADOW = "rgba(6, 182, 212, 0.6)"; 

const App = () => {
  const {
    engine, // Ref
    score, rows, level, nextPiece, heldPiece, canHold,
    visualEffect, lastHoldTime, setVisualEffect,
    resetGame, setGameState, gameState,
    touchControls, aiHint, setGameSpeed: setEngineSpeed
  } = useTetrios();

  // Settings State (Persisted)
  const [ghostStyle, setGhostStyle] = useState<'neon' | 'dashed' | 'solid'>(() => 
      (localStorage.getItem('tetrios_ghostStyle') as any) || 'neon');
  const [ghostOpacity, setGhostOpacity] = useState(() => 
      parseFloat(localStorage.getItem('tetrios_ghostOpacity') || '0.5'));
  const [ghostOutlineThickness, setGhostOutlineThickness] = useState(() => 
      parseInt(localStorage.getItem('tetrios_ghostThickness') || '2'));
  const [gameSpeed, setGameSpeed] = useState(() => 
      parseFloat(localStorage.getItem('tetrios_gameSpeed') || '1.0'));
  const [lockWarning, setLockWarning] = useState(() => 
      (localStorage.getItem('tetrios_lockWarning') || 'true') === 'true');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shakeClass, setShakeClass] = useState('');
  const [showAi, setShowAi] = useState(true);

  const particlesRef = useRef<ParticlesHandle>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  
  // Sync Speed
  useEffect(() => {
      setEngineSpeed(gameSpeed);
  }, [gameSpeed, setEngineSpeed]);

  // Persist Settings
  useEffect(() => {
      localStorage.setItem('tetrios_ghostStyle', ghostStyle);
      localStorage.setItem('tetrios_ghostOpacity', ghostOpacity.toString());
      localStorage.setItem('tetrios_ghostThickness', ghostOutlineThickness.toString());
      localStorage.setItem('tetrios_gameSpeed', gameSpeed.toString());
      localStorage.setItem('tetrios_lockWarning', lockWarning.toString());
  }, [ghostStyle, ghostOpacity, ghostOutlineThickness, gameSpeed, lockWarning]);

  // Gesture Hook
  useGestures(boardContainerRef, {
    onSwipeLeft: () => touchControls.move(-1),
    onSwipeRight: () => touchControls.move(1),
    onSwipeDown: () => touchControls.softDrop(),
    onFlickDown: () => touchControls.hardDrop(),
    onTap: () => touchControls.rotate(1),
  });

  useEffect(() => {
      if (visualEffect) {
          if (visualEffect.type === 'SHAKE') {
             const cls = visualEffect.payload === 'hard' ? 'shake-hard' : 'shake-soft';
             setShakeClass(cls);
             setTimeout(() => setShakeClass(''), 300);
          }
          else if (visualEffect.type === 'PARTICLE') {
             if (particlesRef.current) {
                 if (visualEffect.payload.isExplosion) {
                     const rowsToExplode = visualEffect.payload.clearedRows || [visualEffect.payload.y];
                     if (Array.isArray(rowsToExplode)) {
                         rowsToExplode.forEach((rowY: number) => {
                             particlesRef.current?.spawnExplosion(rowY);
                         });
                     }
                 } else {
                     const px = visualEffect.payload.x * 35;
                     const py = visualEffect.payload.y * 35;
                     particlesRef.current.spawn(px, py, visualEffect.payload.color);
                 }
             }
          }
          setVisualEffect(null); 
      }
  }, [visualEffect, setVisualEffect]);

  // Game Over Shake
  useEffect(() => {
      if (gameState === 'GAMEOVER') {
          setShakeClass('shake-hard');
          setTimeout(() => setShakeClass(''), 500);
      }
  }, [gameState]);

  const toggleMute = () => {
     const muted = !audioManager.toggleMute();
     setIsMuted(muted);
  };

  // Dynamic Background based on Level
  const backgroundStyle = useMemo(() => {
      // Start at Deep Cyan/Blue (220) and shift 25 degrees per level
      const baseHue = (220 + (level * 25)) % 360; 
      const secondaryHue = (baseHue + 140) % 360; // Split-complementary accent
      
      return {
          background: `
            radial-gradient(circle at 50% -10%, hsl(${baseHue}, 60%, 12%) 0%, transparent 80%),
            radial-gradient(circle at 90% 90%, hsl(${secondaryHue}, 40%, 8%) 0%, transparent 60%),
            #030712
          `,
          transition: 'background 2s cubic-bezier(0.4, 0, 0.2, 1)'
      };
  }, [level]);

  return (
    <div 
       className={`flex flex-col lg:flex-row items-center justify-center min-h-screen text-white overflow-hidden font-sans selection:bg-cyan-500/30 ${shakeClass}`}
       style={backgroundStyle}
    >
      <MusicVisualizer />
      
      <Settings 
         isOpen={isSettingsOpen} 
         onClose={() => setIsSettingsOpen(false)}
         ghostStyle={ghostStyle} setGhostStyle={setGhostStyle}
         ghostOpacity={ghostOpacity} setGhostOpacity={setGhostOpacity}
         ghostThickness={ghostOutlineThickness} setGhostThickness={setGhostOutlineThickness}
         gameSpeed={gameSpeed} setGameSpeed={setGameSpeed}
         lockWarning={lockWarning} setLockWarning={setLockWarning}
      />

      {/* Left Column */}
      <div className="hidden lg:flex flex-col w-64 mr-8 h-[80vh] justify-center relative">
        <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-600 italic tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
          TETRIOS
        </h1>
        <Display label="Score" text={score} />
        <Display label="Rows" text={rows} />
        <Display label="Level" text={level} />
        
        <div className="mt-4 flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="flex-1 bg-gray-800 hover:bg-gray-700 p-3 rounded flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <SettingsIcon size={16} /> Config
            </button>
            <button onClick={toggleMute} className="bg-gray-800 hover:bg-gray-700 p-3 rounded">
                {isMuted ? <VolumeX size={16} className="text-red-400"/> : <Volume2 size={16} className="text-cyan-400"/>}
            </button>
            <button onClick={() => setShowAi(!showAi)} className={`p-3 rounded ${showAi ? 'bg-cyan-900 text-cyan-400' : 'bg-gray-800 text-gray-400'}`}>
                <Brain size={16} />
            </button>
        </div>

        <div className="mt-auto p-4 bg-gray-900/50 rounded-lg border border-gray-800/50 text-xs text-gray-500 space-y-2">
            <div className="flex justify-between"><span>Controls</span> <span className="text-gray-300">Arrows + Space + C</span></div>
        </div>
      </div>

      {/* Center Stage */}
      <div className="relative p-1 bg-gray-800 rounded-sm shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)]" ref={boardContainerRef}>
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent rounded-sm border border-white/10 mix-blend-overlay"></div>
        
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-sm">
            <Particles ref={particlesRef} />
        </div>

        <BoardCanvas 
          engine={engine}
          aiHint={aiHint} 
          showAi={showAi}
          ghostStyle={ghostStyle}
          ghostOpacity={ghostOpacity}
          ghostOutlineThickness={ghostOutlineThickness}
          ghostShadow={GHOST_SHADOW}
          lockWarningEnabled={lockWarning}
        />

        {/* Overlays */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <h2 className="text-5xl font-bold text-red-500 mb-4 animate-[pulse-red_1s_infinite] glow-text">GAME OVER</h2>
            <p className="text-xl text-gray-300 mb-6">Final Score: {score}</p>
            <button onClick={resetGame} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all transform hover:scale-105">Try Again</button>
          </div>
        )}

        {gameState === 'MENU' && (
             <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                <h1 className="text-5xl lg:text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-600 italic tracking-tighter">TETRIOS</h1>
                <p className="mb-8 text-gray-500 text-xs tracking-[0.3em] uppercase">High-Fidelity System</p>
                <button onClick={resetGame} className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-md text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 transition-all">
                    <div className="absolute inset-0 w-0 bg-cyan-500/20 transition-all duration-[250ms] ease-out group-hover:w-full"></div>
                    <span className="relative flex items-center gap-2 font-bold text-xl tracking-widest uppercase"><Play size={24} /> Initialize</span>
                </button>
             </div>
        )}
        
        {gameState === 'PAUSED' && (
             <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <h2 className="text-4xl font-bold text-yellow-400 mb-6 tracking-widest">SYSTEM PAUSED</h2>
                <button onClick={() => setGameState('PLAYING')} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold flex items-center gap-2"><Play size={20} /> Resume</button>
             </div>
        )}
      </div>

      {/* Right Column */}
      <div className="flex flex-row lg:flex-col w-full lg:w-48 mt-4 lg:mt-0 lg:ml-8 justify-between lg:justify-start items-start px-4 lg:px-0 h-auto lg:h-[700px]">
         <div className="space-y-4 w-full">
             <Preview title="Next" type={nextPiece} />
             <div 
               onClick={() => canHold && touchControls.hold()} 
               className={`cursor-pointer transition-all ${canHold ? 'hover:brightness-125 active:scale-95' : 'opacity-50 cursor-not-allowed grayscale'}`}
               title="Hold Piece (C)"
             >
               <Preview title="Hold" type={heldPiece} lastUpdate={lastHoldTime} />
             </div>
             
             {showAi && (
                 <div className="hidden lg:block mt-8 p-4 bg-gray-900/50 border border-cyan-900/50 rounded">
                     <div className="text-xs text-cyan-400 uppercase tracking-widest mb-2 flex gap-2 items-center"><Brain size={12}/> AI Core</div>
                     <div className="text-xs text-gray-400">
                         {aiHint ? `Optimized: col ${aiHint.x}` : 'Calculating...'}
                     </div>
                 </div>
             )}
         </div>
         
         {/* Mobile Control Bar */}
         <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur p-4 flex justify-between items-center border-t border-gray-800 z-50">
             <span className="font-mono text-cyan-400 font-bold text-xl">{score}</span>
             <div className="flex gap-4">
                <button 
                    onClick={() => canHold && touchControls.hold()} 
                    disabled={!canHold}
                    className={`p-2 transition-transform ${canHold ? 'text-cyan-400 hover:text-cyan-300 active:scale-90' : 'text-gray-600 cursor-not-allowed'}`} 
                    title="Swap/Hold"
                >
                   <ArrowLeftRight size={24} />
                </button>
                <button onClick={() => setGameState(gameState === 'PAUSED' ? 'PLAYING' : 'PAUSED')} className="p-2 text-yellow-400 hover:text-yellow-300"><Pause /></button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-white"><SettingsIcon /></button>
             </div>
         </div>
      </div>
    </div>
  );
};

export default App;
