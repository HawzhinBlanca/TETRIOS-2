
import React from 'react';
import { TetrominoType } from '../../types';
import { COLORS } from '../../constants';
import Preview from '../Preview';
import { Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';

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
        <Modal variant="skewed" borderColorClass="border-yellow-500" ariaLabel="Wildcard Selection">
            <div className="absolute top-4 right-4 text-yellow-500/20 group-hover:text-yellow-500/50 transition-colors animate-pulse" aria-hidden="true">
                <Sparkles size={80} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter italic" role="heading" aria-level={2}>WILDCARD!</h2>
            <p className="text-gray-300 text-sm mb-8">Choose your next Tetrimino.</p>

            <div className="grid grid-cols-4 gap-4 mb-8">
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
                        aria-label={`Select ${type} Piece`}
                    >
                        <Preview title="" type={type} aria-label="" />
                        <span className="mt-1 text-xs font-bold">{type}</span>
                    </button>
                ))}
            </div>
        </Modal>
    );
};
