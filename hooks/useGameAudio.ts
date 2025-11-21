
import { useCallback } from 'react';
import { AudioEvent } from '../types';
import { audioManager } from '../utils/audioManager';

// Helper for haptic feedback
const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

export const useGameAudio = () => {
  const handleAudioEvent = useCallback((event: AudioEvent) => {
    switch(event) {
        case 'MOVE': 
            audioManager.playMove(); 
            break; // No vibration on move to avoid fatigue
        case 'ROTATE': 
            audioManager.playRotate(); 
            vibrate(5); // Extremely subtle tick
            break;
        case 'SOFT_DROP': 
            // Audio is handled by loop/interval, usually silent or very quiet
            break;
        case 'HARD_DROP': 
            audioManager.playHardDrop(); 
            vibrate(15); // Crisp impact
            break;
        case 'LOCK': 
            audioManager.playLock(); 
            vibrate(10); // Solid lock feel
            break;
        case 'SOFT_LAND': 
            audioManager.playSoftLand(); 
            vibrate(5); // Subtle thud
            break;
        case 'TSPIN': 
            audioManager.playTSpin(); 
            vibrate([10, 30, 10]); // Distinct double pulse
            break;
        case 'CLEAR_1': 
            audioManager.playClear(1); 
            vibrate(20); 
            break;
        case 'CLEAR_2': 
            audioManager.playClear(2); 
            vibrate(25); 
            break;
        case 'CLEAR_3': 
            audioManager.playClear(3); 
            vibrate(35); 
            break;
        case 'CLEAR_4': 
            audioManager.playClear(4); 
            vibrate([30, 50, 30]); // Heavy clear feel
            break;
        case 'GAME_OVER': 
            audioManager.playGameOver(); 
            vibrate([50, 100, 50, 100]); // Failure pattern
            break;
        case 'VICTORY': 
            audioManager.playClear(4); 
            vibrate([50, 50, 50, 50, 100]); // Celebration pattern
            break; 
        case 'FRENZY_START': 
            audioManager.playFrenzyStart(); 
            vibrate([20, 20, 20, 20]); 
            break;
        case 'FRENZY_END': 
            audioManager.playFrenzyEnd(); 
            break;
        case 'WILDCARD_SPAWN': 
            audioManager.playWildcardSpawn(); 
            vibrate(20);
            break;
        case 'LASER_CLEAR': 
            audioManager.playLaserClear(); 
            vibrate(40);
            break;
        case 'NUKE_CLEAR': 
            audioManager.playNukeClear(); 
            vibrate(100); // Big explosion
            break;
        case 'NUKE_SPAWN': 
            audioManager.playNukeSpawn(); 
            vibrate(20);
            break;
        case 'BOMB_ACTIVATE': 
            audioManager.playBombBoosterActivate(); 
            vibrate(20);
            break;
        case 'LINE_CLEARER_ACTIVATE': 
            audioManager.playLineClearerActivate(); 
            vibrate(20);
            break;
        case 'BLITZ_SPEEDUP': 
            audioManager.playBlitzSpeedUp(); 
            vibrate([10, 10, 10]);
            break;
        case 'GRAVITY_FLIP_START': 
            audioManager.playFlippedGravityActivate(); 
            vibrate([20, 50]); 
            break;
        case 'GRAVITY_FLIP_END': 
            audioManager.playFlippedGravityEnd(); 
            vibrate([50, 20]);
            break;
        case 'LEVEL_UP': 
            audioManager.playLevelUp(); 
            vibrate([10, 20, 30]);
            break;
        case 'UI_HOVER': 
            audioManager.playUiHover(); 
            // No vibration on hover for web
            break;
        case 'UI_CLICK': 
            audioManager.playUiClick(); 
            vibrate(5); // Light click
            break;
        case 'UI_SELECT': 
            audioManager.playUiSelect(); 
            vibrate(8); 
            break;
        case 'UI_BACK': 
            audioManager.playUiBack(); 
            vibrate(5);
            break;
    }
  }, []);

  return { handleAudioEvent };
};
