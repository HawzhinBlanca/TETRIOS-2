
import React, { useState } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { useModalStore } from '../../stores/modalStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ACHIEVEMENTS, GAME_MODES_CONFIG } from '../../constants';
import Preview from '../Preview';
import { TetrominoType } from '../../types';
import { getIcon } from '../../utils/icons';
import { useUiSound } from '../../hooks/useUiSound';
import { TabSwitcher } from '../ui/TabSwitcher';
import { ModalHeader } from '../ui/ModalHeader';

const ProfileModal = () => {
    const { playerName, stats, setPlayerName, toggleShape } = useProfileStore();
    const { closeProfile } = useModalStore();
    const [nameInput, setNameInput] = useState(playerName);
    const [activeTab, setActiveTab] = useState<'STATS' | 'ACHIEVEMENTS' | 'DECK'>('STATS');
    const { playUiSelect, playUiClick } = useUiSound();

    const handleSave = () => {
        playUiSelect();
        setPlayerName(nameInput);
        closeProfile();
    };

    const handleToggleShape = (shape: TetrominoType) => {
        playUiClick();
        toggleShape(shape);
    };

    const SHAPE_GROUPS = [
        { name: 'Standard (7)', shapes: ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as TetrominoType[] },
        { name: 'Micro (1-2)', shapes: ['M1', 'D2_H', 'D2_V'] as TetrominoType[], unlockHint: 'Unlock via "Combo Breaker" Achievement' },
        { name: 'Trominos (3)', shapes: ['T3_L', 'T3_I'] as TetrominoType[], unlockHint: 'Unlock via "High Roller" Achievement' },
        { name: 'Pentominos (6)', shapes: ['P5_P', 'P5_X', 'P5_F', 'U'] as TetrominoType[], unlockHint: 'Unlock via "Survivor" Achievement' },
    ];

    return (
        <Modal onClose={closeProfile} ariaLabel="Player Profile" showCloseButton={true} className="max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            <ModalHeader
                title="Identity Card"
                icon="User"
                iconColor="text-cyan-400"
                iconBgColor="bg-cyan-900/30"
                iconBorderColor="border-cyan-500"
            >
                <div className="w-full flex flex-col items-center">
                    <div className="w-full max-w-xs mb-4">
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 block text-left">Operator Alias</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-white font-mono focus:border-cyan-500 focus:outline-none transition-colors"
                                maxLength={12}
                                placeholder="Enter Name"
                            />
                            <Button 
                                onClick={handleSave} 
                                variant="primary" 
                                size="icon" 
                                icon={getIcon('Save')} 
                                aria-label="Save Name"
                            />
                        </div>
                    </div>

                    <TabSwitcher 
                        tabs={['STATS', 'ACHIEVEMENTS', 'DECK']}
                        activeTab={activeTab}
                        onSelect={(id) => setActiveTab(id as any)}
                        className="p-1 bg-gray-800/50 rounded-lg justify-center w-fit"
                        activeVariant="primary"
                    />
                </div>
            </ModalHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                {activeTab === 'STATS' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 pb-6">
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                                {React.createElement(getIcon('Hash'), { size: 20, className: "text-purple-400 mb-2" })}
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Games Played</span>
                                <span className="text-xl text-white font-mono font-bold">{stats.totalGamesPlayed}</span>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                                {React.createElement(getIcon('Trophy'), { size: 20, className: "text-yellow-400 mb-2" })}
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Score</span>
                                <span className="text-sm md:text-xl text-white font-mono font-bold">{stats.totalScore.toLocaleString()}</span>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                                {React.createElement(getIcon('BarChart2'), { size: 20, className: "text-green-400 mb-2" })}
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Lines Cleared</span>
                                <span className="text-xl text-white font-mono font-bold">{stats.totalLinesCleared}</span>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                                {React.createElement(getIcon('Trophy'), { size: 20, className: "text-orange-400 mb-2" })}
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Highest Level</span>
                                <span className="text-xl text-white font-mono font-bold">{stats.highestLevelReached}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Best Performances</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {GAME_MODES_CONFIG.map(mode => {
                                    const highScore = stats.highScores?.[mode.id] || 0;
                                    const ModeIcon = getIcon(mode.icon);
                                    
                                    return (
                                        <div key={mode.id} className="flex items-center justify-between p-3 bg-gray-900/50 border border-white/5 rounded-lg hover:bg-gray-800/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full bg-gray-800 ${mode.color} text-opacity-80`}>
                                                    <ModeIcon size={16} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{mode.label}</span>
                                            </div>
                                            <span className={`font-mono font-bold text-sm ${highScore > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                                                {highScore.toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ACHIEVEMENTS' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2">
                        {ACHIEVEMENTS.map(ach => {
                            const isUnlocked = stats.unlockedAchievements.includes(ach.id);
                            const Icon = getIcon(ach.icon);
                            
                            return (
                                <div 
                                    key={ach.id}
                                    className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all duration-300 relative overflow-hidden group
                                        ${isUnlocked 
                                            ? `bg-gray-800/80 border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:scale-[1.02] hover:border-white/20` 
                                            : 'bg-black/40 border-white/5 opacity-60 grayscale'
                                        }
                                    `}
                                >
                                    {isUnlocked && <div className={`absolute inset-0 opacity-5 pointer-events-none bg-gradient-to-br from-transparent to-white`}></div>}
                                    
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-lg 
                                        ${isUnlocked ? `bg-gray-900 ${ach.color}` : 'bg-gray-900 text-gray-600'}`}
                                    >
                                        <Icon size={24} />
                                    </div>
                                    
                                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                        {ach.title}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 leading-tight">
                                        {ach.description}
                                    </p>
                                    
                                    {isUnlocked && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_lime]"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'DECK' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 pb-4">
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex items-center gap-3">
                            {React.createElement(getIcon('LayoutGrid', getIcon('Box')), { className: "text-blue-400" })}
                            <div className="text-xs text-blue-200">
                                Configure your Piece Deck for <strong>Marathon</strong> and <strong>Zen</strong> modes. 
                                Adventure Mode uses preset decks.
                            </div>
                        </div>

                        {SHAPE_GROUPS.map((group) => (
                            <div key={group.name} className="bg-gray-900/50 rounded-xl border border-white/5 p-4">
                                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{group.name}</h3>
                                    {group.unlockHint && !group.shapes.some(s => stats.unlockedShapes.includes(s)) && (
                                        <span className="text-[9px] text-red-400 uppercase tracking-widest flex items-center gap-1">
                                            {React.createElement(getIcon('Lock'), { size: 10 })} Locked
                                        </span>
                                    )}
                                </div>
                                
                                {group.unlockHint && !group.shapes.some(s => stats.unlockedShapes.includes(s)) ? (
                                    <div className="p-4 text-center text-gray-500 text-xs italic flex flex-col items-center gap-2">
                                        {React.createElement(getIcon('Lock'), { size: 24, className: "opacity-50" })}
                                        {group.unlockHint}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {group.shapes.map(shape => {
                                            const isUnlocked = stats.unlockedShapes.includes(shape);
                                            const isEnabled = stats.enabledShapes.includes(shape);
                                            const isMandatory = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].includes(shape);

                                            return (
                                                <button
                                                    key={shape}
                                                    onClick={() => !isMandatory && isUnlocked && handleToggleShape(shape)}
                                                    disabled={isMandatory || !isUnlocked}
                                                    className={`relative p-2 rounded border transition-all duration-200 flex flex-col items-center justify-center min-h-[80px]
                                                        ${isEnabled 
                                                            ? 'bg-gray-800 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                                                            : 'bg-black/40 border-white/5 opacity-60 grayscale'
                                                        }
                                                        ${!isMandatory && isUnlocked ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}
                                                    `}
                                                >
                                                    <Preview title="" type={shape} variant="small" className="scale-75 pointer-events-none" />
                                                    
                                                    {isEnabled && (
                                                        <div className="absolute top-1 right-1">
                                                            <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_5px_cyan]"></div>
                                                        </div>
                                                    )}
                                                    {!isEnabled && isUnlocked && !isMandatory && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded opacity-0 hover:opacity-100 transition-opacity">
                                                            <span className="text-[9px] font-bold text-white uppercase">Enable</span>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ProfileModal;
