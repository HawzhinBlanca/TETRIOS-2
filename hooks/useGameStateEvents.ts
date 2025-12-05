import React, { useEffect } from 'react';
import { GameCore } from '../utils/GameCore';
import { useEngineStore } from '../stores/engineStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useProfileStore } from '../stores/profileStore';

export const useGameStateEvents = (
    engine: React.MutableRefObject<GameCore>, 
    setSavedGameExists: (exists: boolean) => void
) => {
    const { trackFailedLevel, clearFailedAttempts, setStarsEarned } = useAdventureStore();
    const { addCoins, applyLevelRewards, resetActiveBoosters } = useBoosterStore();
    const { updateStats } = useProfileStore();

    useEffect(() => {
        if (!engine.current) return;

        const onStateChange = ({ newState }: { newState: any }) => {
            useEngineStore.setState({ gameState: newState });
        };

        const onGameOver = ({ state, levelId, rewards }: any) => {
            if (state === 'GAMEOVER' && levelId) {
                trackFailedLevel(levelId); 
            } else if (state === 'VICTORY' && levelId && rewards) {
                clearFailedAttempts(levelId); 
                setStarsEarned(levelId, rewards.stars); 
                applyLevelRewards(rewards, engine.current.adventureManager.config || undefined);
            } else if ((state === 'GAMEOVER' || state === 'VICTORY') && rewards) { 
                addCoins(rewards.coins); 
            }
            
            if (state === 'GAMEOVER' || state === 'VICTORY') {
               updateStats(
                   { 
                       score: engine.current.scoreManager.stats.score, 
                       rows: engine.current.scoreManager.stats.rows, 
                       level: engine.current.scoreManager.stats.level,
                       time: engine.current.scoreManager.stats.time 
                   },
                   engine.current.mode,
                   engine.current.difficulty
               );
               setSavedGameExists(false); 
            }
            resetActiveBoosters(); 
        };

        engine.current.events.on('STATE_CHANGE', onStateChange);
        engine.current.events.on('GAME_OVER', onGameOver);

        return () => {
            engine.current.events.off('STATE_CHANGE', onStateChange);
            engine.current.events.off('GAME_OVER', onGameOver);
        };
    }, [engine, setSavedGameExists, trackFailedLevel, clearFailedAttempts, setStarsEarned, addCoins, applyLevelRewards, updateStats, resetActiveBoosters]);
};