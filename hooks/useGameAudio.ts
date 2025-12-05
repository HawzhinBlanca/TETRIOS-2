
import { useCallback } from 'react';
import { AudioEvent, TetrominoType } from '../types';
import { audioManager } from '../utils/audioManager';
import { useGameSettingsStore } from '../stores/gameSettingsStore';

// Helper for haptic feedback
const vibrate = (pattern: number | number[]) => {
    // Only vibrate if enabled in settings
    const enabled = useGameSettingsStore.getState().vibrationEnabled;
    if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

export const useGameAudio = () => {
  const handleAudioEvent = useCallback((event: AudioEvent, val?: number, type?: TetrominoType, extra?: any) => {
    // Normalize x position (0-9) to stereo pan (-1 to 1)
    let pan = 0;
    // Strict finite check to prevent "The provided value is non-finite" error
    if (val !== undefined && typeof val === 'number' && Number.isFinite(val)) {
        // Center is 4.5. 
        pan = (val - 4.5) / 5.0;
        pan = Math.max(-1, Math.min(1, pan));
    }

    // Exhaustive mapping for all AudioEvents
    switch(event) {
        case 'MOVE': 
            // We pass 'val' (which is column X) directly to playMove to determine note pitch
            // If val is not provided, default to center (col 5)
            const col = (typeof val === 'number' && Number.isFinite(val)) ? val : 5;
            audioManager.playMove(col); 
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
            vibrate(20); // Beefed up
            break;
        case 'LOCK': 
            // Lock event sometimes passes type as payload in val, ignore pan for lock if not number
            audioManager.playLock(0, type); 
            vibrate(15);
            break;
        case 'SOFT_LAND': 
            audioManager.playSoftLand(pan); 
            vibrate(5);
            break;
        case 'TSPIN': 
            audioManager.playTSpin(); 
            // Double beat for T-Spin
            vibrate([15, 30, 20]);
            break;
        case 'CLEAR_1': 
            audioManager.playClear(1, extra?.combo, extra?.isB2B); 
            vibrate(30); 
            break;
        case 'CLEAR_2': 
            audioManager.playClear(2, extra?.combo, extra?.isB2B); 
            vibrate([30, 50]); 
            break;
        case 'CLEAR_3': 
            audioManager.playClear(3, extra?.combo, extra?.isB2B); 
            vibrate([30, 30, 50]); 
            break;
        case 'CLEAR_4': 
            audioManager.playClear(4, extra?.combo, extra?.isB2B); 
            // HAPTIC OVERLOAD: The heartbeat of a Tetris
            vibrate([50, 50, 50, 50, 100]); 
            break;
        case 'GAME_OVER': 
            audioManager.playGameOver(); 
            // Long decay vibration
            vibrate([100, 50, 100, 50, 200, 50, 500]);
            break;
        case 'VICTORY': 
            audioManager.playClear(4); 
            vibrate([50, 50, 50, 50, 100, 50, 100, 50, 500]);
            break; 
        case 'FRENZY_START': 
            audioManager.playFrenzyStart(); 
            vibrate([20, 20, 20, 20, 20, 20]); 
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
            vibrate(10);
            break;
        case 'WILDCARD_SPAWN': 
            audioManager.playWildcardSpawn(); 
            vibrate(20);
            break;
        case 'LASER_CLEAR': 
            audioManager.playLaserClear(); 
            vibrate(50);
            break;
        case 'NUKE_CLEAR': 
            audioManager.playNukeClear(); 
            vibrate([100, 50, 100]);
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
            vibrate([20, 50, 20, 50]); 
            break;
        case 'GRAVITY_FLIP_END': 
            audioManager.playFlippedGravityEnd(); 
            vibrate([50, 20]);
            break;
        case 'LEVEL_UP': 
            audioManager.playLevelUp(); 
            vibrate([10, 20, 30, 40]);
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
            audioManager.playUiHover(); 
            break;
        case 'COACH_WARN':
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
            audioManager.playLineClearerActivate(); // Re-use laser sound
            vibrate(40);
            break;
        case 'PERFECT_DROP':
            audioManager.playPerfectDrop(val || 1);
            vibrate(25);
            break;
        case 'TRICK':
            audioManager.playUiSelect();
            vibrate([10, 30, 10]);
            break;
        case 'HEARTBEAT':
            audioManager.playHeartbeat();
            vibrate(10);
            break;
        case 'CHAIN_REACTION':
            audioManager.playChainReaction();
            vibrate([20, 20, 20, 50]); // Stutter vibration
            break;
        case 'OVERDRIVE_START':
            audioManager.playOverdriveStart();
            vibrate([30, 30, 50, 100]);
            break;
        case 'OVERDRIVE_END':
            audioManager.playOverdriveEnd();
            vibrate(20);
            break;
        case 'FUSE_DETONATE':
            audioManager.playFuseDetonate();
            vibrate([50, 50, 100, 100]);
            break;
        case 'FINISHER_READY':
            audioManager.playUiSelect();
            vibrate([50, 20, 50]);
            break;
        default:
            const _exhaustiveCheck: never = event;
            break;
    }
  }, []);

  return { handleAudioEvent };
};
