
import { ColorblindMode, TetrominoType } from '../types';
import { PALETTES } from '../constants';

/**
 * Retrieves the color for a specific tetromino type based on the active colorblind mode.
 * Falls back to NORMAL palette if the specific type is not defined in the active palette.
 */
export const getPieceColor = (type: TetrominoType | string | null, mode: ColorblindMode = 'NORMAL'): string => {
    if (!type) return 'rgba(255,255,255,0.1)';
    
    const activePalette = PALETTES[mode] || PALETTES['NORMAL'];
    const color = activePalette[type];
    
    if (color) return color;
    
    // Fallback for types not in custom palettes
    return PALETTES['NORMAL'][type] || '#ffffff';
};
