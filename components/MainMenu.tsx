
import React, { useState, useRef } from 'react';
import { Play, Trophy, Zap, Skull, Map, HelpCircle, X, Sparkles, ChevronRight, ChevronLeft, Clock, BarChart2, Settings, User, Volume2, VolumeX, Gauge, Flame, RotateCw, Calendar } from 'lucide-react';
import { GameMode, Difficulty } from '../types';
import { audioManager } from '../utils/audioManager';
import { useProfileStore } from '../stores/profileStore';
import { useModalStore } from '../stores/modalStore';
import { useUiStore } from '../stores/uiStore';
import Button from './ui/Button';
import GlassPanel from './ui/GlassPanel';
import { DIFFICULTY_SETTINGS, GAME_MODES_CONFIG } from '../constants';

interface MainMenuProps {
    onStart: (startLevel: number, mode: GameMode, difficulty: Difficulty) => void;
}

const MainMenu = React.forwardRef<HTMLDivElement, MainMenuProps>(({ onStart }, ref) => {
    const [selectedMode, setSelectedMode] = useState<GameMode>('MARATHON');
    const [startLevel, setStartLevel] = useState(0);
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('MEDIUM');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const helpModalRef = useRef<HTMLDivElement>(null);
    
    const { stats: profileStats } = useProfileStore();
    const { openSettings, openProfile } = useModalStore();
    const { isMuted, toggleMute } = useUiStore();

    const openHelp = () => {
        audioManager.playUiSelect();
        setIsHelpOpen(true);
    };
    
    const closeHelp = () => {
        audioManager.playUiBack();
        setIsHelpOpen(false);
    };

    const handleStart = () => {
        audioManager.playUiSelect();
        onStart(startLevel, selectedMode, selectedDifficulty);
    };

    const handleModeSelect = (mode: GameMode) => {
        audioManager.playUiClick();
        setSelectedMode(mode);
    };

    const handleLevelChange = (delta: number) => {
        audioManager.playUiClick();
        setStartLevel(prev => Math.max(0, Math.min(29, prev + delta)));
    };

    const handleDifficultySelect = (diff: Difficulty) => {
        audioManager.playUiClick();
        setSelectedDifficulty(diff);
    };

    const handleToggleMute = () => {
        toggleMute();
        audioManager.toggleMute();
        audioManager.playUiClick();
    };

    const activeModeConfig = GAME_MODES_CONFIG.find(m => m.id === selectedMode) || GAME_MODES_CONFIG[0];
    const currentModeHighScore = profileStats.highScores?.[selectedMode] || 0;

    const IconMap: Record<string, React.ElementType> = {
        Trophy, Zap, Skull, Map, Clock, Flame, Calendar
    };

    const ActiveIcon = IconMap[activeModeConfig.icon] || Trophy;

    return (
        <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--menu-overlay-bg)] backdrop-blur-sm p-[var(--spacing-sm)] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Main Menu">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-[var(--spacing-lg)] h-full md:h-[85vh] content-start lg:content-stretch">
                
                {/* Right Column: Details (First on Mobile for visibility) */}
                <div className="order-1 lg:order-2 lg:col-span-8 h-auto lg:h-full min-h-[450px] lg:min-h-[500px]">
                    <GlassPanel variant="darker" className="h-full p-[var(--spacing-lg)] md:p-12 flex flex-col relative overflow-hidden border-[var(--menu-border-color)] shadow-2xl !bg-[var(--menu-bg-glass)]">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transform rotate-12 translate-x-20 -translate-y-10 transition-all duration-500">
                            <ActiveIcon size={500} />
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                            {/* Mobile Only Title Header */}
                            <div className="lg:hidden flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                <h1 className="text-6xl font-black text-[var(--menu-text-primary)] italic tracking-tighter leading-none drop-shadow-[var(--glow-title)]">TETRIOS</h1>
                                <div className="text-[10px] font-bold text-[var(--menu-text-accent)] uppercase tracking-[0.6em] mt-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[var(--status-success)] rounded-full animate-pulse shadow-[0_0_10px_var(--status-success)]"></div>
                                    System Ready
                                </div>
                            </div>

                            {/* Mobile Optimized Header & Action Area */}
                            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6">
                                <div className="flex items-center gap-[var(--spacing-sm)]">
                                    <div className={`p-3 rounded-xl bg-[var(--menu-bg-surface-dark)] border border-[var(--menu-border-color)] ${activeModeConfig.color}`}>
                                        <ActiveIcon size={32} />
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-black text-[var(--menu-text-primary)] uppercase tracking-tight drop-shadow-lg">
                                        {activeModeConfig.label}
                                    </h2>
                                </div>
                                
                                {/* Primary Action - Moved UP for Mobile */}
                                <div className="lg:hidden w-full mt-4 border-b border-[var(--menu-border-color)] pb-6">
                                     <Button 
                                        variant="primary" 
                                        size="lg" 
                                        onClick={handleStart} 
                                        className="w-full shadow-[var(--glow-button-primary)] text-lg py-4"
                                        icon={Play}
                                    >
                                        Initialize System
                                    </Button>
                                </div>
                            </div>

                            <div className="mb-[var(--spacing-lg)]">
                                <div className="hidden lg:block h-1 w-24 bg-[image:var(--gradient-separator)] mb-4 rounded-full shadow-[var(--glow-separator)]"></div>
                                <p className="text-lg md:text-xl text-[var(--menu-text-secondary)] max-w-xl leading-relaxed font-medium">
                                    {activeModeConfig.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-lg)] mb-auto">
                                {selectedMode !== 'DAILY' && (
                                    <div>
                                        <label className="text-xs text-[var(--menu-text-dim)] font-bold uppercase tracking-widest block mb-[var(--spacing-sm)] flex items-center gap-2">
                                            <Gauge size={14} /> Difficulty Protocol
                                        </label>
                                        <div className="flex gap-2 p-1 bg-[var(--menu-bg-surface-dark)] rounded-xl border border-[var(--menu-border-color)] backdrop-blur-md">
                                            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(diff => (
                                                <button
                                                    key={diff}
                                                    onClick={() => handleDifficultySelect(diff)}
                                                    onMouseEnter={() => audioManager.playUiHover()}
                                                    className={`flex-1 py-3 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all
                                                        ${selectedDifficulty === diff 
                                                            ? `bg-[var(--menu-bg-surface)] text-white shadow-md border border-[var(--menu-border-highlight)] ${DIFFICULTY_SETTINGS[diff].color}` 
                                                            : 'text-[var(--menu-text-dim)] hover:text-[var(--menu-text-secondary)] hover:bg-[var(--menu-bg-surface-hover)]'
                                                        }
                                                    `}
                                                >
                                                    {DIFFICULTY_SETTINGS[diff].label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedMode !== 'ADVENTURE' && selectedMode !== 'DAILY' && (
                                    <div>
                                        <label className="text-xs text-[var(--menu-text-dim)] font-bold uppercase tracking-widest block mb-[var(--spacing-sm)]">Starting Level</label>
                                        <div className="flex items-center gap-4 p-2 bg-[var(--menu-bg-surface-dark)] rounded-2xl border border-[var(--menu-border-color)] w-max backdrop-blur-md shadow-inner">
                                            <button onClick={() => handleLevelChange(-1)} disabled={startLevel <= 0} className="w-10 h-10 rounded-xl bg-[var(--menu-bg-surface)] hover:bg-[var(--menu-bg-surface-hover)] disabled:opacity-30 flex items-center justify-center border border-[var(--menu-border-color)] group">
                                                <ChevronLeft size={20} className="text-[var(--menu-text-muted)] group-hover:text-white" />
                                            </button>
                                            <div className="text-center min-w-[80px]">
                                                <div className="text-4xl font-mono font-bold text-white tabular-nums drop-shadow-md">{startLevel}</div>
                                                <div className="text-[9px] text-[var(--menu-text-accent)] font-bold uppercase tracking-wider">Level</div>
                                            </div>
                                            <button onClick={() => handleLevelChange(1)} disabled={startLevel >= 29} className="w-10 h-10 rounded-xl bg-[var(--menu-bg-surface)] hover:bg-[var(--menu-bg-surface-hover)] disabled:opacity-30 flex items-center justify-center border border-[var(--menu-border-color)] group">
                                                <ChevronRight size={20} className="text-[var(--menu-text-muted)] group-hover:text-white" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Action Area (Hidden on Mobile to avoid double button) */}
                            <div className="hidden lg:flex mt-8 flex-col xl:flex-row gap-[var(--spacing-lg)] items-start border-t border-[var(--menu-border-color)] pt-8">
                                <Button 
                                    variant="primary" 
                                    size="xl" 
                                    onClick={handleStart} 
                                    className="w-full md:w-auto min-w-[300px] shadow-[var(--glow-button-primary)] text-lg md:text-xl py-5 order-2 xl:order-1"
                                    icon={Play}
                                >
                                    Initialize System
                                </Button>

                                <div className="flex gap-10 w-full justify-start order-1 xl:order-2 mb-4 xl:mb-0">
                                    <div className="flex flex-col items-start">
                                        <div className="text-[10px] text-[var(--menu-text-dim)] uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
                                            <Trophy size={14} className="text-yellow-500" /> Best
                                        </div>
                                        <div className="text-2xl md:text-3xl font-mono font-bold text-yellow-400 drop-shadow-sm">
                                            {currentModeHighScore.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                </div>

                {/* Left Column: Navigation (Second on Mobile) */}
                <div className="order-2 lg:order-1 lg:col-span-4 flex flex-col h-auto lg:h-full min-h-[400px]">
                    {/* Desktop Title (Hidden on Mobile to avoid bottom placement) */}
                    <div className="hidden lg:block pl-2 mb-[var(--spacing-md)] md:mb-[var(--spacing-lg)]">
                        <h1 className="text-5xl md:text-7xl font-black text-[var(--menu-text-primary)] italic tracking-tighter leading-none drop-shadow-[var(--glow-title)]">TETRIOS</h1>
                        <div className="text-[10px] md:text-xs font-bold text-[var(--menu-text-accent)] uppercase tracking-[0.6em] mt-2 pl-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-[var(--status-success)] rounded-full animate-pulse shadow-[0_0_10px_var(--status-success)]"></div>
                            System Online v1.4
                        </div>
                    </div>

                    <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2 max-h-[400px] lg:max-h-none" role="tablist" aria-label="Game Modes">
                        {GAME_MODES_CONFIG.map(mode => {
                            const ModeIcon = IconMap[mode.icon] || Trophy;
                            return (
                                <button
                                    key={mode.id}
                                    role="tab"
                                    aria-selected={selectedMode === mode.id}
                                    onClick={() => handleModeSelect(mode.id)}
                                    onMouseEnter={() => audioManager.playUiHover()}
                                    className={`w-full text-left p-[var(--spacing-sm)] rounded-xl border transition-all duration-200 flex items-center gap-[var(--spacing-sm)] group relative overflow-hidden
                                        ${selectedMode === mode.id 
                                            ? 'bg-[var(--menu-bg-active)] border-[var(--menu-border-active)] shadow-[0_0_25px_rgba(0,0,0,0.6)] translate-x-2 z-10 ring-1 ring-white/10' 
                                            : 'bg-[var(--menu-bg-secondary)] border-transparent hover:bg-[var(--menu-bg-hover)] hover:border-[var(--menu-border-color)] hover:translate-x-1'
                                        }
                                    `}
                                >
                                    <div className={`p-2.5 rounded-lg transition-colors ${selectedMode === mode.id ? 'bg-[var(--menu-bg-surface-dark)] shadow-inner' : 'bg-[var(--menu-bg-surface)] group-hover:bg-[var(--menu-bg-surface-hover)]'}`}>
                                        <ModeIcon size={22} className={mode.color} />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-black uppercase tracking-wider ${selectedMode === mode.id ? 'text-[var(--menu-text-primary)]' : 'text-[var(--menu-text-secondary)] group-hover:text-[var(--menu-text-primary)]'}`}>{mode.label}</div>
                                    </div>
                                    {selectedMode === mode.id && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[pulse_3s_infinite]"></div>}
                                </button>
                            );
                        })}
                    </nav>
                    
                    <div className="pt-[var(--spacing-md)] mt-[var(--spacing-sm)] border-t border-[var(--menu-border-color)] grid grid-cols-2 gap-3">
                        <Button variant="glass" onClick={openSettings} icon={Settings} className="justify-start pl-4 text-[10px] md:text-xs">Settings</Button>
                        <Button variant="glass" onClick={openProfile} icon={User} className="justify-start pl-4 text-[10px] md:text-xs">Profile</Button>
                        <Button variant="glass" onClick={openHelp} icon={HelpCircle} className="justify-start pl-4 text-[10px] md:text-xs">Manual</Button>
                        <Button variant="glass" onClick={handleToggleMute} icon={isMuted ? VolumeX : Volume2} className="justify-start pl-4 text-left text-[10px] md:text-xs">
                            {isMuted ? 'Unmute' : 'Mute'}
                        </Button>
                    </div>
                </div>
            </div>
            {/* Help Modal omitted for brevity */}
        </div>
    );
});

export default MainMenu;
