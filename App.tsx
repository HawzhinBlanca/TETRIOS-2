
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useTetrios } from './hooks/useTetrios';
import { useGestures } from './hooks/useGestures';
import BoardCanvas from './components/BoardCanvas';
import Display from './components/Display';
import Preview from './components/Preview';
import Particles, { ParticlesHandle } from './components/Particles';
import Settings from './components/Settings';
import MainMenu from './components/MainMenu';
import MusicVisualizer from './components/MusicVisualizer';
import { audioManager } from './utils/audioManager';
import { Settings as SettingsIcon, Volume2, VolumeX, Brain, ArrowLeftRight, ArrowLeft, ArrowRight, ArrowDown, Menu as MenuIcon, Play, PauseCircle, RefreshCw, AlertTriangle } from 'lucide-react';

const GHOST_SHADOW = "rgba(6, 182, 212, 0.6)"; 

const App = () => {
  const {
    engine, 
    score, rows, level, nextQueue, heldPiece, canHold,
    visualEffect, lastHoldTime, setVisualEffect,
    resetGame, setGameState, gameState,
    touchControls, aiHint, setGameConfig,
    inputState, controls, setKeyBinding
  } = useTetrios();

  // Settings State (Persisted)
  const [ghostStyle, setGhostStyle] = useState<'neon' | 'dashed' | 'solid'>(() => 
      (localStorage.getItem('tetrios_ghostStyle') as any) || 'neon');
  const [ghostOpacity, setGhostOpacity] = useState(() => 
      parseFloat(localStorage.getItem('tetrios_ghostOpacity') || '0.5'));
  const [ghostOutlineThickness, setGhostOutlineThickness] = useState(() => 
      parseInt(localStorage.getItem('tetrios_ghostThickness') || '2'));
  const [ghostGlowIntensity, setGhostGlowIntensity] = useState(() => 
      parseFloat(localStorage.getItem('tetrios_ghostGlow') || '1.0'));
  const [gameSpeed, setGameSpeed] = useState(() => 
      parseFloat(localStorage.getItem('tetrios_gameSpeed') || '1.0'));
  const [lockWarning, setLockWarning] = useState(() => 
      (localStorage.getItem('tetrios_lockWarning') || 'true') === 'true');
      
  // Tuning State
  const [das, setDas] = useState(() => parseInt(localStorage.getItem('tetrios_das') || '133'));
  const [arr, setArr] = useState(() => parseInt(localStorage.getItem('tetrios_arr') || '10'));

  // Dynamic Layout State
  const [cellSize, setCellSize] = useState(30);
  const [highScore, setHighScore] = useState(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shakeClass, setShakeClass] = useState('');
  const [showAi, setShowAi] = useState(true);
  const [flashOverlay, setFlashOverlay] = useState<string | null>(null);

  const particlesRef = useRef<ParticlesHandle>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  
  // Audio Init on Interaction
  useEffect(() => {
      const initAudio = () => audioManager.init();
      window.addEventListener('click', initAudio, { once: true });
      window.addEventListener('keydown', initAudio, { once: true });
  }, []);

  // Sync Config to Engine
  useEffect(() => {
      setGameConfig({ speed: gameSpeed, das, arr });
  }, [gameSpeed, das, arr, setGameConfig]);

  // Persist Settings
  useEffect(() => {
      localStorage.setItem('tetrios_ghostStyle', ghostStyle);
      localStorage.setItem('tetrios_ghostOpacity', ghostOpacity.toString());
      localStorage.setItem('tetrios_ghostThickness', ghostOutlineThickness.toString());
      localStorage.setItem('tetrios_ghostGlow', ghostGlowIntensity.toString());
      localStorage.setItem('tetrios_gameSpeed', gameSpeed.toString());
      localStorage.setItem('tetrios_lockWarning', lockWarning.toString());
      localStorage.setItem('tetrios_das', das.toString());
      localStorage.setItem('tetrios_arr', arr.toString());
  }, [ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, gameSpeed, lockWarning, das, arr]);

  // Track High Score
  useEffect(() => {
      if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // Responsive Cell Size Logic
  useEffect(() => {
      const handleResize = () => {
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          
          // Desktop Calculation: Height dominant, with padding for header/footer areas
          // We reserve about 100px vertical space for UI breathing room
          const availableHeight = vh - 80;
          const heightBased = availableHeight / 20;
          
          // Mobile Calculation: Width dominant usually
          const isMobile = vw < 1024;
          const widthFactor = isMobile ? 12 : 26; // 10 cols + UI space
          const widthBased = (vw * 0.9) / widthFactor;
          
          // Clamp values for sanity
          const calculated = Math.min(heightBased, widthBased);
          const minSize = isMobile ? 20 : 24;
          const maxSize = isMobile ? 35 : 45;
          
          setCellSize(Math.floor(Math.max(minSize, Math.min(maxSize, calculated))));
      };
      window.addEventListener('resize', handleResize);
      handleResize(); 
      return () => window.removeEventListener('resize', handleResize);
  }, []);

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
                             particlesRef.current?.spawnExplosion(rowY, visualEffect.payload.color);
                         });
                     }
                 } else {
                     const px = visualEffect.payload.x * cellSize;
                     const py = visualEffect.payload.y * cellSize;
                     particlesRef.current.spawn(px, py, visualEffect.payload.color);
                 }
             }
          }
          else if (visualEffect.type === 'FLASH') {
             setFlashOverlay(visualEffect.payload.color);
             setTimeout(() => setFlashOverlay(null), visualEffect.payload.duration || 200);
          }
          setVisualEffect(null); 
      }
  }, [visualEffect, setVisualEffect, cellSize]);

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
     audioManager.playUiClick();
  };

  // Dynamic Background
  const backgroundStyle = useMemo(() => {
      const baseHue = (220 + (level * 25)) % 360; 
      const secondaryHue = (baseHue + 140) % 360; 
      return {
          background: `
            radial-gradient(circle at 50% -10%, hsl(${baseHue}, 60%, 12%) 0%, transparent 80%),
            radial-gradient(circle at 90% 90%, hsl(${secondaryHue}, 40%, 8%) 0%, transparent 60%),
            #030712
          `,
          transition: 'background 2s cubic-bezier(0.4, 0, 0.2, 1)'
      };
  }, [level]);

  const levelProgress = (rows % 10) / 10;

  const handleUiHover = () => audioManager.playUiHover();
  const handleUiClick = () => audioManager.playUiClick();

  return (
    <div 
       className={`h-screen w-full flex flex-col items-center justify-center text-white overflow-hidden font-sans selection:bg-cyan-500/30 ${shakeClass}`}
       style={backgroundStyle}
    >
      <MusicVisualizer />

      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[5] bg-[linear-gradient(rgba(18,16,20,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>

      {/* Global Flash Overlay */}
      <div className={`fixed inset-0 pointer-events-none z-[60] transition-opacity duration-300 ${flashOverlay ? 'opacity-40' : 'opacity-0'}`} style={{ backgroundColor: flashOverlay || 'transparent', mixBlendMode: 'screen' }}></div>
      
      <Settings 
         isOpen={isSettingsOpen} 
         onClose={() => setIsSettingsOpen(false)}
         ghostStyle={ghostStyle} setGhostStyle={setGhostStyle}
         ghostOpacity={ghostOpacity} setGhostOpacity={setGhostOpacity}
         ghostThickness={ghostOutlineThickness} setGhostThickness={setGhostOutlineThickness}
         ghostGlowIntensity={ghostGlowIntensity} setGhostGlowIntensity={setGhostGlowIntensity}
         gameSpeed={gameSpeed} setGameSpeed={setGameSpeed}
         lockWarning={lockWarning} setLockWarning={setLockWarning}
         das={das} setDas={setDas}
         arr={arr} setArr={setArr}
         controls={controls} setKeyBinding={setKeyBinding}
      />

      {/* Menu Overlays */}
      {gameState === 'MENU' && (
          <MainMenu onStart={(lvl) => resetGame(lvl)} highScore={highScore} />
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'GAMEOVER' && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
             <div className="relative bg-gray-900/90 border-2 border-red-500 p-8 md:p-12 rounded-lg shadow-[0_0_100px_rgba(220,38,38,0.5)] text-center max-w-lg w-[90%] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-[repeating-linear-gradient(45deg,red,red_10px,transparent_10px,transparent_20px)] animate-[slide_1s_linear_infinite]"></div>
                
                <AlertTriangle size={64} className="text-red-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tighter">FAILURE</h2>
                <div className="text-red-500 text-xs uppercase tracking-[0.5em] font-bold mb-8">System Critical</div>
                
                <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
                     <div className="bg-black/40 p-4 rounded border border-red-900/30">
                         <div className="text-[10px] text-red-400 uppercase tracking-widest">Final Score</div>
                         <div className="text-2xl md:text-3xl font-mono font-bold text-white">{score}</div>
                     </div>
                     <div className="bg-black/40 p-4 rounded border border-red-900/30">
                         <div className="text-[10px] text-red-400 uppercase tracking-widest">Level Reached</div>
                         <div className="text-2xl md:text-3xl font-mono font-bold text-white">{level}</div>
                     </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={() => { handleUiClick(); resetGame(0); }}
                        onMouseEnter={handleUiHover}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-[0.2em] rounded transition-all hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] flex items-center justify-center gap-3"
                    >
                        <RefreshCw size={20} /> Reboot
                    </button>
                    <button 
                        onClick={() => { handleUiClick(); setGameState('MENU'); }} 
                        onMouseEnter={handleUiHover}
                        className="w-full py-3 bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:border-white font-bold uppercase tracking-widest rounded transition-all"
                    >
                        Main Menu
                    </button>
                </div>
             </div>
          </div>
      )}
      
      {/* PAUSE MODAL */}
      {gameState === 'PAUSED' && (
           <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[#0a0f1e] border-l-4 border-yellow-500 p-8 md:p-12 md:pr-24 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-[90%]">
                  <div className="absolute top-4 right-4 text-yellow-500/20 group-hover:text-yellow-500/50 transition-colors skew-x-[10deg]">
                      <PauseCircle size={80} />
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic">PAUSED</h2>
                  <div className="h-1 w-24 bg-yellow-500 mb-8 skew-x-[10deg]"></div>
                  
                  <div className="space-y-4 skew-x-[10deg]">
                      <button onClick={() => { handleUiClick(); setGameState('PLAYING'); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-white hover:text-yellow-400 transition-colors group/btn w-full">
                          <div className="w-8 md:w-12 h-1 bg-gray-600 group-hover/btn:bg-yellow-400 transition-colors"></div>
                          <span className="text-lg md:text-xl uppercase tracking-[0.2em] font-bold">Resume</span>
                      </button>
                      <button onClick={() => { handleUiClick(); setIsSettingsOpen(true); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors group/btn w-full">
                          <div className="w-6 md:w-8 h-1 bg-gray-700 group-hover/btn:bg-white transition-colors"></div>
                          <span className="text-xs md:text-sm uppercase tracking-[0.2em] font-bold">Config</span>
                      </button>
                      <button onClick={() => { handleUiClick(); setGameState('MENU'); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-gray-500 hover:text-red-400 transition-colors group/btn w-full pt-4">
                          <div className="w-4 md:w-6 h-1 bg-gray-800 group-hover/btn:bg-red-500 transition-colors"></div>
                          <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">Abort</span>
                      </button>
                  </div>
              </div>
           </div>
      )}

      {/* --- MAIN LAYOUT GRID --- */}
      <main className="w-full h-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between p-4 relative z-10 gap-4 lg:gap-8">

        {/* LEFT COLUMN (HUD) */}
        <div className="hidden lg:flex flex-col flex-1 h-full justify-center items-end space-y-6 py-8">
            <div className="mb-8 text-right select-none">
                <h1 className="text-5xl xl:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-600 italic tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                TETRIOS
                </h1>
                <div className="flex items-center justify-end gap-2 mt-2">
                    <span className="text-[10px] text-cyan-700 uppercase tracking-[0.3em] font-bold">System Online // v1.2</span>
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                </div>
            </div>

            <div className="w-full max-w-[240px]">
                <Display label="Score Data" text={score} />
                <Display label="Current Level" text={level} progress={levelProgress} />
                <Display label="Lines Cleared" text={rows} />
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] mt-auto">
                <button 
                    onClick={() => { handleUiClick(); setIsSettingsOpen(true); }} 
                    onMouseEnter={handleUiHover}
                    className="bg-gray-900/60 hover:bg-cyan-900/50 border border-gray-700 hover:border-cyan-500/50 p-3 rounded-sm transition-all group" 
                    title="Settings"
                >
                    <SettingsIcon size={18} className="text-gray-400 group-hover:text-cyan-400 mx-auto" />
                </button>
                <button 
                    onClick={toggleMute} 
                    onMouseEnter={handleUiHover}
                    className="bg-gray-900/60 hover:bg-cyan-900/50 border border-gray-700 hover:border-cyan-500/50 p-3 rounded-sm transition-all group" 
                    title="Mute Audio"
                >
                    {isMuted ? <VolumeX size={18} className="text-red-400 mx-auto"/> : <Volume2 size={18} className="text-cyan-400 mx-auto"/>}
                </button>
                <button 
                    onClick={() => { handleUiClick(); setShowAi(!showAi); }} 
                    onMouseEnter={handleUiHover}
                    className={`border p-3 rounded-sm transition-all group ${showAi ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-gray-900/60 border-gray-700 hover:border-cyan-500/30'}`} 
                    title="Toggle AI Assistant"
                >
                    <Brain size={18} className={`${showAi ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'} mx-auto`} />
                </button>
            </div>

            {/* Input Visualizer (Left) */}
            <div className="w-full max-w-[240px] p-3 bg-gray-900/40 border border-gray-800 rounded-sm backdrop-blur-sm">
                <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-800 pb-1 flex justify-between">
                    <span>SOCD Monitor</span>
                    <span className="text-cyan-500 font-mono">{inputState.moveStack.length}</span>
                </div>
                <div className="flex gap-2 justify-center">
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center border transition-all duration-75 ${
                        inputState.moveStack.includes('left') 
                            ? (inputState.moveStack[inputState.moveStack.length-1] === 'left' ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_cyan]' : 'bg-gray-800 border-gray-600 text-gray-400')
                            : 'bg-black/30 border-gray-800 text-gray-700'
                    }`}>
                        <ArrowLeft size={14} />
                    </div>
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center border transition-all duration-75 ${
                        inputState.isDown
                            ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_cyan]'
                            : 'bg-black/30 border-gray-800 text-gray-700'
                    }`}>
                        <ArrowDown size={14} />
                    </div>
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center border transition-all duration-75 ${
                        inputState.moveStack.includes('right')
                            ? (inputState.moveStack[inputState.moveStack.length-1] === 'right' ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_cyan]' : 'bg-gray-800 border-gray-600 text-gray-400')
                            : 'bg-black/30 border-gray-800 text-gray-700'
                    }`}>
                        <ArrowRight size={14} />
                    </div>
                </div>
            </div>
        </div>

        {/* CENTER STAGE (GAME BOARD) */}
        <div className="flex-shrink-0 relative z-20">
            <div 
                className="relative p-1 bg-gray-900/40 rounded-sm shadow-[0_0_60px_-15px_rgba(6,182,212,0.2)] border border-gray-700/50 backdrop-blur-sm transition-transform duration-300 hover:scale-[1.01]" 
                ref={boardContainerRef}
            >
                {/* Decoration Borders */}
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50"></div>
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50"></div>

                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-sm">
                    <Particles ref={particlesRef} />
                </div>

                <BoardCanvas 
                engine={engine}
                aiHint={aiHint} 
                showAi={showAi}
                cellSize={cellSize}
                ghostStyle={ghostStyle}
                ghostOpacity={ghostOpacity}
                ghostOutlineThickness={ghostOutlineThickness}
                ghostGlowIntensity={ghostGlowIntensity}
                ghostShadow={GHOST_SHADOW}
                lockWarningEnabled={lockWarning}
                />
            </div>
        </div>

        {/* RIGHT COLUMN (QUEUE & INFO) */}
        <div className="hidden lg:flex flex-col flex-1 h-full justify-center items-start space-y-8 py-8 pl-4">
            <div className="w-full max-w-[200px]">
                <div className="mb-6 transform scale-105 origin-top-left">
                    <div className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                        <div className="w-1 h-4 bg-cyan-500"></div> Next Unit
                    </div>
                    <Preview title="" type={nextQueue[0]} />
                </div>
                
                <div className="space-y-3 pl-4 border-l border-gray-800">
                    <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">In Queue</div>
                    {nextQueue.slice(1, 5).map((type, i) => (
                        <div key={i} className="scale-75 origin-left opacity-60 mix-blend-screen">
                            <Preview title="" type={type} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-[200px]">
                <div 
                    onClick={() => canHold && touchControls.hold()} 
                    className={`cursor-pointer transition-all relative group p-4 border border-dashed border-gray-700 rounded-lg ${canHold ? 'hover:border-cyan-500 hover:bg-cyan-950/20' : 'opacity-50 border-red-900/30 bg-red-950/10'}`}
                >
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Hold Buffer (C)</div>
                    <div className="flex justify-center">
                         <Preview title="" type={heldPiece} lastUpdate={lastHoldTime} />
                    </div>
                    {!canHold && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] rounded-lg">
                            <span className="text-[10px] font-bold text-red-500 uppercase border border-red-500 px-2 py-0.5 rounded">Locked</span>
                        </div>
                    )}
                </div>
            </div>

            {showAi && (
                 <div className="w-full max-w-[240px] p-4 bg-gray-900/40 border border-cyan-900/30 rounded-sm backdrop-blur-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-1">
                         <div className={`w-1.5 h-1.5 rounded-full ${aiHint ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_cyan]' : 'bg-gray-600'}`}></div>
                     </div>
                     <div className="text-[9px] text-cyan-400 uppercase tracking-widest mb-3 flex gap-2 items-center font-bold"><Brain size={14}/> Neural Net</div>
                     <div className="text-xs text-gray-300 font-mono space-y-2">
                         {aiHint ? (
                             <>
                                <div className="flex justify-between border-b border-white/5 pb-1">
                                    <span className="text-gray-500">Target X</span> 
                                    <span className="text-white font-bold">{aiHint.x}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-1">
                                    <span className="text-gray-500">Rotation</span> 
                                    <span className="text-white font-bold">{aiHint.r}°</span>
                                </div>
                                <div className="flex justify-between pt-1 items-center">
                                    <span className="text-gray-500">Confidence</span> 
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, (aiHint.score + 200)/4)}%`}}></div>
                                        </div>
                                        <span className="text-cyan-300">{(Math.min(100, (aiHint.score + 200)/4)).toFixed(0)}%</span>
                                    </div>
                                </div>
                             </>
                         ) : 'Analyzing Matrix...'}
                     </div>
                 </div>
            )}
        </div>

      </main>

      {/* --- MOBILE LAYOUT OVERRIDES --- */}
      {/* Mobile Header: Score & Level */}
      <div className="lg:hidden fixed top-0 left-0 right-0 p-4 flex justify-between items-start z-40 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md p-3 rounded border border-white/10 pointer-events-auto">
              <div className="text-[9px] text-gray-400 uppercase font-bold">Score</div>
              <div className="text-xl font-mono font-bold text-white leading-none">{score}</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-3 rounded border border-white/10 pointer-events-auto">
              <div className="text-[9px] text-cyan-400 uppercase font-bold">Lvl {level}</div>
              <div className="flex gap-1 mt-1">
                  <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${levelProgress * 100}%` }}></div>
                  </div>
              </div>
          </div>
      </div>

      {/* Mobile Footer: Controls */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl p-4 pb-8 border-t border-gray-800 z-50 flex justify-between items-center">
             <div className="flex gap-4">
                <button 
                    onClick={() => { handleUiClick(); canHold && touchControls.hold(); }} 
                    disabled={!canHold}
                    className={`w-14 h-14 flex items-center justify-center rounded-full transition-all border ${canHold ? 'bg-gray-800 text-cyan-400 border-cyan-900 active:scale-90 active:bg-cyan-900/50' : 'bg-gray-900 text-gray-700 border-gray-800 cursor-not-allowed'}`} 
                >
                   <ArrowLeftRight size={24} />
                </button>
             </div>

             <div className="flex gap-4">
                <button 
                    onClick={() => { handleUiClick(); setGameState(gameState === 'PAUSED' ? 'PLAYING' : 'PAUSED'); }} 
                    className="w-14 h-14 flex items-center justify-center bg-yellow-900/20 text-yellow-500 border border-yellow-900/50 rounded-full active:scale-90 active:bg-yellow-900/40"
                >
                    {gameState === 'PAUSED' ? <Play size={24} /> : <MenuIcon size={24} />}
                </button>
                
                <button 
                    onClick={() => { handleUiClick(); setIsSettingsOpen(true); }} 
                    className="w-14 h-14 flex items-center justify-center bg-gray-800 text-gray-400 border border-gray-700 rounded-full active:scale-90 active:bg-gray-700"
                >
                    <SettingsIcon size={24}/>
                </button>
             </div>
      </div>
    </div>
  );
};

export default App;
