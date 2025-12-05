

import React, { useState } from 'react';
import Button from '../ui/Button';
import { BoardRowSelector } from '../ui/BoardRowSelector';
import { SelectionModalLayout } from '../ui/SelectionModalLayout';

interface LineSelectionModalProps {
    onConfirm: (selectedRow: number) => void;
    onCancel: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    selectedLine: number | null; 
    flippedGravity: boolean;
    gridHeight?: number; // Added
}

const LINE_HIGHLIGHT_COLOR = "rgba(6, 182, 212, 0.8)"; 
const LINE_SHADOW_COLOR = "rgba(6, 182, 212, 0.7)";

export const LineSelectionModal: React.FC<LineSelectionModalProps> = ({
    onConfirm, onCancel, handleUiHover, handleUiClick, selectedLine, flippedGravity, gridHeight
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
        <SelectionModalLayout
            icon="Sparkles"
            title="LINE CLEARER!"
            description="Select a single line to clear."
            borderColorClass="border-cyan-500"
            onClose={onCancel}
            ariaLabel="Line Selection"
            footer={
                <>
                    <Button onClick={() => { handleUiClick(); onCancel(); }} variant="secondary" size="xl">Cancel</Button>
                    <Button onClick={confirmSelection} disabled={!isConfirmEnabled} variant="primary" size="xl">Confirm</Button>
                </>
            }
        >
            <BoardRowSelector
                onSelect={handleRowClick}
                onHover={(y) => { handleUiHover(); setLocalSelectedRow(y); }}
                selectedStartRow={localSelectedRow}
                selectionSize={1}
                flippedGravity={flippedGravity}
                highlightColor={LINE_HIGHLIGHT_COLOR}
                highlightShadowColor={LINE_SHADOW_COLOR}
                label="CLEARED"
                rowCount={gridHeight}
            />
        </SelectionModalLayout>
    );
};