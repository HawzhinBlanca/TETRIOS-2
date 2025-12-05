
import React, { useState } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { useModalStore } from '../../stores/modalStore';
import Modal from '../ui/Modal';
import { GAME_MODES_CONFIG } from '../../constants';
import { Trophy, Calendar, Layers, Clock } from 'lucide-react';
import { formatTime } from '../../utils/formatters';
import { useUiSound } from '../../hooks/useUiSound';
import { ModalHeader } from '../ui/ModalHeader';
import { TabSwitcher } from '../ui/TabSwitcher';

export const LeaderboardModal = () => {
    const { closeLeaderboard } = useModalStore();
    const { stats } = useProfileStore();
    const [selectedMode, setSelectedMode] = useState<string>('MARATHON');
    const { playUiClick } = useUiSound();

    const handleModeChange = (modeId: string) => {
        playUiClick();
        setSelectedMode(modeId);
    };

    const leaderboard = stats.leaderboards[selectedMode] || [];

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'EASY': return 'text-green-400 border-green-500/30 bg-green-500/10';
            case 'MEDIUM': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
            case 'HARD': return 'text-red-400 border-red-500/30 bg-red-500/10';
            default: return 'text-gray-400';
        }
    };

    // Filter modes that have leaderboards (exclude adventure for now as it uses stars/levels)
    const modes = GAME_MODES_CONFIG.filter(m => m.id !== 'ADVENTURE').map(m => ({
        id: m.id,
        label: m.label
    }));

    return (
        <Modal onClose={closeLeaderboard} ariaLabel="Leaderboard" showCloseButton={true} className="max-w-4xl h-[85vh] flex flex-col">
            <ModalHeader 
                title="Hall of Fame" 
                icon="Trophy" 
                iconColor="text-yellow-400"
                iconBgColor="bg-yellow-900/30"
                iconBorderColor="border-yellow-500"
            >
                <div className="overflow-x-auto pb-2 custom-scrollbar w-full flex justify-center">
                    <TabSwitcher 
                        tabs={modes}
                        activeTab={selectedMode}
                        onSelect={handleModeChange}
                        activeVariant="primary"
                    />
                </div>
            </ModalHeader>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest px-4 mb-2 select-none">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-3">Operator</div>
                <div className="col-span-3 text-right">Score</div>
                <div className="col-span-2 text-center">Difficulty</div>
                <div className="col-span-3 text-right">Details</div>
            </div>

            {/* Leaderboard List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 bg-black/20 rounded-lg border border-white/5">
                {leaderboard.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50 py-12">
                        <Trophy size={48} className="mb-2" />
                        <span className="text-sm font-mono">NO DATA RECORDED</span>
                    </div>
                ) : (
                    leaderboard.map((entry, index) => (
                        <div 
                            key={`${entry.date}-${index}`} 
                            className={`
                                grid grid-cols-12 gap-2 items-center p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors
                                ${index === 0 ? 'bg-yellow-500/10' : (index === 1 ? 'bg-gray-400/10' : (index === 2 ? 'bg-orange-700/10' : ''))}
                            `}
                        >
                            <div className="col-span-1 flex justify-center">
                                {index < 3 ? (
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md
                                        ${index === 0 ? 'bg-yellow-500 text-black' : (index === 1 ? 'bg-gray-300 text-black' : 'bg-orange-700 text-white')}
                                    `}>
                                        {index + 1}
                                    </div>
                                ) : (
                                    <span className="text-gray-500 font-mono text-sm">#{index + 1}</span>
                                )}
                            </div>
                            
                            <div className="col-span-3 font-bold text-white truncate text-sm">
                                {entry.name}
                            </div>
                            
                            <div className="col-span-3 text-right font-mono font-bold text-cyan-300 text-lg">
                                {entry.score.toLocaleString()}
                            </div>
                            
                            <div className="col-span-2 flex justify-center">
                                <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${getDifficultyColor(entry.difficulty)}`}>
                                    {entry.difficulty}
                                </span>
                            </div>
                            
                            <div className="col-span-3 flex flex-col items-end gap-0.5 opacity-70">
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Layers size={10} /> {entry.lines} L
                                    <span className="mx-1">•</span>
                                    <Clock size={10} /> {formatTime(entry.time || 0, false)}
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-gray-600">
                                    <Calendar size={10} /> {new Date(entry.date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};
