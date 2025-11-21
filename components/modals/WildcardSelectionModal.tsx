
import React from 'react';
import { TetrominoType } from '../../types';
import { COLORS } from '../../constants';
import Preview from '../Preview';
import { Sparkles } from 'lucide-react';

interface WildcardSelectionModalProps {
    onSelectPiece: (type: TetrominoType) => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
}

const WILD_CARD_PIECES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export const WildcardSelectionModal: React.FC<WildcardSelectionModalProps> = ({
    onSelectPiece, handleUiHover, handleUiClick
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#0a0f1e] border-l-4 border-yellow-500 p-8 md:p-12 md:pr-24 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-lg w-[90%] text-center">
                <div className="absolute top-4 right-4 text-yellow-500/20 group-hover:text-yellow-500/50 transition-colors skew-x-[10deg] animate-pulse" aria-hidden="true"><Sparkles size={80} /></div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic" role="heading" aria-level={2}>WILDCARD!</h2>
                <p className="text-gray-300 text-sm mb-8 skew-x-[10deg]">Choose your next Tetrimino.</p>

                <div className="grid grid-cols-4 gap-4 mb-8 skew-x-[10deg]">
                    {WILD_CARD_PIECES.map(type => (
                        <button
                            key={type}
                            onClick={() => { handleUiClick(); onSelectPiece(type); }}
                            onMouseEnter={handleUiHover}
                            className={`flex flex-col items-center justify-center p-2 md:p-4 rounded-lg border-2 transition-all duration-200
                                bg-gray-900/50 hover:bg-gray-800
                            `}
                            style={{
                                borderColor: COLORS[type], 
                                color: COLORS[type],
                                boxShadow: `0 0 10px ${COLORS[type]}40`, 
                            }}
                        >
                            <Preview title="" type={type} aria-label={`Choose ${type} piece`} />
                            <span className="mt-1 text-xs font-bold">{type}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
