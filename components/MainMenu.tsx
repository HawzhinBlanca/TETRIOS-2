
import React, { useState, useEffect } from 'react';
import { Play, Award, Zap, HelpCircle, ChevronRight, BarChart3, User, Globe, Infinity, Timer, Sparkles, Crown, Puzzle, Swords } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { GameMode } from '../types';
import { PUZZLE_LEVELS } from '../constants';

interface Props {
  onStart: (level: number, mode: GameMode) => void;
  highScore: number;
}

// Mock curve for speed visualization
const getSpeedHeight = (level: number) => {
    return Math.min(100, 10 + Math.pow(level, 1.5) * 0.8);
}

const MainMenu: React.FC<Props> = ({ onStart, highScore }) => {
  const [startLevel, setStartLevel] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode>('MARATHON');
  const [showHelp, setShowHelp] = useState(false);

  // Audio triggers
  const handleStart = () => {
      audioManager.playUiSelect();
      onStart(startLevel, selectedMode);
  };
  
  const handleLevelSelect = (lvl: number) => {
      if (lvl !== startLevel) {
        audioManager.playUiClick();
        setStartLevel(lvl);
      }
  };

  const handleModeSelect = (mode: GameMode) => {
      if (mode !== selectedMode) {
          audioManager.playUiClick();
          setSelectedMode(mode);
          // Reset start level when changing modes
          setStartLevel(0);
      }
  };

  const handleHover = () => audioManager.playUiHover();

  const MODES = [
      { id: 'MARATHON', icon: Infinity, label: 'Marathon', desc: 'Endless survival. Speed increases every 10 lines.' },
      { id: 'TIME_ATTACK', icon: Timer, label: 'Time Attack', desc: 'Score as much as possible in 3 minutes.' },
      { id: 'SPRINT', icon: Zap, label: 'Sprint 40', desc: 'Clear 40 lines as fast as you can.' },
      { id: 'BATTLE', icon: Swords, label: 'VS CPU', desc: 'Survival Mode. Defend against incoming garbage lines.' },
      { id: 'PUZZLE', icon: Puzzle, label: 'Puzzle', desc: 'Solve hand-crafted scenarios by clearing all blocks.' },
      { id: 'ZEN', icon: Sparkles, label: 'Zen', desc: 'No gravity. No Game Over. Pure practice.' },
      { id: 'MASTER', icon: Crown, label: 'Master', desc: '20G Gravity. Instant drop only. For experts.' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030508] font-sans overflow-hidden">
       {/* Dynamic Background Layers */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(22,30,50,0.8),#030508_90%)]"></div>
       <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
       
       {/* Main Container - Responsive Scrollable Area */}
       <div className="relative z-10 w-full h-full max-w-7xl p-6 md:p-12 flex flex-col lg:flex-row gap-8 lg:gap-12 overflow-y-auto custom-scrollbar">
           
           {/* LEFT COLUMN: IDENTITY & STATS */}
           <div className="w-full lg:w-1/3 flex flex-col justify-center lg:justify-between shrink-0 min-h-[400px]">
               <div className="space-y-2 mb-8 lg:mb-0">
                   <div className="flex items-center gap-2 mb-4 lg:mb-8 opacity-50">
                       <Globe size={14} className="text-cyan-500" />
                       <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-bold">Tetrios Network</span>
                   </div>
                   <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 tracking-tighter italic drop-shadow-2xl leading-[0.9] md:leading-[0.8]">
                       TETRIOS
                   </h1>
                   <div className="h-2 w-24 bg-cyan-500 shadow-[0_0_20px_cyan]"></div>
                   <p className="text-gray-500 text-xs tracking-widest uppercase mt-4 max-w-xs leading-relaxed">
                       High-Fidelity stacking simulation. <br/>
                       V1.4.0 // Ultimate Edition
                   </p>
               </div>

               <div className="mt-8 lg:mt-12 space-y-4">
                   <div className="p-6 bg-gray-900/40 border border-gray-800 rounded backdrop-blur-sm group hover:border-cyan-900/50 transition-colors">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-2 bg-gray-800 rounded text-gray-400 group-hover:text-yellow-400 transition-colors"><Award size={20}/></div>
                           <div className="text-[10px] uppercase tracking-widest text-gray-500">Local Record</div>
                       </div>
                       <div className="text-3xl md:text-4xl font-mono font-bold text-white group-hover:text-yellow-400 transition-colors">{highScore.toLocaleString()}</div>
                   </div>
                   
                   <div className="flex gap-4">
                       <button 
                            onClick={() => setShowHelp(true)}
                            onMouseEnter={handleHover}
                            className="flex-1 p-6 bg-gray-900/40 border border-gray-800 rounded hover:bg-gray-800 hover:border-gray-600 transition-all text-left group"
                        >
                           <div className="text-gray-400 mb-2 group-hover:text-cyan-400"><HelpCircle size={20}/></div>
                           <div className="text-xs font-bold uppercase text-gray-300">Tutorial</div>
                       </button>
                       <div className="flex-1 p-6 bg-gray-900/40 border border-gray-800 rounded opacity-50 cursor-not-allowed text-left">
                           <div className="text-gray-600 mb-2"><User size={20}/></div>
                           <div className="text-xs font-bold uppercase text-gray-500">Profile</div>
                       </div>
                   </div>
               </div>
           </div>

           {/* RIGHT COLUMN: COMMAND CENTER */}
           <div className="w-full lg:w-2/3 flex flex-col bg-gray-900/30 border border-gray-800 rounded-xl backdrop-blur-xl overflow-hidden relative shadow-2xl min-h-[600px]">
               <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                   <BarChart3 size={128} />
               </div>

               <div className="p-6 md:p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                   <div>
                       <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
                           <Zap size={20} className="text-cyan-500" /> Mission Config
                       </h2>
                       <p className="text-xs text-gray-500 mt-1">Select mode and starting parameters</p>
                   </div>
                   <div className="text-right">
                       <div className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold">Mode</div>
                       <div className="text-xl font-mono font-bold text-white">{selectedMode.replace('_', ' ')}</div>
                   </div>
               </div>

               <div className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto">
                   
                   {/* MODE SELECTOR */}
                   <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4 block">Operation Mode</label>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
                       {MODES.map((mode) => (
                           <button
                               key={mode.id}
                               onClick={() => handleModeSelect(mode.id as GameMode)}
                               onMouseEnter={handleHover}
                               className={`p-3 flex flex-col items-center gap-2 rounded border transition-all ${
                                   selectedMode === mode.id 
                                   ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                                   : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                               }`}
                           >
                               <mode.icon size={24} className={selectedMode === mode.id ? 'text-cyan-400' : 'text-gray-600'} />
                               <span className="text-[9px] uppercase font-bold tracking-wider">{mode.label}</span>
                           </button>
                       ))}
                   </div>
                   <div className="p-3 bg-blue-900/20 border-l-2 border-blue-500 text-xs text-blue-300 mb-8 font-mono">
                       {MODES.find(m => m.id === selectedMode)?.desc}
                   </div>

                   {/* LEVEL SELECTOR (Hidden for some modes) */}
                   {(selectedMode === 'MARATHON' || selectedMode === 'MASTER' || selectedMode === 'BATTLE') && (
                       <>
                           <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-6 block">Start Level</label>
                           <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-3 mb-8">
                               {[...Array(20)].map((_, i) => (
                                   <button
                                       key={i}
                                       onClick={() => handleLevelSelect(i)}
                                       onMouseEnter={handleHover}
                                       className={`aspect-square flex items-center justify-center text-sm font-mono font-bold transition-all duration-200 relative group ${
                                           startLevel === i 
                                           ? 'bg-cyan-600 text-white shadow-[0_0_20px_cyan] scale-110 z-10 rounded' 
                                           : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700 hover:text-white rounded-sm'
                                       }`}
                                   >
                                       {i}
                                       <div 
                                         className={`absolute bottom-0 left-0 w-full bg-white/20 transition-all duration-300 ${startLevel === i ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`}
                                         style={{ height: `${getSpeedHeight(i)}%` }}
                                       ></div>
                                   </button>
                               ))}
                           </div>

                           <div className="flex-1 min-h-[100px] bg-gray-950/50 border border-gray-800 rounded mb-8 relative overflow-hidden flex items-end px-4 pb-0 gap-1">
                               <div className="absolute top-4 left-4 text-[10px] text-gray-600 uppercase tracking-widest">Gravity Curve Projection</div>
                               {[...Array(40)].map((_, i) => {
                                   const h = Math.min(100, 5 + Math.pow(i / 2, 1.6));
                                   const isActive = i / 2 <= startLevel;
                                   return (
                                       <div 
                                        key={i} 
                                        className={`flex-1 rounded-t-sm transition-all duration-500 ${isActive ? 'bg-cyan-500 shadow-[0_0_10px_cyan]' : 'bg-gray-800'}`}
                                        style={{ height: `${h}%`, opacity: isActive ? 0.8 : 0.2 }}
                                       ></div>
                                   )
                               })}
                           </div>
                       </>
                   )}

                   {/* PUZZLE SELECTOR */}
                   {selectedMode === 'PUZZLE' && (
                       <div className="space-y-4 mb-8">
                           <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2 block">Select Puzzle Scenario</label>
                           <div className="grid grid-cols-1 gap-3">
                               {PUZZLE_LEVELS.map((puzzle, i) => (
                                   <button
                                       key={i}
                                       onClick={() => handleLevelSelect(i)}
                                       className={`p-4 border rounded text-left transition-all flex justify-between items-center ${
                                           startLevel === i 
                                           ? 'bg-cyan-950/40 border-cyan-500' 
                                           : 'bg-gray-900/40 border-gray-800 hover:bg-gray-800'
                                       }`}
                                   >
                                       <div>
                                           <div className={`font-bold uppercase tracking-wider ${startLevel === i ? 'text-cyan-400' : 'text-white'}`}>
                                               {puzzle.name}
                                           </div>
                                           <div className="text-[10px] text-gray-500 mt-1">{puzzle.description}</div>
                                       </div>
                                       {startLevel === i && <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>}
                                   </button>
                               ))}
                           </div>
                       </div>
                   )}

                   <div className="mt-auto pt-4">
                       <button 
                          onClick={handleStart}
                          onMouseEnter={handleHover}
                          className="w-full py-6 bg-white hover:bg-cyan-50 text-black hover:text-cyan-900 text-xl font-black uppercase tracking-[0.3em] transition-all rounded flex items-center justify-center gap-4 group shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)]"
                       >
                            Initialize <ChevronRight className="group-hover:translate-x-2 transition-transform" />
                       </button>
                   </div>
               </div>
           </div>
       </div>

       {/* HELP MODAL */}
       {showHelp && (
           <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
               <div className="bg-gray-900 border border-gray-700 max-w-2xl w-full p-8 rounded-xl relative shadow-2xl max-h-[90vh] overflow-y-auto">
                   <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><Play className="rotate-180" size={24}/></button>
                   <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                       <HelpCircle className="text-cyan-500"/> Flight Manual
                   </h2>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                           <h3 className="text-xs text-gray-400 uppercase tracking-widest font-bold border-b border-gray-800 pb-2">Controls</h3>
                           <div className="space-y-3 text-sm text-gray-300">
                               <div className="flex justify-between"><span>Move</span> <span className="font-mono text-cyan-400">ARROWS</span></div>
                               <div className="flex justify-between"><span>Rotate</span> <span className="font-mono text-cyan-400">UP / Z / X</span></div>
                               <div className="flex justify-between"><span>Hard Drop</span> <span className="font-mono text-cyan-400">SPACE</span></div>
                               <div className="flex justify-between"><span>Hold</span> <span className="font-mono text-cyan-400">C / SHIFT</span></div>
                           </div>
                       </div>
                       <div className="space-y-6">
                           <h3 className="text-xs text-gray-400 uppercase tracking-widest font-bold border-b border-gray-800 pb-2">Scoring</h3>
                           <div className="space-y-3 text-sm text-gray-300">
                               <div className="flex justify-between"><span>Single</span> <span className="font-mono text-yellow-500">100</span></div>
                               <div className="flex justify-between"><span>Tetris</span> <span className="font-mono text-yellow-500">800</span></div>
                               <div className="flex justify-between"><span>T-Spin</span> <span className="font-mono text-magenta-500 text-[#d946ef] font-bold">400+</span></div>
                               <div className="flex justify-between"><span>Back-to-Back</span> <span className="font-mono text-green-400">x1.5</span></div>
                           </div>
                       </div>
                   </div>
                   <div className="mt-8 pt-6 border-t border-gray-800 text-center">
                        <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest font-bold">Close Manual</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default MainMenu;
