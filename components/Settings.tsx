
import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Eye, Keyboard, Check, RefreshCcw, Monitor, Volume2, Music } from 'lucide-react';
import { KeyMap, KeyAction } from '../types';
import { audioManager } from '../utils/audioManager';

interface Props {
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
  // Tuning
  das: number;
  setDas: (n: number) => void;
  arr: number;
  setArr: (n: number) => void;
  // Controls
  controls: KeyMap;
  setKeyBinding: (action: KeyAction, key: string) => void;
  // Audio
  musicEnabled: boolean;
  setMusicEnabled: (b: boolean) => void;
}

type Tab = 'GAMEPLAY' | 'CONTROLS' | 'VISUALS' | 'AUDIO';

const GhostPreview = ({ style, opacity, thickness, glow }: any) => {
    return (
        <div className="w-full h-32 bg-black/40 border border-gray-800 rounded flex items-center justify-center relative overflow-hidden">
             {/* Grid Background */}
             <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
             
             {/* Dummy T-Piece Ghost */}
             <div className="relative grid grid-cols-3 gap-0.5 p-4">
                  <div className="w-6 h-6"></div>
                  <div 
                    className="w-6 h-6 rounded-[1px]"
                    style={{
                        background: style === 'neon' || style === 'dashed' ? `rgba(168, 85, 247, 0.1)` : `rgba(168, 85, 247, 0.3)`,
                        border: style === 'solid' ? 'none' : `${thickness}px ${style === 'dashed' ? 'dashed' : 'solid'} rgba(168, 85, 247, 0.8)`,
                        boxShadow: style === 'neon' ? `0 0 ${8 * glow}px rgba(168, 85, 247, 0.6), inset 0 0 ${4 * glow}px rgba(168, 85, 247, 0.4)` : 'none',
                        opacity: opacity
                    }}
                  ></div>
                  <div className="w-6 h-6"></div>
                  
                  <div 
                    className="w-6 h-6 rounded-[1px]"
                    style={{
                        background: style === 'neon' || style === 'dashed' ? `rgba(168, 85, 247, 0.1)` : `rgba(168, 85, 247, 0.3)`,
                        border: style === 'solid' ? 'none' : `${thickness}px ${style === 'dashed' ? 'dashed' : 'solid'} rgba(168, 85, 247, 0.8)`,
                        boxShadow: style === 'neon' ? `0 0 ${8 * glow}px rgba(168, 85, 247, 0.6), inset 0 0 ${4 * glow}px rgba(168, 85, 247, 0.4)` : 'none',
                        opacity: opacity
                    }}
                  ></div>
                   <div 
                    className="w-6 h-6 rounded-[1px]"
                    style={{
                        background: style === 'neon' || style === 'dashed' ? `rgba(168, 85, 247, 0.1)` : `rgba(168, 85, 247, 0.3)`,
                        border: style === 'solid' ? 'none' : `${thickness}px ${style === 'dashed' ? 'dashed' : 'solid'} rgba(168, 85, 247, 0.8)`,
                        boxShadow: style === 'neon' ? `0 0 ${8 * glow}px rgba(168, 85, 247, 0.6), inset 0 0 ${4 * glow}px rgba(168, 85, 247, 0.4)` : 'none',
                        opacity: opacity
                    }}
                  ></div>
                   <div 
                    className="w-6 h-6 rounded-[1px]"
                    style={{
                        background: style === 'neon' || style === 'dashed' ? `rgba(168, 85, 247, 0.1)` : `rgba(168, 85, 247, 0.3)`,
                        border: style === 'solid' ? 'none' : `${thickness}px ${style === 'dashed' ? 'dashed' : 'solid'} rgba(168, 85, 247, 0.8)`,
                        boxShadow: style === 'neon' ? `0 0 ${8 * glow}px rgba(168, 85, 247, 0.6), inset 0 0 ${4 * glow}px rgba(168, 85, 247, 0.4)` : 'none',
                        opacity: opacity
                    }}
                  ></div>
             </div>
             <div className="absolute bottom-2 right-2 text-[9px] text-gray-500 uppercase tracking-widest font-mono">Live Preview</div>
        </div>
    );
}

const Settings: React.FC<Props> = ({ 
  isOpen, onClose, 
  ghostStyle, setGhostStyle, 
  ghostOpacity, setGhostOpacity, 
  ghostThickness, setGhostThickness, 
  ghostGlowIntensity, setGhostGlowIntensity,
  gameSpeed, setGameSpeed,
  lockWarning, setLockWarning,
  das, setDas, arr, setArr,
  controls, setKeyBinding,
  musicEnabled, setMusicEnabled
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('GAMEPLAY');
  const [listeningFor, setListeningFor] = useState<KeyAction | null>(null);

  useEffect(() => {
      if (isOpen) audioManager.playUiSelect();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
      audioManager.playUiBack();
      onClose();
  };

  const handleTabChange = (tab: Tab) => {
      audioManager.playUiClick();
      setActiveTab(tab);
  };

  const handleBind = (action: KeyAction) => {
      audioManager.playUiClick();
      setListeningFor(action);
      const listener = (e: KeyboardEvent) => {
          e.preventDefault();
          audioManager.playUiSelect();
          setKeyBinding(action, e.key);
          setListeningFor(null);
          window.removeEventListener('keydown', listener);
      };
      window.addEventListener('keydown', listener);
  };

  const TabButton = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
      <button 
        onClick={() => handleTabChange(id)}
        onMouseEnter={() => audioManager.playUiHover()}
        className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase transition-all duration-200 relative overflow-hidden ${
            activeTab === id 
            ? 'text-cyan-400 bg-cyan-950/30 border-b-2 border-cyan-500' 
            : 'text-gray-500 hover:text-white hover:bg-gray-800/30 border-b-2 border-transparent'
        }`}
      >
          <Icon size={14} /> {label}
      </button>
  );

  const Slider = ({ label, value, min, max, step, onChange, unit = '' }: any) => (
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="bg-[#050810] border border-gray-800 w-full max-w-4xl shadow-[0_0_100px_rgba(6,182,212,0.15)] flex flex-col h-[90vh] md:h-[80vh] rounded overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#080c1a]">
          <div className="flex items-center gap-4">
              <div className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_8px_cyan]"></div>
              <div>
                  <h2 className="text-2xl font-black text-white tracking-[0.15em] uppercase font-mono italic">Configuration</h2>
                  <div className="flex items-center gap-2">
                      <span className="text-[9px] text-cyan-500 uppercase tracking-widest font-bold">Terminal Access</span>
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
              </div>
          </div>
          <button 
            onClick={handleClose} 
            onMouseEnter={() => audioManager.playUiHover()}
            className="w-10 h-10 flex items-center justify-center bg-gray-900 border border-gray-700 hover:border-red-500 hover:text-red-500 transition-all rounded group"
          >
              <X className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#0a0f1e]">
            <TabButton id="GAMEPLAY" icon={Gamepad2} label="Gameplay" />
            <TabButton id="CONTROLS" icon={Keyboard} label="Controls" />
            <TabButton id="VISUALS" icon={Eye} label="Visuals" />
            <TabButton id="AUDIO" icon={Volume2} label="Audio" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')]">
          
          {activeTab === 'GAMEPLAY' && (
              <div className="animate-in slide-in-from-right-4 duration-300 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 space-y-8">
                      <div className="bg-gray-900/50 p-8 rounded border border-gray-800/50 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-10"><Monitor size={64} /></div>
                          <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2">
                              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span> Handling Tuning
                          </h3>
                          <div className="space-y-10">
                              <Slider label="DAS (Delayed Auto Shift)" value={das} min={50} max={300} step={1} onChange={setDas} unit="ms" />
                              <Slider label="ARR (Auto Repeat Rate)" value={arr} min={0} max={50} step={1} onChange={setArr} unit="ms" />
                              <div className="p-4 bg-blue-900/20 border-l-2 border-blue-500 text-[10px] text-blue-300 leading-relaxed">
                                  <strong>Pro Tip:</strong> Lower values allow for faster play but require more precise inputs. Standard Tournament settings are approx 133ms DAS / 10ms ARR.
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="lg:col-span-5 space-y-8">
                      <div className="bg-gray-900/50 p-8 rounded border border-gray-800/50">
                          <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4">Engine Rate</h3>
                          <div className="space-y-10">
                              <Slider label="Gravity Multiplier" value={gameSpeed} min={0.5} max={3.0} step={0.1} onChange={setGameSpeed} unit="x" />
                              <div className="text-center">
                                  <div className="text-[40px] font-black text-gray-800 font-mono leading-none select-none opacity-50">{gameSpeed}x</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'CONTROLS' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-gray-900/50 p-8 rounded border border-gray-800/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {(Object.entries(controls) as [KeyAction, string[]][]).map(([action, keys]) => (
                              <button
                                key={action}
                                onClick={() => handleBind(action)}
                                onMouseEnter={() => audioManager.playUiHover()}
                                className={`group relative flex flex-col p-4 border rounded-lg transition-all duration-200 ${
                                    listeningFor === action 
                                    ? 'bg-cyan-900/40 border-cyan-500 ring-1 ring-cyan-500/50' 
                                    : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800'
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
              </div>
          )}

          {activeTab === 'VISUALS' && (
              <div className="animate-in slide-in-from-right-4 duration-300 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Preview Panel */}
                  <div className="lg:col-span-4 order-first lg:order-last">
                       <div className="sticky top-0 space-y-4">
                           <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Real-time Render</h3>
                           <GhostPreview style={ghostStyle} opacity={ghostOpacity} thickness={ghostThickness} glow={ghostGlowIntensity} />
                           <div className="text-[10px] text-gray-600 text-center">Reflects current ghost configuration</div>
                       </div>
                  </div>

                  {/* Settings Controls */}
                  <div className="lg:col-span-8 space-y-6">
                       <div className="bg-gray-900/50 p-8 rounded border border-gray-800/50">
                          <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-800 pb-4">Ghost Aesthetics</h3>
                          
                          <div className="grid grid-cols-3 gap-4 mb-10">
                                {['neon', 'dashed', 'solid'].map((style) => (
                                    <button 
                                        key={style}
                                        onClick={() => { setGhostStyle(style as any); audioManager.playUiClick(); }}
                                        onMouseEnter={() => audioManager.playUiHover()}
                                        className={`py-4 text-[10px] font-bold uppercase tracking-widest transition-all border rounded relative overflow-hidden group ${
                                            ghostStyle === style 
                                            ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'
                                        }`}
                                    >
                                        {style}
                                        {ghostStyle === style && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400"></div>}
                                    </button>
                                ))}
                          </div>

                          <div className="space-y-8">
                              <Slider label="Opacity" value={ghostOpacity} min={0.1} max={1} step={0.05} onChange={setGhostOpacity} />
                              <Slider label="Glow Intensity" value={ghostGlowIntensity} min={0} max={3} step={0.1} onChange={setGhostGlowIntensity} />
                              <Slider label="Border Thickness" value={ghostThickness} min={0} max={5} step={1} onChange={setGhostThickness} unit="px" />
                          </div>
                       </div>

                       <div className="flex items-center justify-between p-6 bg-gray-900/50 border border-gray-800 rounded hover:border-gray-700 transition-colors cursor-pointer" onClick={() => setLockWarning(!lockWarning)}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded flex items-center justify-center ${lockWarning ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                                    <Eye size={20} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide">Lock Warning Flash</h4>
                                    <p className="text-[10px] text-gray-500 mt-1">Visual indicator before piece hard locks</p>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${lockWarning ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${lockWarning ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                       </div>
                  </div>
              </div>
          )}

          {activeTab === 'AUDIO' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-gray-900/50 p-8 rounded border border-gray-800/50 max-w-2xl mx-auto">
                       <div className="absolute top-0 right-0 p-2 opacity-10"><Volume2 size={64} /></div>
                       <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-8 border-b border-gray-800 pb-4 flex items-center gap-2">
                           <span className="w-2 h-2 bg-cyan-500 rounded-full"></span> Audio Configuration
                       </h3>

                       <div className="space-y-8">
                           {/* Music Toggle */}
                           <div className="flex items-center justify-between p-6 bg-black/30 border border-gray-800 rounded hover:border-gray-600 transition-colors cursor-pointer" onClick={() => setMusicEnabled(!musicEnabled)}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded flex items-center justify-center transition-colors ${musicEnabled ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-600'}`}>
                                        <Music size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wide">Background Music</h4>
                                        <p className="text-[11px] text-gray-500 mt-1">Procedural ambient drone track during gameplay</p>
                                    </div>
                                </div>
                                <div className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${musicEnabled ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${musicEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                                </div>
                           </div>
                       </div>
                  </div>
              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-[#080c1a] flex justify-between items-center">
            <button onClick={() => {setGhostStyle('neon'); setDas(133); setArr(10); setGameSpeed(1); setMusicEnabled(true);}} className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-white uppercase tracking-wider font-bold transition-colors">
                <RefreshCcw size={12} /> Reset Defaults
            </button>
            <button onClick={handleClose} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] rounded-sm">
                Confirm
            </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
