
import React, { useState } from 'react';
import { AdventureLevelConfig, BoosterType } from '../../types';
import { BOOSTERS, ABILITIES } from '../../constants';
import { useAdventureStore } from '../../stores/adventureStore';
import { useProfileStore } from '../../stores/profileStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { getIcon } from '../../utils/icons';
import { useUiSound } from '../../hooks/useUiSound';
import { TabSwitcher } from '../ui/TabSwitcher';
import { ModalHeader } from '../ui/ModalHeader';

interface BoosterSelectionModalProps {
    onStartGame: (config: AdventureLevelConfig, assistRows: number, activeBoosters: BoosterType[]) => void;
    onBack: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    currentLevelConfig?: AdventureLevelConfig;
    ownedBoosters: Record<BoosterType, number>;
    activeBoosters: BoosterType[];
    toggleActiveBooster: (type: BoosterType) => void;
    coins: number;
}

export const BoosterSelectionModal: React.FC<BoosterSelectionModalProps> = ({
    onStartGame, onBack, handleUiHover, handleUiClick,
    currentLevelConfig, ownedBoosters, activeBoosters, toggleActiveBooster, coins
}) => {
    const { getFailedAttempts } = useAdventureStore();
    const { stats, equipAbility, unequipAbility } = useProfileStore();
    const [activeTab, setActiveTab] = useState<'BOOSTERS' | 'ABILITIES'>('BOOSTERS');
    const { playUiBack } = useUiSound();
    
    const failedAttempts = getFailedAttempts(currentLevelConfig?.id || '');
    const assistRows = failedAttempts >= 3 ? 1 : 0;

    if (!currentLevelConfig) return null;

    return (
        <Modal onClose={onBack} ariaLabel="Mission Loadout" className="flex flex-col max-w-4xl h-[85vh]">
            <ModalHeader 
                title="Mission Loadout" 
                subtitle={<>Target: <span className="text-cyan-400 font-bold">{currentLevelConfig.title}</span></>}
            >
                <div className="flex justify-center">
                    <TabSwitcher 
                        tabs={[
                            { id: 'BOOSTERS', label: 'Boosters' },
                            { id: 'ABILITIES', label: `Abilities (${stats.equippedAbilities.length}/3)` }
                        ]}
                        activeTab={activeTab}
                        onSelect={(id) => setActiveTab(id as any)}
                        activeVariant="primary"
                    />
                </div>
            </ModalHeader>

            <div className="flex-1 overflow-y-auto min-h-0 pr-2 mb-6 custom-scrollbar">
                {activeTab === 'BOOSTERS' && (
                    <>
                        <div className="flex justify-center items-center gap-2 text-xl font-bold text-yellow-300 mb-4">
                            <span className="text-gray-500 mr-2 text-sm uppercase">Your Coins:</span> {coins} 🪙
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.values(BOOSTERS).map(booster => {
                                const count = ownedBoosters[booster.type] || 0;
                                const isActive = activeBoosters.includes(booster.type);
                                const canActivate = count > 0;
                                const Icon = getIcon(booster.icon);

                                return (
                                    <button
                                        key={booster.type}
                                        onClick={() => { if (canActivate) { handleUiClick(); toggleActiveBooster(booster.type); } else { playUiBack(); }}}
                                        onMouseEnter={handleUiHover}
                                        className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden
                                            ${isActive ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]' :
                                            canActivate ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-white' :
                                            'bg-gray-900/30 border-gray-800 text-gray-600 cursor-not-allowed opacity-60'}
                                        `}
                                        disabled={!canActivate && !isActive} 
                                    >
                                        <div className={`text-3xl mb-2 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                                            {Icon && <Icon size={24} />}
                                        </div>
                                        <span className="font-bold text-lg">{booster.name}</span>
                                        <span className="text-xs text-gray-400 mt-1 line-clamp-2">{booster.description}</span>
                                        <div className="mt-2 text-sm font-mono flex items-center gap-1">
                                            Owned: <span className="font-bold">{count}</span>
                                            {booster.cost && <span className="ml-2 text-yellow-300">{booster.cost} 🪙</span>}
                                        </div>
                                        {isActive && <span className="text-xs text-cyan-400 mt-1 uppercase font-bold bg-cyan-900/80 px-2 py-0.5 rounded">Active</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {activeTab === 'ABILITIES' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.values(ABILITIES).map(ability => {
                            const isUnlocked = stats.unlockedAbilities.includes(ability.id);
                            const isEquipped = stats.equippedAbilities.includes(ability.id);
                            const Icon = getIcon(ability.icon);
                            const LockIcon = getIcon('Lock');

                            return (
                                <button
                                    key={ability.id}
                                    onClick={() => {
                                        if (!isUnlocked) { playUiBack(); return; }
                                        handleUiClick();
                                        if (isEquipped) unequipAbility(ability.id);
                                        else equipAbility(ability.id);
                                    }}
                                    onMouseEnter={handleUiHover}
                                    className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-all duration-200 relative
                                        ${isEquipped ? `bg-purple-900/40 border-purple-500 text-purple-200 shadow-[0_0_20px_${ability.color}40]` :
                                        isUnlocked ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-white' :
                                        'bg-black/40 border-gray-800 text-gray-600 cursor-not-allowed opacity-50 grayscale'}
                                    `}
                                >
                                    {!isUnlocked && <div className="absolute top-2 right-2 text-gray-600"><LockIcon size={16} /></div>}
                                    <div className={`text-3xl mb-2 ${isEquipped ? 'text-purple-400' : (isUnlocked ? 'text-gray-400' : 'text-gray-700')}`}>
                                        {Icon && <Icon size={24} />}
                                    </div>
                                    <span className="font-bold text-lg">{ability.name}</span>
                                    <span className="text-xs text-gray-400 mt-1">{ability.description}</span>
                                    <div className="mt-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                                        Cooldown: {ability.cooldownMs / 1000}s
                                    </div>
                                    {isEquipped && <div className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_purple]"></div>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 flex justify-center gap-4 pt-4 border-t border-gray-800">
                <Button onClick={() => { handleUiClick(); onBack(); }} variant="secondary" size="xl">Back to Map</Button>
                <Button 
                    onClick={() => { handleUiClick(); onStartGame(currentLevelConfig, assistRows, activeBoosters); }} 
                    variant="primary" 
                    size="xl"
                >
                    Start Mission
                </Button>
            </div>
        </Modal>
    );
};
