import { useCallback } from 'react';
import { AudioEvent } from '../types';
import { audioManager } from '../utils/audioManager';

export const useGameAudio = () => {
  const handleAudioEvent = useCallback((event: AudioEvent) => {
    switch(event) {
        case 'MOVE': audioManager.playMove(); break;
        case 'ROTATE': audioManager.playRotate(); break;
        case 'SOFT_DROP': break;
        case 'HARD_DROP': audioManager.playHardDrop(); break;
        case 'LOCK': audioManager.playLock(); break;
        case 'SOFT_LAND': audioManager.playSoftLand(); break;
        case 'TSPIN': audioManager.playTSpin(); break;
        case 'CLEAR_1': audioManager.playClear(1); break;
        case 'CLEAR_2': audioManager.playClear(2); break;
        case 'CLEAR_3': audioManager.playClear(3); break;
        case 'CLEAR_4': audioManager.playClear(4); break;
        case 'GAME_OVER': audioManager.playGameOver(); break;
        case 'VICTORY': audioManager.playClear(4); break; 
        case 'FRENZY_START': audioManager.playFrenzyStart(); break;
        case 'FRENZY_END': audioManager.playFrenzyEnd(); break;
        case 'WILDCARD_SPAWN': audioManager.playWildcardSpawn(); break;
        case 'LASER_CLEAR': audioManager.playLaserClear(); break;
        case 'NUKE_CLEAR': audioManager.playNukeClear(); break;
        case 'NUKE_SPAWN': audioManager.playNukeSpawn(); break;
        case 'BOMB_ACTIVATE': audioManager.playBombBoosterActivate(); break;
        case 'LINE_CLEARER_ACTIVATE': audioManager.playLineClearerActivate(); break;
        case 'BLITZ_SPEEDUP': audioManager.playBlitzSpeedUp(); break;
        case 'GRAVITY_FLIP_START': audioManager.playFlippedGravityActivate(); break;
        case 'GRAVITY_FLIP_END': audioManager.playFlippedGravityEnd(); break;
        case 'LEVEL_UP': audioManager.playLevelUp(); break;
        case 'UI_HOVER': audioManager.playUiHover(); break;
        case 'UI_CLICK': audioManager.playUiClick(); break;
        case 'UI_SELECT': audioManager.playUiSelect(); break;
        case 'UI_BACK': audioManager.playUiBack(); break;
    }
  }, []);

  return { handleAudioEvent };
};