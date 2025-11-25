
import React, { useState, useEffect, useRef } from 'react';
import { X, Gamepad2, Eye, Keyboard, RefreshCcw, Monitor, Volume2, Music, Settings as SettingsIcon, User, Palette, Layers } from 'lucide-react';
import { KeyMap, KeyAction, GhostStyle, ColorblindMode, BlockSkin } from '../types';
import { audioManager } from '../utils/audioManager';
import { useUiStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { useGameSettingsStore } from '../stores/gameSettingsStore'; 
import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_GAMESPEED } from '../constants';
import Slider from './ui/Slider';
import GhostPreview from './ui/GhostPreview';
import Button from './ui/Button';
import GlassPanel from './ui/GlassPanel';

type Tab = 'GAMEPLAY' | 'CONTROLS' | 'VISUALS' | 'AUDIO';

interface SettingsProps {
  controls: KeyMap; 
  setKeyBinding: (action: KeyAction, key: string, slot: number) => void;
  resetControls: () => void;
  activeTab?: Tab;
}

const GameplayPanel: React.FC = () => {
    const { das, setDas, arr, setArr, gameSpeed, setGameSpeed } = useGameSettingsStore();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in">
            <div className="space-y-8">
                <GlassPanel variant="dark" className="p-6 md:p-8 relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none" aria-hidden="true"><Monitor size={80} /></div>
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}>
                        <span className="w-2 h-2 bg-cyan-500 rounded-full" aria-hidden="true"></span> Handling Tuning
                    </h3>
                    <div className="space-y-10">
                        <div>
                            <Slider label="DAS (Delayed Auto Shift)" value={das} min={50} max={300} step={1} onChange={setDas} unit="ms" />
                            <p className="text-[10px] text-gray-500 mt-2 font-medium tracking-wide leading-relaxed">
                                Delay before auto-movement starts when holding a key. <br/>
                                <span className="text-cyan-700">Lower = Snappier response.</span>
                            </p>
                        </div>
                        <div>
                            <Slider label="ARR (Auto Repeat Rate)" value={arr} min={0} max={50} step={1} onChange={setArr} unit="ms" />
                            <p className="text-[10px] text-gray-500 mt-2 font-medium tracking-wide leading-relaxed">
                                Interval between movement repeats. <br/>
                                <span className="text-cyan-700">0ms = Hyper speed (1 cell/frame).</span>
                            </p>
                        </div>
                    </div>
                </GlassPanel>
            </div>
            <div className="space-y-8">
                <GlassPanel variant="dark" className="p-6 md:p-8">
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4" role="heading" aria-level={3}>Engine Rate</h3>
                    <div className="space-y-10">
                        <div>
                            <Slider label="Game Speed Multiplier" value={gameSpeed} min={0.5} max={3.0} step={0.1} onChange={setGameSpeed} unit="x" />
                            <p className="text-[10px] text-gray-500 mt-2 font-medium tracking-wide">
                                Global speed modifier. Independent of Difficulty. <br/>
                                <span className="text-cyan-700">Higher = Faster falling pieces.</span>
                            </p>
                        </div>
                    </div>
                </GlassPanel>
            </div>
        </div>
    );
};

interface ControlsPanelProps {
  controls: KeyMap;
  setKeyBinding: (action: KeyAction, key: string, slot: number) => void;
  resetControls: () => void;
}

// ... formatKey and ControlsPanel logic mostly unchanged ...
const formatKey = (key: string): string => {
    if (!key) return '---';
    if (key === ' ') return 'Space';
    if (key === 'ArrowUp') return 'Up';
    if (key === 'ArrowDown') return 'Down';
    if (key === 'ArrowLeft') return 'Left';
    if (key === 'ArrowRight') return 'Right';
    
    if (key.startsWith('GP_')) {
        if (key.startsWith('GP_BTN_')) {
            const idx = key.split('_')[2];
            const labels: Record<string, string> = {
                '0': 'A / ✖', '1': 'B / ◯', '2': 'X / ▢', '3': 'Y / △',
                '4': 'LB / L1', '5': 'RB / R1', '6': 'LT / L2', '7': 'RT / R2',
                '8': 'Select', '9': 'Start', '12': 'D-Up', '13': 'D-Down', '14': 'D-Left', '15': 'D-Right'
            };
            return labels[idx] || `BTN ${idx}`;
        }
        if (key.startsWith('GP_AXIS_')) {
            const parts = key.split('_')[2];
            const axis = parts[0];
            const dir = parts[1] === '-' ? 'Left/Up' : 'Right/Down';
            return `Axis ${axis} ${dir}`;
        }
    }
    if (key.length === 1) return key.toUpperCase();
    return key;
};

const ControlsPanel: React.FC<ControlsPanelProps> = ({ controls, setKeyBinding, resetControls }) => {
    const [listening, setListening] = useState<{ action: KeyAction, slot: number } | null>(null);
    const { enableTouchControls, setEnableTouchControls } = useGameSettingsStore();
    const lastGamepadState = useRef<Set<string>>(new Set());

    const handleBind = (action: KeyAction, slot: number) => {
        audioManager.playUiClick();
        setListening({ action, slot });
    };

    useEffect(() => {
        if (!listening) return;
        const listener = (e: KeyboardEvent) => {
            e.preventDefault();
            if (e.key === 'Escape') {
                setListening(null);
                return;
            }
            audioManager.playUiSelect();
            setKeyBinding(listening.action, e.key, listening.slot);
            setListening(null);
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, [listening, setKeyBinding]);

    useEffect(() => {
        if (!listening) return;
        let rafId: number;
        const poll = () => {
            const gamepads = navigator.getGamepads();
            let activeGamepad = null;
            for(let i=0; i<gamepads.length; i++) if (gamepads[i]) { activeGamepad = gamepads[i]; break; }

            if (activeGamepad) {
                const currentKeys = new Set<string>();
                activeGamepad.buttons.forEach((btn, i) => { if (btn.pressed) currentKeys.add(`GP_BTN_${i}`); });
                activeGamepad.axes.forEach((val, i) => {
                    if (val < -0.5) currentKeys.add(`GP_AXIS_${i}-`);
                    if (val > 0.5) currentKeys.add(`GP_AXIS_${i}+`);
                });
                for (const key of currentKeys) {
                    if (!lastGamepadState.current.has(key)) {
                        audioManager.playUiSelect();
                        setKeyBinding(listening.action, key, listening.slot);
                        setListening(null);
                        return; 
                    }
                }
                lastGamepadState.current = currentKeys;
            }
            rafId = requestAnimationFrame(poll);
        };
        poll();
        return () => cancelAnimationFrame(rafId);
    }, [listening, setKeyBinding]);

    return (
        <GlassPanel variant="dark" className="p-6 md:p-8 animate-slide-in space-y-8">
            <div>
                <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}>
                    <Gamepad2 size={16} className="text-cyan-500" aria-hidden="true"/> Touch Input
                </h3>
                <button className="w-full flex items-center justify-between p-6 bg-gray-900/50 border border-gray-800 rounded hover:border-gray-700 transition-colors group" onClick={() => setEnableTouchControls(!enableTouchControls)} aria-pressed={enableTouchControls}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${enableTouchControls ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}><Gamepad2 size={20} aria-hidden="true" /></div>
                        <div className="text-left"><h4 className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wide transition-colors">On-Screen Controls</h4><p className="text-[10px] text-gray-500 mt-1">Show D-Pad and buttons overlay</p></div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${enableTouchControls ? 'bg-cyan-600' : 'bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${enableTouchControls ? 'translate-x-6' : 'translate-x-0'}`} /></div>
                </button>
            </div>

            <div>
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2" role="heading" aria-level={3}>
                        <Keyboard size={16} className="text-cyan-500" aria-hidden="true"/> Key Mapping
                    </h3>
                    <Button variant="ghost" onClick={() => { resetControls(); audioManager.playUiClick(); }} className="text-[10px] py-1 h-auto text-red-400 hover:text-red-300" icon={RefreshCcw}>
                        Default Controls
                    </Button>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar pb-4">
                    <div className="min-w-[600px] space-y-2" role="grid" aria-label="Key Bindings">
                        <div className="grid grid-cols-6 gap-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 px-2">
                            <div className="col-span-2">Action</div>
                            <div className="text-center">Key 1</div>
                            <div className="text-center">Key 2</div>
                            <div className="text-center">Pad 1</div>
                            <div className="text-center">Pad 2</div>
                        </div>
                        {(Object.entries(controls || {}) as [KeyAction, string[]][]).map(([action, keys]) => {
                            const displayAction = action.replace(/([A-Z])/g, ' $1').trim();
                            return (
                                <div key={action} className="grid grid-cols-6 gap-2 items-center p-3 bg-gray-900/50 rounded border border-gray-800 hover:border-gray-700 transition-colors">
                                    <span className="col-span-2 text-xs font-bold text-gray-300 uppercase tracking-wide truncate" title={displayAction}>{displayAction}</span>
                                    {[0, 1, 2, 3].map(slot => {
                                        const isListening = listening?.action === action && listening?.slot === slot;
                                        const keyName = keys[slot];
                                        return (
                                            <button 
                                                key={slot} 
                                                onClick={() => handleBind(action, slot)}
                                                onMouseEnter={() => audioManager.playUiHover()}
                                                className={`
                                                    relative h-10 px-2 flex items-center justify-center 
                                                    bg-[#1a1f2e] border-b-2 rounded text-[10px] md:text-xs font-mono font-bold shadow-sm transition-all duration-150 truncate
                                                    ${isListening ? 'bg-cyan-900 border-cyan-500 text-white ring-1 ring-cyan-500/50 scale-105 z-10' : 'border-black text-gray-400 hover:text-white hover:bg-gray-800 hover:border-gray-600'}
                                                `}
                                                aria-label={`Bind slot ${slot + 1} for ${displayAction}`}
                                                title={formatKey(keyName)}
                                            >
                                                {isListening ? <span className="animate-pulse text-cyan-400">...</span> : formatKey(keyName)}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-gray-500 italic text-center">
                    Press <span className="text-gray-300 font-bold">Backspace</span> to clear a binding. <span className="text-gray-300 font-bold">Escape</span> to cancel.
                </div>
            </div>
        </GlassPanel>
    );
};

const VisualsPanel: React.FC = () => {
    const { ghostStyle, setGhostStyle, ghostOpacity, setGhostOpacity, ghostOutlineThickness, setGhostOutlineThickness, ghostGlowIntensity, setGhostGlowIntensity, lockWarning, setLockWarning, cameraShake, setCameraShake, colorblindMode, setColorblindMode, blockSkin, setBlockSkin } = useGameSettingsStore();
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-in">
            <div className="lg:col-span-4 order-first lg:order-last">
                <div className="lg:sticky lg:top-0 space-y-4">
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2" role="heading" aria-level={3}>Real-time Render</h3>
                    <GhostPreview style={ghostStyle} opacity={ghostOpacity} thickness={ghostOutlineThickness} glow={ghostGlowIntensity} />
                </div>
            </div>
            <div className="lg:col-span-8 space-y-6">
                <GlassPanel variant="dark" className="p-6 md:p-8">
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}><Layers size={16} className="text-cyan-500"/> Block Appearance</h3>
                    
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-8">
                        {(['NEON', 'RETRO', 'GELATIN', 'MINIMAL', 'CYBER'] as BlockSkin[]).map(skin => (
                            <button
                                key={skin}
                                onClick={() => { setBlockSkin(skin); audioManager.playUiClick(); }}
                                className={`p-2 text-[10px] font-bold uppercase tracking-wide rounded border transition-all ${blockSkin === skin ? 'bg-cyan-900/50 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                            >
                                {skin}
                            </button>
                        ))}
                    </div>

                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}><Palette size={16} className="text-cyan-500"/> Accessibility</h3>
                    <div className="mb-8">
                        <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-3">Colorblind Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['NORMAL', 'PROTANOPIA', 'DEUTERANOPIA', 'TRITANOPIA'] as ColorblindMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => { setColorblindMode(mode); audioManager.playUiClick(); }}
                                    className={`p-3 text-xs font-bold rounded border transition-all ${colorblindMode === mode ? 'bg-cyan-900/50 border-cyan-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-800 pb-4 pt-4" role="heading" aria-level={3}>Ghost Aesthetics</h3>
                    <div className="grid grid-cols-3 gap-4 mb-10" role="radiogroup" aria-label="Ghost Piece Style">
                            {['neon', 'dashed', 'solid'].map((style) => (
                                <button key={style} role="radio" aria-checked={ghostStyle === style} onClick={() => { setGhostStyle(style as GhostStyle); audioManager.playUiClick(); }} className={`py-4 text-[10px] font-bold uppercase tracking-widest transition-all border rounded relative overflow-hidden group ${ghostStyle === style ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`} aria-label={`${style} ghost style`}>
                                    {style}
                                    {ghostStyle === style && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400" aria-hidden="true"></div>}
                                </button>
                            ))}
                    </div>
                    <div className="space-y-8">
                        <Slider label="Opacity" value={ghostOpacity} min={0.1} max={1} step={0.05} onChange={setGhostOpacity} />
                        <Slider label="Glow Intensity" value={ghostGlowIntensity} min={0} max={3} step={0.1} onChange={setGhostGlowIntensity} />
                        <Slider label="Outline Thickness" value={ghostOutlineThickness} min={0} max={5} step={1} onChange={setGhostOutlineThickness} unit="px" />
                    </div>
                </GlassPanel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="w-full flex items-center justify-between p-6 bg-gray-900/30 border border-gray-800 rounded hover:border-gray-700 transition-colors group" onClick={() => setLockWarning(!lockWarning)} aria-pressed={lockWarning} aria-label="Toggle Lock Warning Flash">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${lockWarning ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}><Eye size={20} aria-hidden="true" /></div>
                                <div className="text-left"><h4 className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wide transition-colors">Lock Warning</h4><p className="text-[10px] text-gray-500 mt-1">Visual indicator before piece hard locks</p></div>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${lockWarning ? 'bg-cyan-600' : 'bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${lockWarning ? 'translate-x-6' : 'translate-x-0'}`} /></div>
                    </button>
                    <button className="w-full flex items-center justify-between p-6 bg-gray-900/30 border border-gray-800 rounded hover:border-gray-700 transition-colors group" onClick={() => setCameraShake(!cameraShake)} aria-pressed={cameraShake} aria-label="Toggle Camera Shake">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${cameraShake ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}><Monitor size={20} aria-hidden="true" /></div>
                                <div className="text-left"><h4 className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wide transition-colors">Camera Shake</h4><p className="text-[10px] text-gray-500 mt-1">Dynamic impact effects</p></div>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${cameraShake ? 'bg-cyan-600' : 'bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${cameraShake ? 'translate-x-6' : 'translate-x-0'}`} /></div>
                    </button>
                </div>
            </div>
        </div>
    );
};

const AudioPanel: React.FC = () => {
    const { musicEnabled, setMusicEnabled } = useUiStore();
    const { masterVolume, setMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume, uiVolume, setUiVolume } = useGameSettingsStore();

    return (
        <GlassPanel variant="dark" className="p-6 md:p-8 max-w-2xl mx-auto animate-slide-in">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}><Volume2 size={16} className="text-cyan-500" aria-hidden="true"/> Audio Configuration</h3>
            <div className="space-y-10">
                <div><Slider label="Master Volume" value={masterVolume} min={0} max={1} step={0.01} onChange={setMasterVolume} /></div>
                <div><Slider label="Music Volume" value={musicVolume} min={0} max={1} step={0.01} onChange={setMusicVolume} /></div>
                <div><Slider label="SFX Volume" value={sfxVolume} min={0} max={1} step={0.01} onChange={setSfxVolume} /></div>
                <div><Slider label="UI Volume" value={uiVolume} min={0} max={1} step={0.01} onChange={setUiVolume} /></div>
                <button className="w-full flex items-center justify-between p-6 bg-black/20 border border-gray-800 rounded hover:border-gray-600 transition-colors group" onClick={() => setMusicEnabled(!musicEnabled)} aria-pressed={musicEnabled} aria-label="Toggle Background Music">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded flex items-center justify-center transition-colors ${musicEnabled ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-600'}`}><Music size={24} aria-hidden="true" /></div>
                            <div className="text-left"><h4 className="text-sm font-bold text-white group-hover:text-cyan-100 uppercase tracking-wide transition-colors">Background Music</h4><p className="text-[11px] text-gray-500 mt-1">Enable/Disable procedural music generation</p></div>
                        </div>
                        <div className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${musicEnabled ? 'bg-cyan-600' : 'bg-gray-700'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${musicEnabled ? 'translate-x-7' : 'translate-x-0'}`} /></div>
                </button>
            </div>
        </GlassPanel>
    );
};

const Settings: React.FC<SettingsProps> = ({ controls, setKeyBinding, resetControls, activeTab: initialTab = 'GAMEPLAY' }) => {
  const { isSettingsOpen: isOpen, closeSettings, openProfile } = useModalStore(); 
  const { setMusicEnabled } = useUiStore();
  const { 
      setGhostStyle, setDas, setArr, setGameSpeed,
      setMasterVolume, setMusicVolume, setSfxVolume, setUiVolume,
      setColorblindMode, setBlockSkin
  } = useGameSettingsStore();
  
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
      if (isOpen) {
          setActiveTab(initialTab);
          audioManager.playUiSelect(); 
          dialogRef.current?.focus(); 
      }
  }, [isOpen, initialTab]);

  useEffect(() => { if(contentRef.current) contentRef.current.scrollTop = 0; }, [activeTab]);
  if (!isOpen) return null;
  const handleTabChange = (tab: Tab) => { audioManager.playUiClick(); setActiveTab(tab); };
  const handleCloseSettings = () => { audioManager.playUiBack(); closeSettings(); };
  const handleOpenProfile = () => { closeSettings(); openProfile(); };
  const handleResetSettings = () => { 
    setGhostStyle('neon'); 
    setDas(DEFAULT_DAS); 
    setArr(DEFAULT_ARR); 
    setGameSpeed(DEFAULT_GAMESPEED); 
    setMasterVolume(0.6);
    setMusicVolume(0.5);
    setSfxVolume(0.7);
    setUiVolume(0.6);
    setMusicEnabled(true); 
    setColorblindMode('NORMAL');
    setBlockSkin('NEON');
    resetControls(); 
    audioManager.playUiClick(); 
  };

  const TabButton = ({ id, icon: Icon, label }: { id: Tab, icon: React.ElementType, label: string }) => {
      const isActive = activeTab === id;
      return (
        <button onClick={() => handleTabChange(id)} onMouseEnter={() => audioManager.playUiHover()} aria-selected={isActive} role="tab" tabIndex={isActive ? 0 : -1} className={`flex-shrink-0 md:w-full text-left py-3 px-4 md:py-4 md:px-6 flex items-center gap-3 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase transition-all duration-200 rounded-full md:rounded-none md:border-l-4 border-transparent ${isActive ? 'bg-cyan-950 text-cyan-400 md:bg-cyan-950/30 md:border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)] md:shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]' : 'bg-gray-800/50 text-gray-500 hover:text-white hover:bg-gray-800 md:bg-transparent md:hover:bg-gray-800/30'}`} aria-label={`Open ${label} settings`}>
            <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-gray-600'} aria-hidden="true" /> <span>{label}</span>
        </button>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Settings Menu" ref={dialogRef} tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) dialogRef.current?.focus(); }}>
      <div className="bg-[#050810] border border-gray-800 w-full max-w-5xl shadow-[0_0_100px_rgba(6,182,212,0.15)] flex flex-col md:flex-row h-[90vh] md:h-[80vh] rounded-lg overflow-hidden relative">
        <nav className="w-full md:w-64 bg-[#080c1a] border-b md:border-b-0 md:border-r border-gray-800 flex flex-col flex-shrink-0 z-10">
            <div className="p-4 md:p-8 border-b border-gray-800 flex items-center justify-between md:justify-start gap-3"><SettingsIcon className="text-cyan-500 animate-spin-slow" size={24} aria-hidden="true" /><div><h2 className="text-lg md:text-xl font-black text-white tracking-[0.1em] uppercase font-mono italic" role="heading" aria-level={2}>Config</h2><div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold hidden md:block">System Parameters</div></div><Button variant="icon" onClick={handleCloseSettings} className="md:hidden"><X size={18}/></Button></div>
            <div className="flex md:flex-col gap-2 p-3 md:p-0 overflow-x-auto md:overflow-visible scrollbar-hide" role="tablist" aria-orientation="vertical">
                <TabButton id="GAMEPLAY" icon={Gamepad2} label="Gameplay" />
                <TabButton id="CONTROLS" icon={Keyboard} label="Controls" />
                <TabButton id="VISUALS" icon={Eye} label="Visuals" />
                <TabButton id="AUDIO" icon={Volume2} label="Audio" />
            </div>
            <div className="mt-auto p-4 border-t border-gray-800"><Button variant="secondary" onClick={handleOpenProfile} className="w-full" icon={User}>Profile</Button></div>
            <div className="hidden md:block p-6 pt-2"><div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> SYSTEM ONLINE</div></div>
        </nav>
        <div className="flex-1 bg-[#050810] relative flex flex-col overflow-hidden">
            <div className="hidden md:flex justify-end p-4 absolute top-0 right-0 z-20"><Button variant="icon" onClick={handleCloseSettings} className="rounded-full bg-gray-900/80 border-gray-700 hover:border-red-500 hover:text-red-500 backdrop-blur-sm"><X size={18} /></Button></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-24" ref={contentRef}>
              {activeTab === 'GAMEPLAY' && <GameplayPanel />}
              {activeTab === 'CONTROLS' && <ControlsPanel controls={controls} setKeyBinding={setKeyBinding} resetControls={resetControls} />}
              {activeTab === 'VISUALS' && <VisualsPanel />}
              {activeTab === 'AUDIO' && <AudioPanel />}
            </div>
            <div className="p-6 border-t border-gray-800 bg-[#080c1a] flex justify-between items-center sticky bottom-0 z-30 backdrop-blur-md">
                <Button variant="ghost" onClick={handleResetSettings} icon={RefreshCcw} className="text-gray-500 hover:text-white">Reset All</Button>
                <Button variant="primary" onClick={handleCloseSettings} className="px-8">Confirm</Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
