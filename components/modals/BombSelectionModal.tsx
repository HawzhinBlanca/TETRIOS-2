
import React, { useState } from 'react';
import { STAGE_HEIGHT } from '../../constants';
import { Bomb } from 'lucide-react';

interface BombSelectionModalProps {
    onConfirm: (startRow: number, numRows: number) => void;
    onCancel: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    bombRowsToClear: number; 
    flippedGravity: boolean;
}

const BOMB_HIGHLIGHT_COLOR = "rgba(239, 68, 68, 0.6)"; 

export const BombSelectionModal: React.FC<BombSelectionModalProps> = ({
    onConfirm, onCancel, handleUiHover, handleUiClick, bombRowsToClear, flippedGravity
}) => {
    const [selectedStartRow, setSelectedStartRow] = useState<number | null>(null);
    const [numRowsToHighlight, setNumRowsToHighlight] = useState<number>(bombRowsToClear); 

    const handleRowClick = (row: number) => {
        handleUiClick();
        setSelectedStartRow(row);
    };

    const confirmSelection = () => {
        if (selectedStartRow !== null) {
            onConfirm(selectedStartRow, numRowsToHighlight);
        }
    };

    const isConfirmEnabled = selectedStartRow !== null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#0a0f1e] border-l-4 border-red-500 p-8 md:p-12 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-lg w-[90%] text-center">
                <div className="absolute top-4 right-4 text-red-500/20 group-hover:text-red-500/50 transition-colors skew-x-[10deg] animate-pulse" aria-hidden="true"><Bomb size={80} /></div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic" role="heading" aria-level={2}>BOMB BOOSTER!</h2>
                <p className="text-gray-300 text-sm mb-8 skew-x-[10deg]">Select {bombRowsToClear} rows to clear.</p>

                <div className="relative w-full aspect-[10/20] bg-gray-900 border border-gray-700 mx-auto mb-8 overflow-hidden skew-x-[10deg]">
                    {[...Array(STAGE_HEIGHT)].map((_, y) => {
                        const isSelected = selectedStartRow !== null && y >= selectedStartRow && y < selectedStartRow + numRowsToHighlight;
                        return (
                            <button
                                key={y}
                                onClick={() => handleRowClick(y)}
                                onMouseEnter={handleUiHover}
                                className={`absolute left-0 w-full h-[5%] flex items-center justify-center border-b border-gray-800 transition-all duration-100
                                    ${isSelected ? 'bg-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.7)]' : 'hover:bg-gray-700/50'}
                                `}
                                style={{
                                    top: `${(flippedGravity ? STAGE_HEIGHT - (y + numRowsToHighlight) : y) * 5}%`, 
                                    borderColor: isSelected ? BOMB_HIGHLIGHT_COLOR : 'rgba(255,255,255,0.05)',
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

                <div className="flex justify-center gap-4 mt-8 skew-x-[10deg]">
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
                        className={`px-8 py-3 ${isConfirmEnabled ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-500 cursor-not-allowed'} text-white font-bold uppercase tracking-widest rounded transition-colors`}
                        disabled={!isConfirmEnabled}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};
