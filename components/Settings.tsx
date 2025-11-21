
import React, { useState, useEffect, useRef } from 'react';
import { X, Gamepad2, Eye, Keyboard, RefreshCcw, Monitor, Volume2, Music, Settings as SettingsIcon } from 'lucide-react';
import { KeyMap, KeyAction, GhostStyle } from '../types';
import { audioManager } from '../utils/audioManager';
import { useUiStore } from '../stores/uiStore'; 
import { useGameSettingsStore } from '../stores/gameSettingsStore'; 
import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_GAMESPEED } from '../constants';

type Tab = 'GAMEPLAY' | 'CONTROLS' | 'VISUALS' | 'AUDIO';

interface SettingsProps {
  controls: KeyMap; 
  setKeyBinding: (action: KeyAction, key: string, slot: number) => void;
  activeTab?: Tab;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  ariaLabel?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit = '', ariaLabel }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="group">
        <label className="flex justify-between text-[10px] text-gray-400 mb-3 font-bold tracking-widest uppercase group-hover:text-cyan-400 transition-colors" htmlFor={`slider-${label.replace(/\s/g, '')}`}>
            <span>{label}</span>
            <span className="font-mono text-white">{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}</span>
        </label>
        <div className="relative flex items-center h-6">
            {/* Native Range Input Styled Directly */}
            <input 
                id={`slider-${label.replace(/\s/g, '')}`}
                type="range" min={min} max={max} step={step} 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onInput={() => audioManager.playUiHover()} 
                className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label={ariaLabel || label}
                style={{
                    backgroundImage: `linear-gradient(to right, #06b6d4 ${percentage}%, #1f2937 ${percentage}%)`
                }}
            />
            {/* Thumb Style Injection for Webkit/Moz */}
            <style dangerouslySetInnerHTML={{__html: `
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #ffffff;
                    box-shadow: 0 0 10px rgba(255,255,255,0.8);
                    cursor: pointer;
                    margin-top: 0px; /* You need to specify a margin in Chrome, but in this layout it auto-centers usually */
                    transition: transform 0.1s;
                }
                input[type=range]::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                input[type=range]::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border: none;
                    border-radius: 50%;
                    background: #ffffff;
                    box-shadow: 0 0 10px rgba(255,255,255,0.8);
                    cursor: pointer;
                    transition: transform 0.1s;
                }
                input[type=range]::-moz-range-thumb:hover {
                    transform: scale(1.2);
                }
            `}} />
        </div>
    </div>
  );
};

interface GhostPreviewProps { 
  style: GhostStyle; 
  opacity: number; 
  thickness: number; 
  glow: number;
}
const GhostPreview: React.FC<GhostPreviewProps> = ({ style, opacity, thickness, glow }) => (
    <div className="w-full h-32 bg-black/40 border border-gray-800 rounded flex items-center justify-center relative overflow-hidden select-none" aria-hidden="true">
         <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
         <div className="relative grid grid-cols-3 gap-0.5 p-4">
              <div className="w-6 h-6"></div>
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="w-6 h-6 rounded-[1px]"
                  style={{
                      background: style === 'neon' || style === 'dashed' ? `rgba(168, 85, 247, 0.1)` : `rgba(168, 85, 247, 0.3)`,
                      border: style === 'solid' ? 'none' : `${thickness}px ${style === 'dashed' ? 'dashed' : 'solid'} rgba(168, 85, 247, 0.8)`,
                      boxShadow: style === 'neon' ? `0 0 ${8 * glow}px rgba(168, 85, 247, 0.6), inset 0 0 ${4 * glow}px rgba(168, 85, 247, 0.4)` : 'none',
                      opacity: opacity
                  }}
                ></div>
              ))}
         </div>
         <div className="absolute bottom-2 right-2 text-[9px] text-gray-500 uppercase tracking-widest font-mono">Live Preview</div>
    </div>
);

const GameplayPanel: React.FC = () => {
    const { das, setDas, arr, setArr, gameSpeed, setGameSpeed } = useGameSettingsStore();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in">
            <div className="space-y-8">
                <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none" aria-hidden="true"><Monitor size={80} /></div>
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}>
                        <span className="w-2 h-2 bg-cyan-500 rounded-full" aria-hidden="true"></span> Handling Tuning
                    </h3>
                    <div className="space-y-10">
                        <Slider label="DAS (Delayed Auto Shift)" value={das} min={50} max={300} step={1} onChange={setDas} unit="ms" />
                        <Slider label="ARR (Auto Repeat Rate)" value={arr} min={0} max={50} step={1} onChange={setArr} unit="ms" />
                    </div>
                </div>
            </div>
            <div className="space-y-8">
                <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50">
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4" role="heading" aria-level={3}>Engine Rate</h3>
                    <div className="space-y-10">
                        <Slider label="Gravity Multiplier" value={gameSpeed} min={0.5} max={3.0} step={0.1} onChange={setGameSpeed} unit="x" />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ControlsPanelProps {
  controls: KeyMap;
  setKeyBinding: (action: KeyAction, key: string, slot: number) => void;
}

const formatKey = (key: string): string => {
    if (!key) return '---';
    if (key === ' ') return 'Space';
    if (key === 'ArrowUp') return 'Up';
    if (key === 'ArrowDown') return 'Down';
    if (key === 'ArrowLeft') return 'Left';
    if (key === 'ArrowRight') return 'Right';
    if (key.length === 1) return key.toUpperCase();
    return key;
};

const ControlsPanel: React.FC<ControlsPanelProps> = ({ controls, setKeyBinding }) => {
    const [listening, setListening] = useState<{ action: KeyAction, slot: number } | null>(null);

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

    return (
        <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50 animate-slide-in">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}>
                <Keyboard size={16} className="text-cyan-500" aria-hidden="true"/> Key Mapping
            </h3>
            <div className="space-y-2" role="grid" aria-label="Key Bindings">
                <div className="grid grid-cols-3 gap-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 px-2">
                    <div>Action</div>
                    <div>Primary</div>
                    <div>Secondary</div>
                </div>
                {(Object.entries(controls || {}) as [KeyAction, string[]][]).map(([action, keys]) => {
                    const displayAction = action.replace(/([A-Z])/g, ' $1').trim();
                    return (
                        <div key={action} className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-900/50 rounded border border-gray-800 hover:border-gray-700 transition-colors">
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">{displayAction}</span>
                            
                            {[0, 1].map(slot => {
                                const isListening = listening?.action === action && listening?.slot === slot;
                                const keyName = keys[slot];
                                return (
                                    <button 
                                        key={slot} 
                                        onClick={() => handleBind(action, slot)}
                                        onMouseEnter={() => audioManager.playUiHover()}
                                        className={`
                                            relative h-10 px-4 flex items-center justify-center 
                                            bg-[#1a1f2e] border-b-2 rounded text-sm font-mono font-bold shadow-sm transition-all duration-150
                                            ${isListening 
                                                ? 'bg-cyan-900 border-cyan-500 text-white ring-1 ring-cyan-500/50 scale-105 z-10' 
                                                : 'border-black text-gray-400 hover:text-white hover:bg-gray-800 hover:border-gray-600'
                                            }
                                        `}
                                        aria-label={`Bind ${slot === 0 ? 'primary' : 'secondary'} key for ${displayAction}`}
                                    >
                                        {isListening ? (
                                            <span className="animate-pulse text-cyan-400">Press Key...</span>
                                        ) : (
                                            formatKey(keyName)
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 text-[10px] text-gray-500 italic text-center">
                Press <span className="text-gray-300 font-bold">Backspace</span> or <span className="text-gray-300 font-bold">Delete</span> to clear a binding. <span className="text-gray-300 font-bold">Escape</span> to cancel.
            </div>
        </div>
    );
};

const VisualsPanel: React.FC = () => {
    const { ghostStyle, setGhostStyle, ghostOpacity, setGhostOpacity, ghostOutlineThickness, setGhostOutlineThickness, ghostGlowIntensity, setGhostGlowIntensity, lockWarning, setLockWarning } = useGameSettingsStore();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-in">
            <div className="lg:col-span-4 order-first lg:order-last">
                <div className="lg:sticky lg:top-0 space-y-4">
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2" role="heading" aria-level={3}>Real-time Render</h3>
                    <GhostPreview style={ghostStyle} opacity={ghostOpacity} thickness={ghostOutlineThickness} glow={ghostGlowIntensity} />
                </div>
            </div>
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50">
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-800 pb-4" role="heading" aria-level={3}>Ghost Aesthetics</h3>
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
                        <Slider label="Border Thickness" value={ghostOutlineThickness} min={0} max={5} step={1} onChange={setGhostOutlineThickness} unit="px" />
                    </div>
                </div>
                <button className="w-full flex items-center justify-between p-6 bg-gray-900/30 border border-gray-800 rounded hover:border-gray-700 transition-colors group" onClick={() => setLockWarning(!lockWarning)} aria-pressed={lockWarning} aria-label="Toggle Lock Warning Flash">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${lockWarning ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}><Eye size={20} aria-hidden="true" /></div>
                            <div className="text-left"><h4 className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wide transition-colors">Lock Warning Flash</h4><p className="text-[10px] text-gray-500 mt-1">Visual indicator before piece hard locks</p></div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${lockWarning ? 'bg-cyan-600' : 'bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${lockWarning ? 'translate-x-6' : 'translate-x-0'}`} /></div>
                </button>
            </div>
        </div>
    );
};

const AudioPanel: React.FC = () => {
    const { musicEnabled, setMusicEnabled } = useUiStore();
    return (
        <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50 max-w-2xl mx-auto animate-slide-in">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2" role="heading" aria-level={3}><Volume2 size={16} className="text-cyan-500" aria-hidden="true"/> Audio Configuration</h3>
            <div className="space-y-8">
                <button className="w-full flex items-center justify-between p-6 bg-black/20 border border-gray-800 rounded hover:border-gray-600 transition-colors group" onClick={() => setMusicEnabled(!musicEnabled)} aria-pressed={musicEnabled} aria-label="Toggle Background Music">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded flex items-center justify-center transition-colors ${musicEnabled ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-600'}`}><Music size={24} aria-hidden="true" /></div>
                            <div className="text-left"><h4 className="text-sm font-bold text-white group-hover:text-cyan-100 uppercase tracking-wide transition-colors">Background Music</h4><p className="text-[11px] text-gray-500 mt-1">Procedural ambient drone track during gameplay</p></div>
                        </div>
                        <div className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${musicEnabled ? 'bg-cyan-600' : 'bg-gray-700'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${musicEnabled ? 'translate-x-7' : 'translate-x-0'}`} /></div>
                </button>
            </div>
        </div>
    );
};

const Settings: React.FC<SettingsProps> = ({ controls, setKeyBinding, activeTab: initialTab = 'GAMEPLAY' }) => {
  const { isSettingsOpen: isOpen, closeSettings, setMusicEnabled } = useUiStore(); 
  const { setGhostStyle, setDas, setArr, setGameSpeed } = useGameSettingsStore();
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
  const handleResetSettings = () => { 
    setGhostStyle('neon'); 
    setDas(DEFAULT_DAS); 
    setArr(DEFAULT_ARR); 
    setGameSpeed(DEFAULT_GAMESPEED); 
    setMusicEnabled(true); 
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
            <div className="p-4 md:p-8 border-b border-gray-800 flex items-center justify-between md:justify-start gap-3"><SettingsIcon className="text-cyan-500 animate-spin-slow" size={24} aria-hidden="true" /><div><h2 className="text-lg md:text-xl font-black text-white tracking-[0.1em] uppercase font-mono italic" role="heading" aria-level={2}>Config</h2><div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold hidden md:block">System Parameters</div></div><button onClick={handleCloseSettings} className="md:hidden text-gray-500 p-2"><X /></button></div>
            <div className="flex md:flex-col gap-2 p-3 md:p-0 overflow-x-auto md:overflow-visible scrollbar-hide" role="tablist" aria-orientation="vertical"><TabButton id="GAMEPLAY" icon={Gamepad2} label="Gameplay" /><TabButton id="CONTROLS" icon={Keyboard} label="Controls" /><TabButton id="VISUALS" icon={Eye} label="Visuals" /><TabButton id="AUDIO" icon={Volume2} label="Audio" /></div>
            <div className="hidden md:block mt-auto p-6 border-t border-gray-800"><div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> SYSTEM ONLINE</div></div>
        </nav>
        <div className="flex-1 bg-[#050810] relative flex flex-col overflow-hidden">
            <div className="hidden md:flex justify-end p-4 absolute top-0 right-0 z-20"><button onClick={handleCloseSettings} onMouseEnter={() => audioManager.playUiHover()} className="w-10 h-10 flex items-center justify-center bg-gray-900/80 border border-gray-700 hover:border-red-500 hover:text-red-500 transition-all rounded-full group backdrop-blur-sm"><X size={18} className="group-hover:scale-110 transition-transform" /></button></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-24" ref={contentRef}>{activeTab === 'GAMEPLAY' && <GameplayPanel />}{activeTab === 'CONTROLS' && <ControlsPanel controls={controls} setKeyBinding={setKeyBinding} />}{activeTab === 'VISUALS' && <VisualsPanel />}{activeTab === 'AUDIO' && <AudioPanel />}</div>
            <div className="p-6 border-t border-gray-800 bg-[#080c1a] flex justify-between items-center sticky bottom-0 z-30 backdrop-blur-md"><button onClick={handleResetSettings} className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-white uppercase tracking-wider font-bold transition-colors"><RefreshCcw size={12} aria-hidden="true" /> Reset</button><button onClick={handleCloseSettings} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] rounded-sm">Confirm</button></div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
