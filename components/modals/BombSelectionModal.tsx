

import React, { useState } from 'react';
import Button from '../ui/Button';
import { BoardRowSelector } from '../ui/BoardRowSelector';
import { SelectionModalLayout } from '../ui/SelectionModalLayout';

interface BombSelectionModalProps {
    onConfirm: (startRow: number, numRows: number) => void;
    onCancel: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    bombRowsToClear: number; 
    flippedGravity: boolean;
    gridHeight?: number; // Added
}

const BOMB_HIGHLIGHT_COLOR = "rgba(239, 68, 68, 0.8)"; 
const BOMB_SHADOW_COLOR = "rgba(239, 68, 68, 0.7)";

export const BombSelectionModal: React.FC<BombSelectionModalProps> = ({
    onConfirm, onCancel, handleUiHover, handleUiClick, bombRowsToClear, flippedGravity, gridHeight
}) => {
    const [selectedStartRow, setSelectedStartRow] = useState<number | null>(null);
    const [numRowsToHighlight] = useState<number>(bombRowsToClear); 

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
        <SelectionModalLayout
            icon="Bomb"
            title="BOMB BOOSTER!"
            description={`Select ${bombRowsToClear} rows to clear.`}
            borderColorClass="border-red-500"
            onClose={onCancel}
            ariaLabel="Bomb Selection"
            footer={
                <>
                    <Button onClick={() => { handleUiClick(); onCancel(); }} variant="secondary" size="xl">Cancel</Button>
                    <Button onClick={confirmSelection} disabled={!isConfirmEnabled} variant="danger" size="xl">Confirm</Button>
                </>
            }
        >
            <BoardRowSelector
                onSelect={handleRowClick}
                onHover={handleUiHover}
                selectedStartRow={selectedStartRow}
                selectionSize={numRowsToHighlight}
                flippedGravity={flippedGravity}
                highlightColor={BOMB_HIGHLIGHT_COLOR}
                highlightShadowColor={BOMB_SHADOW_COLOR}
                label="CLEARED"
                rowCount={gridHeight}
            />
        </SelectionModalLayout>
    );
};