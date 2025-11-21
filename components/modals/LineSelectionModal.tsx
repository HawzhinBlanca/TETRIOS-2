
import React, { useState } from 'react';
import { STAGE_HEIGHT } from '../../constants';
import { Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';

interface LineSelectionModalProps {
    onConfirm: (selectedRow: number) => void;
    onCancel: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    selectedLine: number | null; 
    flippedGravity: boolean;
}

const LINE_HIGHLIGHT_COLOR = "rgba(6, 182, 212, 0.6)"; 

export const LineSelectionModal: React.FC<LineSelectionModalProps> = ({
    onConfirm, onCancel, handleUiHover, handleUiClick, selectedLine, flippedGravity
}) => {
    const [localSelectedRow, setLocalSelectedRow] = useState<number | null>(selectedLine);

    const handleRowClick = (row: number) => {
        handleUiClick();
        setLocalSelectedRow(row);
    };

    const confirmSelection = () => {
        if (localSelectedRow !== null) {
            onConfirm(localSelectedRow);
        }
    };

    const isConfirmEnabled = localSelectedRow !== null;

    return (
        <Modal variant="skewed" borderColorClass="border-cyan-500" onClose={onCancel} ariaLabel="Line Selection">
            <div className="absolute top-4 right-4 text-cyan-500/20 group-hover:text-cyan-500/50 transition-colors animate-pulse" aria-hidden="true">
                <Sparkles size={80} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter italic" role="heading" aria-level={2}>LINE CLEARER!</h2>
            <p className="text-gray-300 text-sm mb-8">Select a single line to clear.</p>

            <div className="relative w-full aspect-[10/20] bg-gray-900 border border-gray-700 mx-auto mb-8 overflow-hidden">
                {[...Array(STAGE_HEIGHT)].map((_, y) => {
                    const isSelected = localSelectedRow === y;
                    return (
                        <button
                            key={y}
                            onClick={() => handleRowClick(y)}
                            onMouseEnter={() => { handleUiHover(); setLocalSelectedRow(y); }}
                            onMouseLeave={() => { }} 
                            className={`absolute left-0 w-full h-[5%] flex items-center justify-center border-b border-gray-800 transition-all duration-100
                                ${isSelected ? 'bg-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.7)]' : 'hover:bg-gray-700/50'}
                            `}
                            style={{
                                top: `${(flippedGravity ? STAGE_HEIGHT - 1 - y : y) * 5}%`,
                                borderColor: isSelected ? LINE_HIGHLIGHT_COLOR : 'rgba(255,255,255,0.05)',
                                zIndex: isSelected ? 10 : 1
                            }}
                            aria-label={`Select row ${y + 1}`}
                        >
                            {isSelected && (
                                <span className="text-white font-bold text-lg pointer-events-none">CLEARED</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-center gap-4 mt-8">
                <button
                    onClick={() => { handleUiClick(); onCancel(); }}
                    onMouseEnter={handleUiHover}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold uppercase tracking-widest rounded transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={confirmSelection}
                    onMouseEnter={handleUiHover}
                    className={`px-8 py-3 ${isConfirmEnabled ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-gray-500 cursor-not-allowed'} text-white font-bold uppercase tracking-widest rounded transition-colors`}
                    disabled={!isConfirmEnabled}
                >
                    Confirm
                </button>
            </div>
        </Modal>
    );
};
