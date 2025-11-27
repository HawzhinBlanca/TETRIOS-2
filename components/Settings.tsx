
import React, { useState } from 'react';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useInputStore } from '../stores/inputStore';
import { useUiStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { audioManager } from '../utils/audioManager';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Slider from './ui/Slider';
import GhostPreview from './ui/GhostPreview';
import { KeyMap, KeyAction } from '../types';
import { Volume2, VolumeX, Monitor, Keyboard, Gamepad2, Eye } from 'lucide-react';

interface SettingsProps {
    controls: KeyMap;
    setKeyBinding: (action: KeyAction, key: string, slot: number) => void;
    resetControls: () => void;
}

const Settings: React.FC<SettingsProps> = ({ controls, setKeyBinding, resetControls }) => {
    const { closeSettings } = useModalStore();
    const [activeTab, setActiveTab] = useState<'GAMEPLAY' | 'CONTROLS' | 'VISUALS' | 'AUDIO'>('GAMEPLAY');

    // Game Settings
    const {
        ghostStyle, setGhostStyle,
        ghostOpacity, setGhostOpacity,
        ghostOutlineThickness, setGhostOutlineThickness,
        ghostGlowIntensity, setGhostGlowIntensity,
        gameSpeed, setGameSpeed,
        das, setDas,
        arr, setArr,
        masterVolume, setMasterVolume,
        musicVolume, setMusicVolume,
        sfxVolume, setSfxVolume,
        uiVolume, setUiVolume,
        colorblindMode, setColorblindMode,
        blockSkin, setBlockSkin
    } = useGameSettingsStore();

    // UI Settings
    const { musicEnabled, setMusicEnabled } = useUiStore();

    const handleTabChange = (tab: typeof activeTab) => {
        audioManager.playUiSelect();
        setActiveTab(tab);
    };

    return (
        <Modal onClose={closeSettings} ariaLabel="Settings" showCloseButton={true} className="max-w-2xl h-[80vh] flex flex-col">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-gray-800 pb-4">Config</h2>
            
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {(['GAMEPLAY', 'CONTROLS', 'VISUALS', 'AUDIO'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                            ${activeTab === tab ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                        `}
                    >
                        {tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {activeTab === 'VISUALS' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Eye size={16} /> Ghost Piece
                            </h3>
                            
                            <GhostPreview 
                                style={ghostStyle} 
                                opacity={ghostOpacity} 
                                thickness={ghostOutlineThickness} 
                                glow={ghostGlowIntensity} 
                            />

                            <Slider label="Ghost Opacity" value={ghostOpacity} min={0} max={1} step={0.05} onChange={setGhostOpacity} />
                            <Slider label="Glow Intensity" value={ghostGlowIntensity} min={0} max={3} step={0.1} onChange={setGhostGlowIntensity} />
                            <Slider label="Outline Thickness" value={ghostOutlineThickness} min={0} max={5} step={1} onChange={setGhostOutlineThickness} unit="px" />
                            
                            <div className="flex gap-2 mt-2">
                                {(['neon', 'dashed', 'solid'] as const).map(style => (
                                    <button
                                        key={style}
                                        onClick={() => { audioManager.playUiClick(); setGhostStyle(style); }}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase rounded border ${ghostStyle === style ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' : 'bg-black/20 border-gray-800 text-gray-500'}`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-800">
                             <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Monitor size={16} /> Accessibility & Theme
                            </h3>
                            <div>
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2">Block Skin</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['NEON', 'RETRO', 'MINIMAL', 'GELATIN', 'CYBER'] as const).map(skin => (
                                        <button
                                            key={skin}
                                            onClick={() => { audioManager.playUiClick(); setBlockSkin(skin); }}
                                            className={`py-2 text-[10px] font-bold uppercase rounded border ${blockSkin === skin ? 'bg-purple-900/50 border-purple-500 text-purple-400' : 'bg-black/20 border-gray-800 text-gray-500'}`}
                                        >
                                            {skin}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2">Colorblind Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['NORMAL', 'PROTANOPIA', 'DEUTERANOPIA', 'TRITANOPIA'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => { audioManager.playUiClick(); setColorblindMode(mode); }}
                                            className={`py-2 text-[10px] font-bold uppercase rounded border ${colorblindMode === mode ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-black/20 border-gray-800 text-gray-500'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'GAMEPLAY' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Gamepad2 size={16} /> Handling
                            </h3>
                            <Slider label="DAS (Delayed Auto Shift)" value={das} min={50} max={300} step={1} onChange={setDas} unit="ms" />
                            <Slider label="ARR (Auto Repeat Rate)" value={arr} min={0} max={50} step={1} onChange={setArr} unit="ms" />
                            <Slider label="Game Speed (Multiplier)" value={gameSpeed} min={0.5} max={3} step={0.1} onChange={setGameSpeed} unit="x" />
                        </div>
                    </div>
                )}

                {activeTab === 'AUDIO' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Volume2 size={16} /> Volume Mixer
                            </h3>
                            <Slider label="Master Volume" value={masterVolume} min={0} max={1} step={0.05} onChange={setMasterVolume} />
                            <Slider label="Music" value={musicVolume} min={0} max={1} step={0.05} onChange={setMusicVolume} />
                            <Slider label="SFX" value={sfxVolume} min={0} max={1} step={0.05} onChange={setSfxVolume} />
                            <Slider label="UI" value={uiVolume} min={0} max={1} step={0.05} onChange={setUiVolume} />
                            
                            <div className="pt-4">
                                <Button 
                                    variant={musicEnabled ? 'primary' : 'secondary'} 
                                    onClick={() => setMusicEnabled(!musicEnabled)}
                                    className="w-full"
                                    icon={musicEnabled ? Volume2 : VolumeX}
                                >
                                    {musicEnabled ? 'Music Enabled' : 'Music Disabled'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'CONTROLS' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2"><Keyboard size={16} /> Key Mapping</h3>
                            <Button variant="outline" size="sm" onClick={() => { audioManager.playUiClick(); resetControls(); }}>Reset Defaults</Button>
                        </div>
                        
                        <div className="space-y-2">
                            {Object.entries(controls).map(([action, keys]) => (
                                <div key={action} className="flex items-center justify-between bg-black/20 p-2 rounded border border-white/5">
                                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">{action.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <div className="flex gap-2">
                                        {(keys as string[]).map((key, i) => (
                                            <button 
                                                key={i}
                                                className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-white min-w-[60px] hover:bg-gray-700 hover:border-cyan-500 focus:border-cyan-500 focus:outline-none transition-colors"
                                                onClick={(e) => {
                                                    const target = e.currentTarget;
                                                    target.innerText = '...';
                                                    target.classList.add('animate-pulse', 'border-cyan-500', 'text-cyan-400');
                                                    
                                                    const handleKeyDown = (ev: KeyboardEvent) => {
                                                        ev.preventDefault();
                                                        ev.stopPropagation();
                                                        setKeyBinding(action as KeyAction, ev.key, i);
                                                        audioManager.playUiSelect();
                                                        window.removeEventListener('keydown', handleKeyDown);
                                                    };
                                                    window.addEventListener('keydown', handleKeyDown, { once: true });
                                                }}
                                            >
                                                {key === ' ' ? 'SPACE' : (key || 'NONE')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default Settings;
