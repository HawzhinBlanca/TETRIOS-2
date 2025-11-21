
import React, { useState, useEffect, forwardRef, Ref, useRef } from 'react';
import { Play, Award, Zap, HelpCircle, ChevronRight, BarChart3, User, Globe, Infinity, Timer, Sparkles, Crown, Puzzle, Swords, X, Map as MapIcon, Gauge } from 'lucide-react'; // Added Gauge icon
import { audioManager } from '../utils/audioManager';
import { GameMode } from '../types';
import { PUZZLE_LEVELS } from '../constants';

/**
 * Props for the MainMenu component.
 */
interface Props {
  onStart: (level: number, mode: GameMode) => void;
  highScore: number;
  "aria-modal"?: "true" | "false"; // For accessibility
  role?: string; // For accessibility
  "aria-label"?: string; // For accessibility
}

/**
 * Props for level selectors.
 */
interface LevelSelectorProps {
    startLevel: number;
    handleLevelSelect: (level: number) => void;
    handleHover: () => void;
}

/**
 * Mock curve for speed visualization based on level.
 * @param {number} level The current game level.
 * @returns {number} The calculated height percentage for visualization.
 */
const getSpeedHeight = (level: number): number => {
    return Math.min(100, 10 + Math.pow(level, 1.5) * 0.8);
}

/**
 * Component for selecting the starting level for Marathon, Master, or Battle modes.
 */
const StartLevelSelector: React.FC<LevelSelectorProps> = ({ startLevel, handleLevelSelect, handleHover }) => (
    <>
        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-6 block" id="start-level-label">Start Level</label>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-3 mb-8" role="radiogroup" aria-labelledby="start-level-label">
            {[...Array(20)].map((_, i) => (
                <button key={i} onClick={() => handleLevelSelect(i)} onMouseEnter={handleHover} className={`aspect-square flex items-center justify-center text-sm font-mono font-bold transition-all duration-200 relative group ${startLevel === i ? 'bg-cyan-600 text-white shadow-[0_0_20px_cyan] scale-110 z-10 rounded' : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700 hover:text-white rounded-sm'}`} role="radio" aria-checked={startLevel === i} aria-label={`Start at Level ${i}`}>
                    {i}
                    <div className={`absolute bottom-0 left-0 w-full bg-white/20 transition-all duration-300 ${startLevel === i ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`} style={{ height: `${getSpeedHeight(i)}%` }} aria-hidden="true"></div>
                </button>
            ))}
        </div>
    </>
);

/**
 * Component for selecting a puzzle scenario.
 */
const PuzzleLevelSelector: React.FC<LevelSelectorProps> = ({ startLevel, handleLevelSelect }) => (
    <div className="space-y-4 mb-8">
        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2 block" id="puzzle-scenario-label">Select Puzzle Scenario</label>
        <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="puzzle-scenario-label">
            {PUZZLE_LEVELS.map((puzzle, i) => (
                <button key={i} onClick={() => handleLevelSelect(i)} className={`p-4 border rounded text-left transition-all flex justify-between items-center ${startLevel === i ? 'bg-cyan-950/40 border-cyan-500' : 'bg-gray-900/40 border-gray-800 hover:bg-gray-800'}`} role="radio" aria-checked={startLevel === i} aria-label={`Puzzle: ${puzzle.name}. ${puzzle.description}`}>
                    <div>
                        <div className={`font-bold uppercase tracking-wider ${startLevel === i ? 'text-cyan-400' : 'text-white'}`}>{puzzle.name}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{puzzle.description}</div>
                    </div>
                    {startLevel === i && <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" aria-hidden="true"></div>}
                </button>
            ))}
        </div>
    </div>
);


/**
 * MainMenu component provides the starting interface for the game,
 * allowing users to select game modes, starting levels, and view high scores.
 */
const MainMenu = forwardRef<HTMLDivElement, Props>(({ onStart, highScore, ...rest }, ref: Ref<HTMLDivElement>) => {
  const [startLevel, setStartLevel] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode>('MARATHON');
  const [showHelp, setShowHelp] = useState(false);
  const helpModalRef = useRef<HTMLDivElement>(null); 

  const handleStart = (): void => {
      audioManager.playUiSelect();
      onStart(startLevel, selectedMode);
  };
  
  const handleLevelSelect = (lvl: number): void => {
      if (lvl !== startLevel) {
        audioManager.playUiClick();
        setStartLevel(lvl);
      }
  };

  const handleModeSelect = (mode: GameMode): void => {
      if (mode !== selectedMode) {
          audioManager.playUiClick();
          setSelectedMode(mode);
          // BLITZ, ZEN, SPRINT, TIME_ATTACK, PUZZLE, ADVENTURE typically start at a fixed configuration
          if (['BLITZ', 'ZEN', 'SPRINT', 'TIME_ATTACK', 'PUZZLE', 'ADVENTURE'].includes(mode)) {
              setStartLevel(0);
          } else {
              setStartLevel(0);
          }
      }
  };

  const handleHover = (): void => audioManager.playUiHover();

  useEffect(() => {
    if (showHelp) {
      helpModalRef.current?.focus();
    }
  }, [showHelp]);

  const MODES = [
      { id: 'ADVENTURE', icon: MapIcon, label: 'Adventure', desc: 'Explore worlds, defeat bosses, and uncover the story.', 'aria-label': 'Start Adventure mode' },
      { id: 'MARATHON', icon: Infinity, label: 'Marathon', desc: 'Endless survival. Speed increases every 10 lines.', 'aria-label': 'Start Marathon mode' },
      { id: 'BLITZ', icon: Gauge, label: 'Blitz', desc: 'Fast-paced action! Clear for points as the game gets faster over 2 minutes.', 'aria-label': 'Start Blitz mode' }, // New BLITZ mode
      { id: 'TIME_ATTACK', icon: Timer, label: 'Time Attack', desc: 'Score as much as possible in 3 minutes.', 'aria-label': 'Start Time Attack mode' },
      { id: 'SPRINT', icon: Zap, label: 'Sprint 40', desc: 'Clear 40 lines as fast as you can.', 'aria-label': 'Start Sprint 40 Lines mode' },
      { id: 'BATTLE', icon: Swords, label: 'VS CPU', desc: 'Survival Mode. Defend against incoming garbage lines.', 'aria-label': 'Start VS CPU Battle mode' },
      { id: 'PUZZLE', icon: Puzzle, label: 'Puzzle', desc: 'Solve hand-crafted scenarios by clearing all blocks.', 'aria-label': 'Select Puzzle mode' },
      { id: 'ZEN', icon: Sparkles, label: 'Zen', desc: 'No gravity. No Game Over. Pure practice.', 'aria-label': 'Start Zen mode' },
      { id: 'MASTER', icon: Crown, label: 'Master', desc: '20G Gravity. Instant drop only. For experts.', 'aria-label': 'Start Master mode' },
  ];

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030508] font-sans overflow-hidden"
      ref={ref}
      tabIndex={-1}
      onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              if (ref && typeof ref !== 'function') {
                ref.current?.focus();
              }
          }
      }}
      {...rest}
    >
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(22,30,50,0.8),#030508_90%)]" aria-hidden="true"></div>
       <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} aria-hidden="true"></div>
       
       <div className="relative z-10 w-full h-full max-w-7xl p-6 md:p-12 flex flex-col lg:flex-row gap-8 lg:gap-12 overflow-y-auto custom-scrollbar">
           
           <header className="w-full lg:w-1/3 flex flex-col justify-center lg:justify-between shrink-0 min-h-[400px]">
               <div className="space-y-2 mb-8 lg:mb-0">
                   <div className="flex items-center gap-2 mb-4 lg:mb-8 opacity-50">
                       <Globe size={14} className="text-cyan-500" aria-hidden="true" />
                       <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-bold">Tetrios Network</span>
                   </div>
                   <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 tracking-tighter italic drop-shadow-2xl leading-[0.9] md:leading-[0.8]">
                       TETRIOS
                   </h1>
                   <div className="h-2 w-24 bg-cyan-500 shadow-[0_0_20px_cyan]" aria-hidden="true"></div>
                   <p className="text-gray-500 text-xs tracking-widest uppercase mt-4 max-w-xs leading-relaxed">
                       High-Fidelity stacking simulation. <br/>
                       V1.4.0 // Ultimate Edition
                   </p>
               </div>

               <section className="mt-8 lg:mt-12 space-y-4" aria-label="Player Records and Information">
                   <div className="p-6 bg-gray-900/40 border border-gray-800 rounded backdrop-blur-sm group hover:border-cyan-900/50 transition-colors">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-2 bg-gray-800 rounded text-gray-400 group-hover:text-yellow-400 transition-colors"><Award size={20} aria-hidden="true"/></div>
                           <div className="text-[10px] uppercase tracking-widest text-gray-500">Local Record</div>
                       </div>
                       <div className="text-3xl md:text-4xl font-mono font-bold text-white group-hover:text-yellow-400 transition-colors" aria-live="polite">{highScore.toLocaleString()}</div>
                   </div>
                   
                   <div className="flex gap-4">
                       <button onClick={() => setShowHelp(true)} onMouseEnter={handleHover} className="flex-1 p-6 bg-gray-900/40 border border-gray-800 rounded hover:bg-gray-800 hover:border-gray-600 transition-all text-left group" aria-label="Open Game Tutorial">
                           <div className="text-gray-400 mb-2 group-hover:text-cyan-400"><HelpCircle size={20} aria-hidden="true"/></div>
                           <div className="text-xs font-bold uppercase text-gray-300">Tutorial</div>
                       </button>
                       <div className="flex-1 p-6 bg-gray-900/40 border border-gray-800 rounded opacity-50 cursor-not-allowed text-left" aria-disabled="true" role="button" aria-label="Profile (Unavailable)">
                           <div className="text-gray-600 mb-2"><User size={20} aria-hidden="true"/></div>
                           <div className="text-xs font-bold uppercase text-gray-500">Profile</div>
                       </div>
                   </div>
               </section>
           </header>

           <section className="w-full lg:w-2/3 flex flex-col bg-gray-900/30 border border-gray-800 rounded-xl backdrop-blur-xl overflow-hidden relative shadow-2xl min-h-[600px]" aria-label="Mission Configuration">
               <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none" aria-hidden="true"><BarChart3 size={128} /></div>

               <div className="p-6 md:p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                   <header>
                       <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3" role="heading" aria-level={2}><Zap size={20} className="text-cyan-500" aria-hidden="true" /> Mission Config</h2>
                       <p className="text-xs text-gray-500 mt-1">Select mode and starting parameters</p>
                   </header>
                   <div className="text-right">
                       <div className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold">Mode</div>
                       <div className="text-xl font-mono font-bold text-white" aria-live="polite">{selectedMode.replace('_', ' ')}</div>
                   </div>
               </div>

               <div className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto">
                   <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4 block" id="operation-mode-label">Operation Mode</label>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8" role="radiogroup" aria-labelledby="operation-mode-label">
                       {MODES.map((mode) => (
                           <button key={mode.id} onClick={() => handleModeSelect(mode.id as GameMode)} onMouseEnter={handleHover} className={`p-3 flex flex-col items-center gap-2 rounded border transition-all ${selectedMode === mode.id ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:bg-gray-800 hover:text-gray-300'} ${mode.id === 'ADVENTURE' ? 'md:col-span-2 bg-gradient-to-r from-indigo-900/50 to-purple-900/50' : ''}`} role="radio" aria-checked={selectedMode === mode.id} aria-label={mode['aria-label']}>
                               <mode.icon size={24} className={selectedMode === mode.id ? 'text-cyan-400' : 'text-gray-600'} aria-hidden="true" />
                               <span className="text-[9px] uppercase font-bold tracking-wider">{mode.label}</span>
                           </button>
                       ))}
                   </div>
                   <p className="p-3 bg-blue-900/20 border-l-2 border-blue-500 text-xs text-blue-300 mb-8 font-mono" aria-live="polite">{MODES.find(m => m.id === selectedMode)?.desc}</p>

                   {(selectedMode === 'MARATHON' || selectedMode === 'MASTER' || selectedMode === 'BATTLE') && (
                       <StartLevelSelector startLevel={startLevel} handleLevelSelect={handleLevelSelect} handleHover={handleHover} />
                   )}

                   {selectedMode === 'PUZZLE' && (
                       <PuzzleLevelSelector startLevel={startLevel} handleLevelSelect={handleLevelSelect} handleHover={handleHover} />
                   )}

                   <div className="mt-auto pt-4">
                       <button onClick={handleStart} onMouseEnter={handleHover} className="w-full py-6 bg-white hover:bg-cyan-50 text-black hover:text-cyan-900 text-xl font-black uppercase tracking-[0.3em] transition-all rounded flex items-center justify-center gap-4 group shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)]" aria-label="Initialize Game">
                            {selectedMode === 'ADVENTURE' ? 'Open Map' : 'Initialize'} <ChevronRight className="group-hover:translate-x-2 transition-transform" aria-hidden="true" />
                       </button>
                   </div>
               </div>
           </section>
       </div>

       {showHelp && (
           <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200" ref={helpModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Game Tutorial and Help" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) helpModalRef.current?.focus(); }}>
               <div className="bg-gray-900 border border-gray-700 max-w-2xl w-full p-8 rounded-xl relative shadow-2xl max-h-[90vh] overflow-y-auto">
                   <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white" aria-label="Close tutorial"><X size={24}/></button>
                   <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3" role="heading" aria-level={2}><HelpCircle className="text-cyan-500" aria-hidden="true"/> Flight Manual</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <section className="space-y-6" aria-labelledby="controls-heading">
                           <h3 id="controls-heading" className="text-xs text-gray-400 uppercase tracking-widest font-bold border-b border-gray-800 pb-2" role="heading" aria-level={3}>Controls</h3>
                           <div className="space-y-3 text-sm text-gray-300">
                               <div className="flex justify-between"><span>Move</span> <span className="font-mono text-cyan-400">ARROWS</span></div>
                               <div className="flex justify-between"><span>Rotate</span> <span className="font-mono text-cyan-400">UP / Z / X</span></div>
                               <div className="flex justify-between"><span>Hard Drop</span> <span className="font-mono text-cyan-400">SPACE</span></div>
                               <div className="flex justify-between"><span>Hold</span> <span className="font-mono text-cyan-400">C / SHIFT</span></div>
                           </section>
                       <section className="space-y-6" aria-labelledby="scoring-heading">
                           <h3 id="scoring-heading" className="text-xs text-gray-400 uppercase tracking-widest font-bold border-b border-gray-800 pb-2" role="heading" aria-level={3}>Scoring</h3>
                           <div className="space-y-3 text-sm text-gray-300">
                               <div className="flex justify-between"><span>Single</span> <span className="font-mono text-yellow-500">100</span></div>
                               <div className="flex justify-between"><span>Tetris</span> <span className="font-mono text-yellow-500">800</span></div>
                               <div className="flex justify-between"><span>T-Spin</span> <span className="font-mono text-magenta-500 text-[#d946ef] font-bold">400+</span></div>
                               <div className="flex justify-between"><span>Back-to-Back</span> <span className="font-mono text-green-400">x1.5</span></div>
                           </section>
                   </div>
                   <div className="mt-8 pt-6 border-t border-gray-800 text-center">
                        <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest font-bold" aria-label="Close Manual">Close Manual</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
});

export default MainMenu;