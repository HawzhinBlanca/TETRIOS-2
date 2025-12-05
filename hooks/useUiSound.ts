
import { useCallback } from 'react';
import { audioManager } from '../utils/audioManager';

export const useUiSound = () => {
    const playUiHover = useCallback(() => audioManager.playUiHover(), []);
    const playUiClick = useCallback(() => audioManager.playUiClick(), []);
    const playUiBack = useCallback(() => audioManager.playUiBack(), []);
    const playUiSelect = useCallback(() => audioManager.playUiSelect(), []);
    
    // Alias for common prop names used in components
    const handleUiHover = playUiHover;
    const handleUiClick = playUiClick;

    return { 
        playUiHover, 
        playUiClick, 
        playUiBack, 
        playUiSelect, 
        handleUiHover, 
        handleUiClick,
        // Legacy aliases
        playHover: playUiHover,
        playClick: playUiClick,
        playBack: playUiBack
    };
};
