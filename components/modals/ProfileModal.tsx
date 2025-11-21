
import React, { useState } from 'react';
import { User, Save, Trophy, Hash, BarChart2 } from 'lucide-react';
import { useProfileStore } from '../../stores/profileStore';
import { useModalStore } from '../../stores/modalStore';
import Modal from '../ui/Modal';
import { audioManager } from '../../utils/audioManager';

const ProfileModal = () => {
    const { playerName, stats, setPlayerName } = useProfileStore();
    const { closeProfile } = useModalStore();
    const [nameInput, setNameInput] = useState(playerName);

    const handleSave = () => {
        audioManager.playUiSelect();
        setPlayerName(nameInput);
        closeProfile();
    };

    return (
        <Modal onClose={closeProfile} ariaLabel="Player Profile" showCloseButton={true}>
            <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-cyan-900/30 rounded-full flex items-center justify-center mb-4 border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-in zoom-in duration-300">
                    <User size={40} className="text-cyan-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6">Identity Card</h2>

                <div className="w-full max-w-xs mb-8">
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
                        <button
                            onClick={handleSave}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded transition-colors"
                            aria-label="Save Name"
                        >
                            <Save size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                        <Hash size={20} className="text-purple-400 mb-2" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Games Played</span>
                        <span className="text-xl text-white font-mono font-bold">{stats.totalGamesPlayed}</span>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                        <Trophy size={20} className="text-yellow-400 mb-2" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Score</span>
                        <span className="text-sm md:text-xl text-white font-mono font-bold">{stats.totalScore.toLocaleString()}</span>
                    </div>
                     <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                        <BarChart2 size={20} className="text-green-400 mb-2" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Lines Cleared</span>
                        <span className="text-xl text-white font-mono font-bold">{stats.totalLinesCleared}</span>
                    </div>
                     <div className="bg-gray-800/50 p-4 rounded border border-white/5 flex flex-col items-center hover:bg-gray-800 transition-colors">
                        <Trophy size={20} className="text-orange-400 mb-2" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Highest Level</span>
                        <span className="text-xl text-white font-mono font-bold">{stats.highestLevelReached}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ProfileModal;
