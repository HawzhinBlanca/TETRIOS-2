
import React, { useState, useEffect, useRef } from 'react';
import { X, Gamepad2, Eye, Keyboard, Check, RefreshCcw, Monitor, Volume2, Music, Settings as SettingsIcon } from 'lucide-react';
import { KeyMap, KeyAction } from '../types';
import { audioManager } from '../utils/audioManager';

type Tab = 'GAMEPLAY' | 'CONTROLS' | 'VISUALS' | 'AUDIO';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  ghostStyle: 'neon' | 'dashed' | 'solid';
  setGhostStyle: (s: 'neon' | 'dashed' | 'solid') => void;
  ghostOpacity: number;
  setGhostOpacity: (n: number) => void;
  ghostThickness: number;
  setGhostThickness: (n: number) => void;
  ghostGlowIntensity: number;
  setGhostGlowIntensity: (n: number) => void;
  gameSpeed: number;
  setGameSpeed: (n: number) => void;
  lockWarning: boolean;
  setLockWarning: (b: boolean) => void;
  das: number;
  setDas: (n: number) => void;
  arr: number;
  setArr: (n: number) => void;
  controls: KeyMap;
  setKeyBinding: (action: KeyAction, key: string) => void;
  musicEnabled: boolean;
  setMusicEnabled: (b: boolean) => void;
  activeTab?: Tab;
}

// --- UI HELPERS ---

const Slider = ({ label, value, min, max, step, onChange, unit = '' }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit?: string }) => (
  <div className="group">
    <label className="flex justify-between text-[10px] text-gray-400 mb-3 font-bold tracking-widest uppercase group-hover:text-cyan-400 transition-colors">
        <span>{label}</span>
        <span className="font-mono text-white">{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}</span>
    </label>
    <div className="relative flex items-center h-6">
         <input 
           type="range" min={min} max={max} step={step} 
           value={value} 
           onChange={(e) => onChange(parseFloat(e.target.value))}
           onInput={() => audioManager.playUiHover()} 
           className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer z-10 relative opacity-0"
           aria-label={label}
         />
         {/* Custom Track */}
         <div className="absolute inset-0 flex items-center pointer-events-none">
             <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                 <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" style={{ width: `${((value - min) / (max - min)) * 100}%` }}></div>
             </div>
             <div 
                className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] transform -translate-x-2 transition-transform duration-75" 
                style={{ left: `${((value - min) / (max - min)) * 100}%` }}
             ></div>
         </div>
    </div>
  </div>
);

const GhostPreview = ({ style, opacity, thickness, glow }: { style: string, opacity: number, thickness: number, glow: number }) => (
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

// --- PANELS ---

const GameplayPanel = ({ das, setDas, arr, setArr, gameSpeed, setGameSpeed }: Partial<SettingsProps>) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in">
        <div className="space-y-8">
            <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none"><Monitor size={80} /></div>
                <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span> Handling Tuning
                </h3>
                <div className="space-y-10">
                    <Slider label="DAS (Delayed Auto Shift)" value={das!} min={50} max={300} step={1} onChange={setDas!} unit="ms" />
                    <Slider label="ARR (Auto Repeat Rate)" value={arr!} min={0} max={50} step={1} onChange={setArr!} unit="ms" />
                </div>
            </div>
        </div>

        <div className="space-y-8">
            <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4">Engine Rate</h3>
                <div className="space-y-10">
                    <Slider label="Gravity Multiplier" value={gameSpeed!} min={0.5} max={3.0} step={0.1} onChange={setGameSpeed!} unit="x" />
                </div>
            </div>
        </div>
    </div>
);

const ControlsPanel = ({ controls, setKeyBinding }: Partial<SettingsProps>) => {
    const [listeningFor, setListeningFor] = useState<KeyAction | null>(null);

    const handleBind = (action: KeyAction) => {
        audioManager.playUiClick();
        setListeningFor(action);
        const listener = (e: KeyboardEvent) => {
            e.preventDefault();
            audioManager.playUiSelect();
            setKeyBinding!(action, e.key);
            setListeningFor(null);
            window.removeEventListener('keydown', listener);
        };
        window.addEventListener('keydown', listener);
    };

    return (
        <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50 animate-slide-in">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2">
                <Keyboard size={16} className="text-cyan-500"/> Key Mapping
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {(Object.entries(controls || {}) as [KeyAction, string[]][]).map(([action, keys]) => (
                    <button
                        key={action}
                        onClick={() => handleBind(action)}
                        onMouseEnter={() => audioManager.playUiHover()}
                        className={`group relative flex flex-col p-4 border rounded-lg transition-all duration-200 ${
                            listeningFor === action 
                            ? 'bg-cyan-900/40 border-cyan-500 ring-1 ring-cyan-500/50' 
                            : 'bg-gray-900/50 border-gray-800 hover:border-gray-600 hover:bg-gray-800'
                        }`}
                    >
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-3 font-bold">{action.replace(/([A-Z])/g, ' $1')}</span>
                        <div className="flex items-center justify-between">
                            <div className={`h-10 px-4 min-w-[60px] flex items-center justify-center bg-[#1a1f2e] border-b-4 border-black rounded text-sm font-mono font-bold text-gray-300 shadow-sm transition-transform ${listeningFor === action ? 'translate-y-1 border-b-0 bg-cyan-900 text-white' : 'group-hover:translate-y-[1px] group-hover:border-b-2'}`}>
                                {listeningFor === action ? '...' : keys[0]}
                            </div>
                            {listeningFor === action && <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const VisualsPanel = (props: Partial<SettingsProps>) => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-in">
        <div className="lg:col-span-4 order-first lg:order-last">
            <div className="lg:sticky lg:top-0 space-y-4">
                <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Real-time Render</h3>
                <GhostPreview style={props.ghostStyle!} opacity={props.ghostOpacity!} thickness={props.ghostThickness!} glow={props.ghostGlowIntensity!} />
            </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
            <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-800 pb-4">Ghost Aesthetics</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-10" role="radiogroup" aria-label="Ghost Piece Style">
                        {['neon', 'dashed', 'solid'].map((style) => (
                            <button 
                                key={style}
                                role="radio"
                                aria-checked={props.ghostStyle === style}
                                onClick={() => { props.setGhostStyle!(style as any); audioManager.playUiClick(); }}
                                className={`py-4 text-[10px] font-bold uppercase tracking-widest transition-all border rounded relative overflow-hidden group ${
                                    props.ghostStyle === style 
                                    ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'
                                }`}
                            >
                                {style}
                                {props.ghostStyle === style && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400"></div>}
                            </button>
                        ))}
                </div>

                <div className="space-y-8">
                    <Slider label="Opacity" value={props.ghostOpacity!} min={0.1} max={1} step={0.05} onChange={props.setGhostOpacity!} />
                    <Slider label="Glow Intensity" value={props.ghostGlowIntensity!} min={0} max={3} step={0.1} onChange={props.setGhostGlowIntensity!} />
                    <Slider label="Border Thickness" value={props.ghostThickness!} min={0} max={5} step={1} onChange={props.setGhostThickness!} unit="px" />
                </div>
            </div>

            <button className="w-full flex items-center justify-between p-6 bg-gray-900/30 border border-gray-800 rounded hover:border-gray-700 transition-colors group" onClick={() => props.setLockWarning!(!props.lockWarning)} aria-pressed={props.lockWarning}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${props.lockWarning ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                            <Eye size={20} />
                        </div>
                        <div className="text-left">
                            <h4 className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wide transition-colors">Lock Warning Flash</h4>
                            <p className="text-[10px] text-gray-500 mt-1">Visual indicator before piece hard locks</p>
                        </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${props.lockWarning ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${props.lockWarning ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
            </button>
        </div>
    </div>
);

const AudioPanel = ({ musicEnabled, setMusicEnabled }: Partial<SettingsProps>) => (
    <div className="bg-gray-900/30 p-6 md:p-8 rounded border border-gray-800/50 max-w-2xl mx-auto animate-slide-in">
        <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2">
            <Volume2 size={16} className="text-cyan-500"/> Audio Configuration
        </h3>
        <div className="space-y-8">
            <button className="w-full flex items-center justify-between p-6 bg-black/20 border border-gray-800 rounded hover:border-gray-600 transition-colors group" onClick={() => setMusicEnabled!(!musicEnabled)} aria-pressed={musicEnabled}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded flex items-center justify-center transition-colors ${musicEnabled ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-600'}`}>
                            <Music size={24} />
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-bold text-white group-hover:text-cyan-100 uppercase tracking-wide transition-colors">Background Music</h4>
                            <p className="text-[11px] text-gray-500 mt-1">Procedural ambient drone track during gameplay</p>
                        </div>
                    </div>
                    <div className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${musicEnabled ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${musicEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                    </div>
            </button>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const Settings: React.FC<SettingsProps> = (props) => {
  const { isOpen, onClose, activeTab: initialTab = 'GAMEPLAY' } = props;
  const [activeTab, setActiveTab] = useState<Tab>('GAMEPLAY');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
      if (isOpen) audioManager.playUiSelect();
  }, [isOpen]);

  // Scroll to top on tab change
  useEffect(() => {
      if(contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab]);

  if (!isOpen) return null;

  const handleTabChange = (tab: Tab) => {
      audioManager.playUiClick();
      setActiveTab(tab);
  };

  const TabButton = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => {
      const isActive = activeTab === id;
      return (
        <button 
            onClick={() => handleTabChange(id)}
            onMouseEnter={() => audioManager.playUiHover()}
            aria-selected={isActive}
            role="tab"
            className={`
                flex-shrink-0 md:w-full text-left py-3 px-4 md:py-4 md:px-6 flex items-center gap-3 
                text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase transition-all duration-200 
                rounded-full md:rounded-none md:border-l-4 border-transparent
                ${isActive 
                    ? 'bg-cyan-950 text-cyan-400 md:bg-cyan-950/30 md:border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)] md:shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'bg-gray-800/50 text-gray-500 hover:text-white hover:bg-gray-800 md:bg-transparent md:hover:bg-gray-800/30'
                }
            `}
        >
            <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-gray-600'} /> 
            <span>{label}</span>
        </button>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Settings Menu">
      <div className="bg-[#050810] border border-gray-800 w-full max-w-5xl shadow-[0_0_100px_rgba(6,182,212,0.15)] flex flex-col md:flex-row h-[90vh] md:h-[80vh] rounded-lg overflow-hidden relative">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-[#080c1a] border-b md:border-b-0 md:border-r border-gray-800 flex flex-col flex-shrink-0 z-10">
            <div className="p-4 md:p-8 border-b border-gray-800 flex items-center justify-between md:justify-start gap-3">
                <SettingsIcon className="text-cyan-500 animate-spin-slow" size={24} />
                <div>
                  <h2 className="text-lg md:text-xl font-black text-white tracking-[0.1em] uppercase font-mono italic">Config</h2>
                  <div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold hidden md:block">System Parameters</div>
                </div>
                <button onClick={() => { audioManager.playUiBack(); onClose(); }} className="md:hidden text-gray-500 p-2"><X /></button>
            </div>
            
            {/* Mobile: Horizontal Scroll | Desktop: Vertical Stack */}
            <div className="flex md:flex-col gap-2 p-3 md:p-0 overflow-x-auto md:overflow-visible scrollbar-hide" role="tablist" aria-orientation="vertical">
                <TabButton id="GAMEPLAY" icon={Gamepad2} label="Gameplay" />
                <TabButton id="CONTROLS" icon={Keyboard} label="Controls" />
                <TabButton id="VISUALS" icon={Eye} label="Visuals" />
                <TabButton id="AUDIO" icon={Volume2} label="Audio" />
            </div>

            <div className="hidden md:block mt-auto p-6 border-t border-gray-800">
                 <div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono">
                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                     SYSTEM ONLINE
                 </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#050810] relative flex flex-col overflow-hidden">
            
            {/* Desktop Header / Close */}
            <div className="hidden md:flex justify-end p-4 absolute top-0 right-0 z-20">
                 <button 
                    onClick={() => { audioManager.playUiBack(); onClose(); }} 
                    onMouseEnter={() => audioManager.playUiHover()}
                    className="w-10 h-10 flex items-center justify-center bg-gray-900/80 border border-gray-700 hover:border-red-500 hover:text-red-500 transition-all rounded-full group backdrop-blur-sm"
                    aria-label="Close Settings"
                  >
                      <X size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-24" ref={contentRef}>
                {activeTab === 'GAMEPLAY' && <GameplayPanel {...props} />}
                {activeTab === 'CONTROLS' && <ControlsPanel {...props} />}
                {activeTab === 'VISUALS' && <VisualsPanel {...props} />}
                {activeTab === 'AUDIO' && <AudioPanel {...props} />}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-800 bg-[#080c1a] flex justify-between items-center sticky bottom-0 z-30 backdrop-blur-md">
                <button onClick={() => {props.setGhostStyle('neon'); props.setDas(133); props.setArr(10); props.setGameSpeed(1); props.setMusicEnabled(true); audioManager.playUiClick();}} className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-white uppercase tracking-wider font-bold transition-colors">
                    <RefreshCcw size={12} /> Reset
                </button>
                <button onClick={() => { audioManager.playUiBack(); onClose(); }} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] rounded-sm">
                    Confirm
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
