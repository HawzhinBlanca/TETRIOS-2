
import React, { useState } from 'react';
import { GameMode, Difficulty } from '../types';
import { useProfileStore } from '../stores/profileStore';
import { useModalStore } from '../stores/modalStore';
import { useUiStore } from '../stores/uiStore';
import Button from './ui/Button';
import GlassPanel from './ui/GlassPanel';
import { DIFFICULTY_SETTINGS, GAME_MODES_CONFIG } from '../constants';
import { getIcon } from '../utils/icons';
import { useUiSound } from '../hooks/useUiSound';

interface MainMenuProps {
    onStart: (startLevel: number, mode: GameMode, difficulty: Difficulty) => void;
    onContinue?: () => void;
    savedGameExists?: boolean;
}

const MainMenu = React.forwardRef<HTMLDivElement, MainMenuProps>(({ onStart, onContinue, savedGameExists }, ref) => {
    const [selectedMode, setSelectedMode] = useState<GameMode>('MARATHON');
    const [startLevel, setStartLevel] = useState(0);
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('MEDIUM');
    
    const { stats: profileStats } = useProfileStore();
    const { openSettings, openProfile, openLeaderboard } = useModalStore();
    const { isMuted, toggleMute } = useUiStore();
    const { playUiSelect, playUiClick } = useUiSound();

    const handleStart = () => {
        playUiSelect();
        onStart(startLevel, selectedMode, selectedDifficulty);
    };

    const handleModeSelect = (mode: GameMode) => {
        playUiClick();
        setSelectedMode(mode);
    };

    const handleLevelChange = (delta: number) => {
        playUiClick();
        setStartLevel(prev => Math.max(0, Math.min(29, prev + delta)));
    };

    const handleDifficultySelect = (diff: Difficulty) => {
        playUiClick();
        setSelectedDifficulty(diff);
    };

    const activeModeConfig = GAME_MODES_CONFIG.find(m => m.id === selectedMode) || GAME_MODES_CONFIG[0];
    const currentModeHighScore = profileStats.highScores?.[selectedMode] || 0;
    const diffConfig = DIFFICULTY_SETTINGS[selectedDifficulty];
    const ActiveIcon = getIcon(activeModeConfig.icon);

    const FOOTER_ACTIONS = [
        { icon: 'Settings', onClick: openSettings },
        { icon: 'User', onClick: openProfile },
        { icon: 'Trophy', onClick: openLeaderboard },
        { icon: isMuted ? 'VolumeX' : 'Volume2', onClick: toggleMute }
    ];

    return (
        <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712] overflow-hidden" role="dialog" aria-modal="true" aria-label="Main Menu">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-purple-900/10 pointer-events-none"></div>

            <div className="w-full h-full max-w-7xl mx-auto flex flex-col lg:flex-row p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] gap-4 lg:gap-8 overflow-y-auto lg:overflow-hidden custom-scrollbar">
                
                {/* --- Left Column: Navigation (Mode Selection) --- */}
                <div className="flex-shrink-0 lg:w-[350px] flex flex-col gap-4 order-2 lg:order-1">
                    <div className="hidden lg:block mb-4">
                        <h1 className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">TETRIOS</h1>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-[0.4em] uppercase pl-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            System Online
                        </div>
                    </div>

                    <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-2 flex-1 overflow-y-auto custom-scrollbar backdrop-blur-md">
                        <div className="space-y-1">
                            {GAME_MODES_CONFIG.map(mode => {
                                const ModeIcon = getIcon(mode.icon);
                                const isSelected = selectedMode === mode.id;
                                return (
                                    <button
                                        key={mode.id}
                                        onClick={() => handleModeSelect(mode.id as GameMode)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                                            ${isSelected 
                                                ? 'bg-gradient-to-r from-gray-800 to-gray-800/50 border border-white/10 shadow-lg translate-x-1' 
                                                : 'hover:bg-white/5 border border-transparent opacity-70 hover:opacity-100'
                                            }
                                        `}
                                    >
                                        <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-cyan-500 text-white shadow-[0_0_10px_cyan]' : 'bg-gray-800 text-gray-400 group-hover:text-white'}`}>
                                            <ModeIcon size={18} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className={`text-sm font-black uppercase tracking-wider ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                                {mode.label}
                                            </div>
                                        </div>
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Nav */}
                    <div className="grid grid-cols-4 gap-2 bg-black/20 p-2 rounded-xl border border-white/5 backdrop-blur-md">
                        {FOOTER_ACTIONS.map((action, i) => (
                            <Button key={i} variant="ghost" size="icon" onClick={action.onClick} icon={getIcon(action.icon)} className="w-full h-10 rounded-lg hover:bg-white/10" />
                        ))}
                    </div>
                </div>

                {/* --- Right Column: Active Content --- */}
                <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2 min-h-min">
                    
                    <div className="lg:hidden flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-4xl font-black italic tracking-tighter text-white">TETRIOS</h1>
                            <div className="text-[10px] font-bold text-cyan-400 tracking-[0.3em] uppercase">Mobile Protocol</div>
                        </div>
                        <div className="p-3 bg-gray-800 rounded-full border border-white/10">
                            <ActiveIcon size={24} className={activeModeConfig.color.replace('text-', 'text-')} />
                        </div>
                    </div>

                    <GlassPanel variant="darker" className="flex-1 p-6 md:p-10 flex flex-col justify-between relative overflow-hidden border-white/10 !bg-black/60">
                        <ActiveIcon className={`absolute -right-10 -bottom-10 opacity-5 text-white transform rotate-[-15deg] transition-all duration-500`} size={400} />
                        
                        <div className="relative z-10 space-y-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`px-3 py-1 rounded border ${activeModeConfig.color.replace('text-', 'border-').replace('400', '500/30')} bg-opacity-10 bg-black backdrop-blur-sm text-xs font-bold uppercase tracking-widest`}>
                                        Selected Protocol
                                    </div>
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight mb-4 drop-shadow-lg">
                                    {activeModeConfig.label}
                                </h2>
                                <p className="text-gray-300 text-sm md:text-lg max-w-2xl leading-relaxed font-medium">
                                    {activeModeConfig.description}
                                </p>
                            </div>

                            {savedGameExists && (
                                <div className="flex items-center gap-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl animate-in slide-in-from-left-4">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                        {React.createElement(getIcon('Save'), { size: 20 })}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-emerald-400 uppercase">Session Suspended</div>
                                        <div className="text-xs text-emerald-200/70">Continue where you left off?</div>
                                    </div>
                                    <Button onClick={() => { if(onContinue) onContinue(); }} variant="outline" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white">
                                        Resume
                                    </Button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                {selectedMode !== 'DAILY' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Difficulty Class</label>
                                        <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                                            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => handleDifficultySelect(d)}
                                                    className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all
                                                        ${selectedDifficulty === d 
                                                            ? `bg-white/10 text-white shadow-sm border border-white/10 ${DIFFICULTY_SETTINGS[d].color}` 
                                                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                        }
                                                    `}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedMode !== 'ADVENTURE' && selectedMode !== 'DAILY' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Entry Level</label>
                                        <div className="flex items-center gap-3 bg-black/40 p-1 rounded-lg border border-white/5 h-[42px]">
                                            <button onClick={() => handleLevelChange(-1)} className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded"><span className="text-xl font-bold">-</span></button>
                                            <div className="flex-1 text-center font-mono text-xl font-bold text-cyan-400">{startLevel}</div>
                                            <button onClick={() => handleLevelChange(1)} className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded"><span className="text-xl font-bold">+</span></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Personal Best</span>
                                <div className="text-3xl font-mono font-bold text-yellow-400 drop-shadow-md">
                                    {currentModeHighScore.toLocaleString()}
                                </div>
                            </div>

                            <Button 
                                onClick={handleStart} 
                                size="xl" 
                                className="w-full md:w-auto shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse hover:animate-none"
                                icon={getIcon('Play')}
                            >
                                Initialize System
                            </Button>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
});

export default MainMenu;
