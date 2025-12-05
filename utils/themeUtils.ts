
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

/**
 * Converts HSV color values to a hex number (0xRRGGBB).
 * Useful for PixiJS tinting.
 * @param h Hue (0-360)
 * @param s Saturation (0-1)
 * @param v Value (0-1)
 */
export const hsvToNum = (h: number, s: number, v: number): number => {
    let r, g, b;
    let i = Math.floor(h / 60);
    let f = h / 60 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
        default: r=0; g=0; b=0;
    }
    return (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255);
};
