
import React, { useState } from 'react';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useUiStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Slider from './ui/Slider';
import GhostPreview from './ui/GhostPreview';
import { KeyBindingRow } from './ui/KeyBindingRow';
import { KeyMap, KeyAction } from '../types';
import { getIcon } from '../utils/icons';
import { TabSwitcher } from './ui/TabSwitcher';
import { ModalHeader } from './ui/ModalHeader';

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
        blockGlowIntensity, setBlockGlowIntensity,
        gameSpeed, setGameSpeed,
        das, setDas,
        arr, setArr,
        masterVolume, setMasterVolume,
        musicVolume, setMusicVolume,
        sfxVolume, setSfxVolume,
        uiVolume, setUiVolume,
        bassVolume, setBassVolume,
        drumVolume, setDrumVolume,
        padVolume, setPadVolume,
        arpVolume, setArpVolume,
        colorblindMode, setColorblindMode,
        blockSkin, setBlockSkin,
        enableTouchControls, setEnableTouchControls,
        touchControlMode, setTouchControlMode,
        swapTouchControls, setSwapTouchControls,
        vibrationEnabled, setVibrationEnabled,
        trueRandom, setTrueRandom,
        gridDensity, setGridDensity,
        swipeSensitivity, setSwipeSensitivity
    } = useGameSettingsStore();

    // UI Settings
    const { musicEnabled, setMusicEnabled } = useUiStore();

    return (
        <Modal onClose={closeSettings} ariaLabel="Settings" showCloseButton={true} className="max-w-2xl h-[80vh] flex flex-col">
            <ModalHeader 
                title="System Config" 
                icon="Settings" 
                iconColor="text-gray-200"
                iconBgColor="bg-gray-800"
            >
                <div className="overflow-x-auto pb-2 custom-scrollbar w-full flex justify-center">
                    <TabSwitcher 
                        tabs={['GAMEPLAY', 'CONTROLS', 'VISUALS', 'AUDIO']}
                        activeTab={activeTab}
                        onSelect={(id) => setActiveTab(id as any)}
                    />
                </div>
            </ModalHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {activeTab === 'VISUALS' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                {React.createElement(getIcon('Eye'), { size: 16 })} Ghost Piece
                            </h3>
                            
                            <GhostPreview 
                                style={ghostStyle} 
                                opacity={ghostOpacity} 
                                thickness={ghostOutlineThickness} 
                                glow={ghostGlowIntensity} 
                            />

                            <Slider label="Ghost Opacity" value={ghostOpacity} min={0} max={1} step={0.05} onChange={setGhostOpacity} />
                            <Slider label="Ghost Glow" value={ghostGlowIntensity} min={0} max={3} step={0.1} onChange={setGhostGlowIntensity} />
                            <Slider label="Ghost Outline" value={ghostOutlineThickness} min={0} max={5} step={1} onChange={setGhostOutlineThickness} unit="px" />
                            
                            <div className="flex gap-2 mt-2">
                                {(['neon', 'dashed', 'solid'] as const).map(style => (
                                    <Button
                                        key={style}
                                        onClick={() => setGhostStyle(style)}
                                        variant={ghostStyle === style ? 'neon' : 'secondary'}
                                        size="sm"
                                        className="flex-1"
                                    >
                                        {style}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-800">
                             <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                {React.createElement(getIcon('Box'), { size: 16 })} Blocks & Theme
                            </h3>
                            <Slider label="Block Glow" value={blockGlowIntensity} min={0} max={2} step={0.1} onChange={setBlockGlowIntensity} />

                            <div>
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2">Block Skin</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['NEON', 'RETRO', 'MINIMAL', 'GELATIN', 'CYBER', 'EMOJI'] as const).map(skin => (
                                        <Button
                                            key={skin}
                                            onClick={() => setBlockSkin(skin)}
                                            variant={blockSkin === skin ? 'primary' : 'secondary'}
                                            size="sm"
                                            className={blockSkin === skin ? '!bg-purple-600 !border-purple-500' : ''}
                                        >
                                            {skin}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2">Colorblind Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['NORMAL', 'PROTANOPIA', 'DEUTERANOPIA', 'TRITANOPIA'] as const).map(mode => (
                                        <Button
                                            key={mode}
                                            onClick={() => setColorblindMode(mode)}
                                            variant={colorblindMode === mode ? 'primary' : 'secondary'}
                                            size="sm"
                                            className={colorblindMode === mode ? '!bg-blue-600 !border-blue-500' : ''}
                                        >
                                            {mode}
                                        </Button>
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
                                {React.createElement(getIcon('Layers'), { size: 16 })} Grid Configuration
                            </h3>
                            <div className="flex gap-2">
                                <Button 
                                    variant={gridDensity === 'DENSE' ? 'neon' : 'secondary'} 
                                    onClick={() => setGridDensity('DENSE')}
                                    className="flex-1 text-[10px]"
                                    pressed={gridDensity === 'DENSE'}
                                >
                                    WIDE (20x50)
                                </Button>
                                <Button 
                                    variant={gridDensity === 'COMFORT' ? 'primary' : 'secondary'} 
                                    onClick={() => setGridDensity('COMFORT')}
                                    className="flex-1 text-[10px]"
                                    pressed={gridDensity === 'COMFORT'}
                                >
                                    CLASSIC (10x24)
                                </Button>
                            </div>
                            <p className="text-[10px] text-gray-500">
                                <strong>Wide:</strong> High density, small blocks, 50 rows deep. 
                                <br />
                                <strong>Classic:</strong> Larger blocks, standard view. Recommended for Mobile.
                            </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-800">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                {React.createElement(getIcon('Gamepad2'), { size: 16 })} Handling
                            </h3>
                            <Slider label="DAS (Delayed Auto Shift)" value={das} min={50} max={300} step={1} onChange={setDas} unit="ms" />
                            <Slider label="ARR (Auto Repeat Rate)" value={arr} min={0} max={50} step={1} onChange={setArr} unit="ms" />
                            <Slider label="Game Speed (Multiplier)" value={gameSpeed} min={0.5} max={3} step={0.1} onChange={setGameSpeed} unit="x" />
                            
                            <Button 
                                variant={trueRandom ? 'neon' : 'secondary'} 
                                onClick={() => setTrueRandom(!trueRandom)}
                                className="w-full justify-between group mt-4"
                                pressed={trueRandom}
                                icon={getIcon('Dice5')}
                            >
                                <span>No Cap Mode (True Random)</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${trueRandom ? 'bg-cyan-500/20 text-cyan-300' : 'bg-black/20 text-gray-500'}`}>
                                    {trueRandom ? 'ON' : 'OFF'}
                                </span>
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'AUDIO' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                {React.createElement(getIcon('Volume2'), { size: 16 })} Volume Mixer
                            </h3>
                            <Slider label="Master Volume" value={masterVolume} min={0} max={1} step={0.05} onChange={setMasterVolume} />
                            <Slider label="Music" value={musicVolume} min={0} max={1} step={0.05} onChange={setMusicVolume} />
                            <Slider label="SFX" value={sfxVolume} min={0} max={1} step={0.05} onChange={setSfxVolume} />
                            <Slider label="UI" value={uiVolume} min={0} max={1} step={0.05} onChange={setUiVolume} />
                            
                            {/* Granular Mix */}
                            <div className="bg-black/20 border border-white/5 rounded-lg p-3 mt-4 space-y-3">
                                <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Music Composition</h4>
                                <Slider label="Drums" value={drumVolume} min={0} max={1} step={0.05} onChange={setDrumVolume} />
                                <Slider label="Bass" value={bassVolume} min={0} max={1} step={0.05} onChange={setBassVolume} />
                                <Slider label="Synths (Pad)" value={padVolume} min={0} max={1} step={0.05} onChange={setPadVolume} />
                                <Slider label="Arpeggiator" value={arpVolume} min={0} max={1} step={0.05} onChange={setArpVolume} />
                            </div>

                            <div className="pt-4">
                                <Button 
                                    variant={musicEnabled ? 'primary' : 'secondary'} 
                                    onClick={() => setMusicEnabled(!musicEnabled)}
                                    className="w-full"
                                    icon={getIcon(musicEnabled ? 'Volume2' : 'VolumeX')}
                                >
                                    {musicEnabled ? 'Music Enabled' : 'Music Disabled'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'CONTROLS' && (
                    <div className="space-y-6">
                        {/* Touch & Haptics Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                {React.createElement(getIcon('Smartphone'), { size: 16 })} Touch & Haptics
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <Button 
                                    variant={enableTouchControls ? 'neon' : 'secondary'} 
                                    onClick={() => setEnableTouchControls(!enableTouchControls)}
                                    className="w-full justify-between group"
                                    pressed={enableTouchControls}
                                    icon={getIcon('Tablet')}
                                >
                                    <span>On-Screen Controls</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${enableTouchControls ? 'bg-cyan-500/20 text-cyan-300' : 'bg-black/20 text-gray-500'}`}>
                                        {enableTouchControls ? 'ON' : 'OFF'}
                                    </span>
                                </Button>

                                {enableTouchControls && (
                                    <div className="p-3 bg-black/20 rounded border border-white/5 space-y-4">
                                        <div>
                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2">Control Style</label>
                                            <div className="flex gap-2">
                                                {(['HYBRID', 'GESTURES', 'BUTTONS'] as const).map(mode => (
                                                    <Button
                                                        key={mode}
                                                        onClick={() => setTouchControlMode(mode)}
                                                        variant={touchControlMode === mode ? 'primary' : 'secondary'}
                                                        size="sm"
                                                        className="flex-1 text-[9px]"
                                                    >
                                                        {mode}
                                                    </Button>
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-gray-500 mt-2">
                                                {touchControlMode === 'GESTURES' ? 'Swipe to Move/Drop. Tap to Rotate. Cleaner Screen.' : 
                                                 touchControlMode === 'BUTTONS' ? 'Classic D-Pad Buttons only.' : 
                                                 'Best of both worlds.'}
                                            </p>
                                        </div>

                                        <Slider 
                                            label="Touch Sensitivity" 
                                            value={swipeSensitivity} 
                                            min={0.5} 
                                            max={2.5} 
                                            step={0.1} 
                                            onChange={setSwipeSensitivity} 
                                            unit="x" 
                                        />
                                        
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <Button 
                                                variant={swapTouchControls ? 'primary' : 'secondary'} 
                                                onClick={() => setSwapTouchControls(!swapTouchControls)}
                                                className="w-full text-[10px]"
                                                pressed={swapTouchControls}
                                                icon={getIcon('RefreshCw')}
                                            >
                                                {swapTouchControls ? 'Left-Handed' : 'Right-Handed'}
                                            </Button>

                                            <Button 
                                                variant={vibrationEnabled ? 'primary' : 'secondary'} 
                                                onClick={() => {
                                                    const newState = !vibrationEnabled;
                                                    setVibrationEnabled(newState);
                                                    if (newState && navigator.vibrate) navigator.vibrate(20);
                                                }}
                                                className="w-full text-[10px]"
                                                pressed={vibrationEnabled}
                                                icon={getIcon(vibrationEnabled ? 'Vibrate' : 'VolumeX')}
                                            >
                                                Haptics {vibrationEnabled ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Key Mapping Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4 border-t border-gray-800 pt-6">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                    {React.createElement(getIcon('Keyboard'), { size: 16 })} Key Mapping
                                </h3>
                                <Button variant="outline" size="sm" onClick={resetControls}>Reset Defaults</Button>
                            </div>
                            
                            <div className="space-y-2">
                                {Object.entries(controls).map(([action, keys]) => (
                                    <KeyBindingRow 
                                        key={action}
                                        action={action as KeyAction}
                                        keys={keys as string[]}
                                        onBind={setKeyBinding}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default Settings;
