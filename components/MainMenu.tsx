


import React, { useState, useEffect, forwardRef, Ref, useRef } from 'react';
import { Play, Award, Zap, HelpCircle, ChevronRight, BarChart3, User, Globe, Infinity, Timer, Sparkles, Crown, Puzzle, Swords, X, Map as MapIcon, Gauge, ShieldAlert, Layers } from 'lucide-react'; 
import { audioManager } from '../utils/audioManager';
import { GameMode } from '../types';
import { PUZZLE_LEVELS } from '../constants';
import { useModalStore } from '../stores/modalStore';
import { useProfileStore } from '../stores/profileStore';

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
 */
const getSpeedHeight = (level: number): number => {
    return Math.min(100, 10 + Math.pow(level, 1.5) * 0.8);
}

/**
 * Component for selecting the starting level.
 */
const StartLevelSelector: React.FC<LevelSelectorProps> = ({ startLevel, handleLevelSelect, handleHover }) => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <label className="text-xs text-cyan-300/70 uppercase tracking-widest font-bold mb-4 block" id="start-level-label">Start Level</label>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-8" role="radiogroup" aria-labelledby="start-level-label">
            {[...Array(20)].map((_, i) => (
                <button 
                    key={i} 
                    onClick={() => handleLevelSelect(i)} 
                    onMouseEnter={handleHover} 
                    className={`aspect-square flex items-center justify-center text-sm font-mono font-bold transition-all duration-300 relative overflow-hidden rounded-md group border
                        ${startLevel === i 
                            ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-110 z-10' 
                            : 'bg-gray-800/30 border-white/5 text-gray-500 hover:bg-gray-700/50 hover:border-white/20 hover:text-white'}
                    `} 
                    role="radio" 
                    aria-checked={startLevel === i} 
                    aria-label={`Start at Level ${i}`}
                >
                    <span className="relative z-10">{i}</span>
                    <div 
                        className={`absolute bottom-0 left-0 w-full bg-cyan-400/20 transition-all duration-500 ease-out ${startLevel === i ? 'opacity-100 h-full' : 'opacity-0 group-hover:opacity-30'}`} 
                        style={{ height: startLevel === i ? '100%' : `${getSpeedHeight(i)}%` }} 
                        aria-hidden="true"
                    ></div>
                </button>
            ))}
        </div>
    </div>
);

/**
 * Component for selecting a puzzle scenario.
 */
const PuzzleLevelSelector: React.FC<LevelSelectorProps> = ({ startLevel, handleLevelSelect }) => (
    <div className="space-y-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <label className="text-xs text-cyan-300/70 uppercase tracking-widest font-bold mb-2 block" id="puzzle-scenario-label">Select Puzzle Scenario</label>
        <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="puzzle-scenario-label">
            {PUZZLE_LEVELS.map((puzzle, i) => (
                <button 
                    key={i} 
                    onClick={() => handleLevelSelect(i)} 
                    className={`p-4 border rounded-xl text-left transition-all duration-300 flex justify-between items-center group
                        ${startLevel === i 
                            ? 'bg-cyan-900/40 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                            : 'bg-gray-900/20 border-white/10 hover:bg-gray-800/40 hover:border-white/20'}
                    `} 
                    role="radio" 
                    aria-checked={startLevel === i} 
                    aria-label={`Puzzle: ${puzzle.name}. ${puzzle.description}`}
                >
                    <div>
                        <div className={`font-bold uppercase tracking-wider transition-colors ${startLevel === i ? 'text-cyan-400' : 'text-gray-300 group-hover:text-white'}`}>{puzzle.name}</div>
                        <div className="text-[11px] text-gray-500 mt-1 group-hover:text-gray-400">{puzzle.description}</div>
                    </div>
                    {startLevel === i && <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_cyan]" aria-hidden="true"></div>}
                </button>
            ))}
        </div>
    </div>
);


/**
 * MainMenu component.
 */
const MainMenu = forwardRef<HTMLDivElement, Props>(({ onStart, highScore, ...rest }, ref: Ref<HTMLDivElement>) => {
  const [startLevel, setStartLevel] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode>('MARATHON');
  
  const { isHelpOpen, openHelp, closeHelp, openProfile } = useModalStore();
  const { playerName } = useProfileStore();
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
          if (['BLITZ', 'ZEN', 'SPRINT', 'TIME_ATTACK', 'PUZZLE', 'ADVENTURE', 'SURVIVAL', 'COMBO_MASTER'].includes(mode)) {
              setStartLevel(0);
          } else {
              setStartLevel(0);
          }
      }
  };

  const handleHover = (): void => audioManager.playUiHover();

  useEffect(() => {
    if (isHelpOpen) {
      helpModalRef.current?.focus();
    }
  }, [isHelpOpen]);

  const MODES = [
      { id: 'ADVENTURE', icon: MapIcon, label: 'Adventure', desc: 'Explore worlds, defeat bosses, and uncover the story.', 'aria-label': 'Start Adventure mode' },
      { id: 'MARATHON', icon: Infinity, label: 'Marathon', desc: 'Endless survival. Speed increases every 10 lines.', 'aria-label': 'Start Marathon mode' },
      { id: 'BLITZ', icon: Gauge, label: 'Blitz', desc: 'Fast-paced action! Clear for points as the game gets faster over 2 minutes.', 'aria-label': 'Start Blitz mode' },
      { id: 'SURVIVAL', icon: ShieldAlert, label: 'Survival', desc: 'Garbage rises relentlessly. Survive as long as possible.', 'aria-label': 'Start Survival mode' },
      { id: 'COMBO_MASTER', icon: Layers, label: 'Combo Master', desc: 'Keep the combo alive to extend your time.', 'aria-label': 'Start Combo Master mode' },
      { id: 'TIME_ATTACK', icon: Timer, label: 'Time Attack', desc: 'Score as much as possible in 3 minutes.', 'aria-label': 'Start Time Attack mode' },
      { id: 'SPRINT', icon: Zap, label: 'Sprint 40', desc: 'Clear 40 lines as fast as you can.', 'aria-label': 'Start Sprint 40 Lines mode' },
      { id: 'BATTLE', icon: Swords, label: 'VS CPU', desc: 'Survival Mode. Defend against incoming garbage lines.', 'aria-label': 'Start VS CPU Battle mode' },
      { id: 'PUZZLE', icon: Puzzle, label: 'Puzzle', desc: 'Solve hand-crafted scenarios by clearing all blocks.', 'aria-label': 'Select Puzzle mode' },
      { id: 'ZEN', icon: Sparkles, label: 'Zen', desc: 'No gravity. No Game Over. Pure practice.', 'aria-label': 'Start Zen mode' },
      { id: 'MASTER', icon: Crown, label: 'Master', desc: '20G Gravity. Instant drop only. For experts.', 'aria-label': 'Start Master mode' },
  ];

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#030508] font-sans overflow-hidden"
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
       {/* Background Effects */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#050810] to-[#030508]" aria-hidden="true"></div>
       <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '80px 80px' }} aria-hidden="true"></div>
       
       <div className="relative z-10 w-full h-full max-w-[1600px] p-4 md:p-8 lg:p-12 flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-stretch overflow-y-auto custom-scrollbar">
           
           {/* Left Column: Branding & Profile */}
           <header className="w-full lg:w-1/3 flex flex-col justify-center lg:justify-center shrink-0 text-center lg:text-left animate-in slide-in-from-left-8 fade-in duration-700">
               <div className="space-y-6 mb-12">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-900/50 mx-auto lg:mx-0">
                       <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                       <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold">System Ready</span>
                   </div>
                   
                   <div>
                       <h1 className="text-7xl md:text-8xl xl:text-9xl font-black text-white tracking-tighter italic drop-shadow-2xl leading-[0.8]">
                           TETRIOS
                       </h1>
                       <div className="h-1.5 w-32 bg-gradient-to-r from-cyan-500 to-blue-600 mt-4 mx-auto lg:mx-0 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.6)]" aria-hidden="true"></div>
                   </div>

                   <p className="text-gray-400 text-sm tracking-widest uppercase max-w-md mx-auto lg:mx-0 leading-relaxed">
                       Advanced Stacking Simulation<br/>
                       <span className="text-cyan-500/60">Version 2.0 // High Fidelity</span>
                   </p>
               </div>

               <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0 w-full">
                   <button 
                       onClick={() => { audioManager.playUiSelect(); openProfile(); }} 
                       onMouseEnter={handleHover}
                       className="p-6 bg-gray-900/40 backdrop-blur-md border border-white/5 rounded-2xl group hover:bg-gray-800/40 hover:border-cyan-500/30 transition-all duration-300 text-left"
                   >
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400 group-hover:text-cyan-400 transition-colors"><User size={20} aria-hidden="true"/></div>
                           <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Operator</div>
                       </div>
                       <div className="text-lg lg:text-xl font-mono font-bold text-white truncate group-hover:text-cyan-100">{playerName}</div>
                   </button>

                   <div className="p-6 bg-gray-900/40 backdrop-blur-md border border-white/5 rounded-2xl group hover:bg-gray-800/40 hover:border-white/10 transition-all duration-300">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400 group-hover:text-yellow-400 transition-colors"><Award size={20} aria-hidden="true"/></div>
                           <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Best Score</div>
                       </div>
                       <div className="text-lg lg:text-xl font-mono font-bold text-white group-hover:scale-105 transition-transform origin-left truncate" aria-live="polite">{highScore.toLocaleString()}</div>
                   </div>
                   
                   <button onClick={() => { audioManager.playUiSelect(); openHelp(); }} onMouseEnter={handleHover} className="col-span-2 p-4 bg-gray-900/40 backdrop-blur-md border border-white/5 rounded-2xl hover:bg-gray-800/40 hover:border-white/10 transition-all duration-300 text-left group flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400 group-hover:text-white transition-colors"><HelpCircle size={20} aria-hidden="true"/></div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold group-hover:text-white">How to Play</div>
                        </div>
                        <ChevronRight className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" size={16} />
                   </button>
               </div>
           </header>

           {/* Right Column: Game Configuration */}
           <section className="w-full lg:w-2/3 flex flex-col h-full min-h-[600px] animate-in slide-in-from-right-8 fade-in duration-700 delay-100">
                <div className="bg-gray-900/20 border border-white/5 rounded-3xl backdrop-blur-xl overflow-hidden flex flex-col shadow-2xl h-full relative">
                    {/* Decorative Elements */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>

                    {/* Header */}
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
                                <Zap size={20} className="text-cyan-400" aria-hidden="true" /> 
                                Mission Setup
                            </h2>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-bold mb-1">Selected Mode</div>
                            <div className="text-2xl font-black italic text-white uppercase tracking-wider" aria-live="polite">{selectedMode.replace('_', ' ')}</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <label className="text-xs text-cyan-300/70 uppercase tracking-widest font-bold mb-4 block">Select Mode</label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-10">
                            {MODES.map((mode) => (
                                <button 
                                    key={mode.id} 
                                    onClick={() => handleModeSelect(mode.id as GameMode)} 
                                    onMouseEnter={handleHover} 
                                    className={`p-4 flex flex-col items-center gap-3 rounded-xl border transition-all duration-200 relative overflow-hidden group
                                        ${selectedMode === mode.id 
                                            ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                                            : 'bg-gray-800/20 border-white/5 text-gray-400 hover:bg-gray-800/50 hover:border-white/20 hover:text-white'} 
                                        ${mode.id === 'ADVENTURE' ? 'md:col-span-3 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30' : ''}
                                    `} 
                                    role="radio" 
                                    aria-checked={selectedMode === mode.id} 
                                    aria-label={mode['aria-label']}
                                >
                                    <mode.icon size={28} className={`transition-colors ${selectedMode === mode.id ? 'text-cyan-400' : 'text-gray-600 group-hover:text-gray-300'}`} aria-hidden="true" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">{mode.label}</span>
                                    {selectedMode === mode.id && <div className="absolute inset-0 bg-cyan-400/5 pointer-events-none"></div>}
                                </button>
                            ))}
                        </div>

                        {/* Dynamic Description Box */}
                        <div className="mb-8 p-4 rounded-lg bg-blue-950/20 border border-blue-500/20 text-sm text-blue-200/80 font-medium flex items-start gap-3 animate-in fade-in duration-300">
                            <div className="mt-0.5"><HelpCircle size={16} /></div>
                            {MODES.find(m => m.id === selectedMode)?.desc}
                        </div>

                        {/* Level Selectors */}
                        {(selectedMode === 'MARATHON' || selectedMode === 'MASTER' || selectedMode === 'BATTLE') && (
                            <StartLevelSelector startLevel={startLevel} handleLevelSelect={handleLevelSelect} handleHover={handleHover} />
                        )}

                        {selectedMode === 'PUZZLE' && (
                            <PuzzleLevelSelector startLevel={startLevel} handleLevelSelect={handleLevelSelect} handleHover={handleHover} />
                        )}
                    </div>

                    {/* Footer Action */}
                    <div className="p-8 pt-0 mt-auto relative z-20">
                        <button 
                            onClick={handleStart} 
                            onMouseEnter={handleHover} 
                            className="w-full py-6 bg-white hover:bg-cyan-50 text-black text-xl font-black uppercase tracking-[0.3em] transition-all duration-300 rounded-xl flex items-center justify-center gap-4 group shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:scale-[1.01] active:scale-[0.99]" 
                            aria-label="Initialize Game"
                        >
                            <span>{selectedMode === 'ADVENTURE' ? 'Launch Map' : 'Initialize System'}</span>
                            <ChevronRight className="group-hover:translate-x-2 transition-transform text-cyan-600" aria-hidden="true" />
                        </button>
                    </div>
                </div>
           </section>
       </div>

       {/* Help Modal */}
       {isHelpOpen && (
           <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200" ref={helpModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Game Tutorial and Help" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) helpModalRef.current?.focus(); }}>
               <div className="bg-[#0a0f1e] border border-gray-700 max-w-2xl w-full p-8 rounded-3xl relative shadow-2xl max-h-[90vh] overflow-y-auto">
                   <button onClick={() => { audioManager.playUiBack(); closeHelp(); }} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors" aria-label="Close tutorial"><X size={24}/></button>
                   <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-10 flex items-center gap-4" role="heading" aria-level={2}>
                       <span className="w-12 h-12 bg-cyan-900/50 rounded-xl flex items-center justify-center border border-cyan-500/30 text-cyan-400"><HelpCircle size={28} /></span>
                       Flight Manual
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <section className="space-y-6" aria-labelledby="controls-heading">
                           <h3 id="controls-heading" className="text-xs text-cyan-500 uppercase tracking-widest font-bold border-b border-gray-800 pb-2" role="heading" aria-level={3}>Navigation</h3>
                           <div className="space-y-4 text-sm text-gray-300">
                               <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded"><span>Move</span> <span className="font-mono text-cyan-400 font-bold bg-cyan-950/50 px-2 py-1 rounded">ARROWS</span></div>
                               <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded"><span>Rotate</span> <span className="font-mono text-cyan-400 font-bold bg-cyan-950/50 px-2 py-1 rounded">UP / Z / X</span></div>
                               <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded"><span>Hard Drop</span> <span className="font-mono text-cyan-400 font-bold bg-cyan-950/50 px-2 py-1 rounded">SPACE</span></div>
                               <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded"><span>Hold</span> <span className="font-mono text-cyan-400 font-bold bg-cyan-950/50 px-2 py-1 rounded">C / SHIFT</span></div>
                           </div>
                       </section>
                       <section className="space-y-6" aria-labelledby="scoring-heading">
                           <h3 id="scoring-heading" className="text-xs text-yellow-500 uppercase tracking-widest font-bold border-b border-gray-800 pb-2" role="heading" aria-level={3}>Scoring Data</h3>
                           <div className="space-y-4 text-sm text-gray-300">
                               <div className="flex justify-between border-b border-gray-800/50 pb-2"><span>Single</span> <span className="font-mono text-white">100</span></div>
                               <div className="flex justify-between border-b border-gray-800/50 pb-2"><span>Tetris</span> <span className="font-mono text-yellow-400 font-bold">800</span></div>
                               <div className="flex justify-between border-b border-gray-800/50 pb-2"><span>T-Spin</span> <span className="font-mono text-fuchsia-400 font-bold">400+</span></div>
                               <div className="flex justify-between"><span>Back-to-Back</span> <span className="font-mono text-emerald-400 font-bold">x1.5</span></div>
                           </div>
                       </section>
                   </div>
                   <div className="mt-10 pt-6 border-t border-gray-800 text-center">
                        <button onClick={() => { audioManager.playUiBack(); closeHelp(); }} className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs uppercase tracking-widest font-bold transition-colors" aria-label="Close Manual">Close Manual</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
});

export default MainMenu;