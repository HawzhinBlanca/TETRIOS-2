
import React from 'react';
import { STAGE_HEIGHT } from '../../constants';

interface BoardRowSelectorProps {
    rowCount?: number;
    selectionSize?: number;
    onSelect: (rowIndex: number) => void;
    onHover?: (rowIndex: number) => void;
    selectedStartRow: number | null;
    flippedGravity: boolean;
    highlightColor: string;
    label?: string;
    highlightShadowColor?: string;
}

export const BoardRowSelector: React.FC<BoardRowSelectorProps> = ({
    rowCount = STAGE_HEIGHT,
    selectionSize = 1,
    onSelect,
    onHover,
    selectedStartRow,
    flippedGravity,
    highlightColor,
    label = "CLEARED",
    highlightShadowColor
}) => {
    // Default shadow to highlight color if not provided
    const shadowColor = highlightShadowColor || highlightColor;

    return (
        <div className="relative w-full aspect-[10/20] bg-gray-900 border border-gray-700 mx-auto mb-8 overflow-hidden">
            {[...Array(rowCount)].map((_, y) => {
                // Logic to check if this row index 'y' falls within the selection block starting at 'selectedStartRow'
                const isSelected = selectedStartRow !== null && y >= selectedStartRow && y < selectedStartRow + selectionSize;
                
                // Calculate visual position (top %)
                // If gravity flipped, index 0 is visually at bottom.
                // If normal, index 0 is top.
                // However, the button list is rendered in array order. We use 'top' to position them absolutely.
                // y is the logical row index in the game state (0..21).
                // Visual Top % = (Logical Y) * (100 / Height) -- IF normal gravity.
                // IF flipped gravity, Visual Top % = (Height - 1 - Logical Y) * ...
                
                // NOTE: The previous hardcoded implementations used slightly different math for multi-row selection in BombModal:
                // BombModal: top: `${(flippedGravity ? STAGE_HEIGHT - (y + numRowsToHighlight) : y) * 5}%`
                // LineModal: top: `${(flippedGravity ? STAGE_HEIGHT - 1 - y : y) * 5}%`
                
                // Let's analyze BombModal logic.
                // If y=0 (start), numRows=2. Flipped. Top = (22 - (0+2)) * 5 = 20 * 5 = 100%. (Off screen?)
                // Actually, STAGE_HEIGHT is usually 22.
                // Let's standardize to the visual coordinate system.
                // We want to render a button for every logical row y.
                
                let topPercent = 0;
                const rowHeightPercent = 100 / rowCount;
                
                if (flippedGravity) {
                    // Logic Y=0 is bottom. Visual Top is close to 100%.
                    // Visual Top = 100% - (y + 1) * rowHeightPercent
                    topPercent = 100 - ((y + 1) * rowHeightPercent);
                } else {
                    // Logic Y=0 is top. Visual Top is 0.
                    topPercent = y * rowHeightPercent;
                }

                return (
                    <button
                        key={y}
                        onClick={() => onSelect(y)}
                        onMouseEnter={() => onHover && onHover(y)}
                        className={`absolute left-0 w-full flex items-center justify-center border-b border-gray-800 transition-all duration-100
                            ${isSelected ? '' : 'hover:bg-gray-700/50'}
                        `}
                        style={{
                            height: `${rowHeightPercent}%`,
                            top: `${topPercent}%`,
                            borderColor: isSelected ? highlightColor : 'rgba(255,255,255,0.05)',
                            backgroundColor: isSelected ? highlightColor : undefined,
                            boxShadow: isSelected ? `0 0 20px ${shadowColor}` : 'none',
                            zIndex: isSelected ? 10 : 1
                        }}
                        aria-label={`Select row ${y + 1}`}
                    >
                        {isSelected && (
                            <span className="text-white font-bold text-lg pointer-events-none drop-shadow-md">{label}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
