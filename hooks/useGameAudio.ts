

import { useCallback } from 'react';
import { AudioEvent, TetrominoType } from '../types';
import { audioManager } from '../utils/audioManager';

// Helper for haptic feedback
const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

export const useGameAudio = () => {
  const handleAudioEvent = useCallback((event: AudioEvent, val?: number, type?: TetrominoType) => {
    // Normalize x position (0-9) to stereo pan (-1 to 1)
    let pan = 0;
    if (val !== undefined) {
        // Center is 4.5. 
        pan = (val - 4.5) / 5.0;
        pan = Math.max(-1, Math.min(1, pan));
    }

    // Exhaustive mapping for all AudioEvents
    switch(event) {
        case 'MOVE': 
            audioManager.playMove(pan); 
            break;
        case 'ROTATE': 
            audioManager.playRotate(pan); 
            vibrate(5);
            break;
        case 'SOFT_DROP': 
            // Intentional silence for soft drop, but keep case for exhaustiveness
            break;
        case 'HARD_DROP': 
            audioManager.playHardDrop(pan); 
            vibrate(15);
            break;
        case 'LOCK': 
            audioManager.playLock(pan, type); 
            vibrate(10);
            break;
        case 'SOFT_LAND': 
            audioManager.playSoftLand(pan); 
            vibrate(5);
            break;
        case 'TSPIN': 
            audioManager.playTSpin(); 
            vibrate([10, 30, 10]);
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
            vibrate([30, 50, 30]);
            break;
        case 'GAME_OVER': 
            audioManager.playGameOver(); 
            vibrate([50, 100, 50, 100]);
            break;
        case 'VICTORY': 
            audioManager.playClear(4); 
            vibrate([50, 50, 50, 50, 100]);
            break; 
        case 'FRENZY_START': 
            audioManager.playFrenzyStart(); 
            vibrate([20, 20, 20, 20]); 
            break;
        case 'FRENZY_END': 
            audioManager.playFrenzyEnd(); 
            break;
        case 'ZONE_START':
            audioManager.playZoneStart();
            vibrate([10, 50, 10]);
            break;
        case 'ZONE_END':
            audioManager.playZoneEnd();
            break;
        case 'ZONE_CLEAR':
            audioManager.playZoneClear();
            vibrate(5);
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
            vibrate(100);
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
            break;
        case 'UI_CLICK': 
            audioManager.playUiClick(); 
            vibrate(5);
            break;
        case 'UI_SELECT': 
            audioManager.playUiSelect(); 
            vibrate(8); 
            break;
        case 'UI_BACK': 
            audioManager.playUiBack(); 
            vibrate(5);
            break;
        case 'BOSS_DAMAGE':
            audioManager.playHardDrop(0); 
            vibrate(15);
            break;
        case 'COUNTDOWN':
            audioManager.playCountdown();
            break;
        case 'REWIND':
            // GameCore usually plays the sound too, but we ensure UI feedback here
            audioManager.playUiHover(); 
            break;
        case 'COACH_WARN':
            // Subtle warning sound for missed opportunity
            audioManager.playUiBack(); 
            break;
        case 'ACHIEVEMENT_UNLOCK':
            audioManager.playUiSelect();
            vibrate([10, 50, 10]);
            break;
        case 'FINESSE_FAULT':
            audioManager.playUiBack(); 
            vibrate([50, 50]);
            break;
        case 'RHYTHM_CLEAR':
            audioManager.playUiSelect();
            vibrate(10);
            break;
        case 'ABILITY_READY':
            audioManager.playUiSelect();
            break;
        case 'ABILITY_ACTIVATE':
            audioManager.playLineClearerActivate();
            vibrate(20);
            break;
        default:
            const _exhaustiveCheck: never = event;
            break;
    }
  }, []);

  return { handleAudioEvent };
};
