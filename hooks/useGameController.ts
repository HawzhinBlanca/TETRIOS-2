import React, { useCallback, useMemo } from 'react';
import { GameCore } from '../utils/GameCore';
import { GameMode, AdventureLevelConfig, BoosterType, Difficulty, TetrominoType } from '../types';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useEngineStore } from '../stores/engineStore';
import { DEFAULT_DAS, DEFAULT_ARR } from '../constants';
import { LayoutMetrics } from './useResponsiveLayout';

export const useGameController = (
    engine: React.MutableRefObject<GameCore>, 
    layout: LayoutMetrics,
    setSavedGameExists: (exists: boolean) => void
) => {
    
    const resetGame = useCallback((
        startLevel: number = 0, 
        mode: GameMode = 'MARATHON', 
        adventureLevelConfig: AdventureLevelConfig | undefined = undefined, 
        assistRows: number = 0, 
        activeBoosters: BoosterType[] = [],
        difficultySetting: Difficulty = 'MEDIUM'
    ) => {
        const currentSettings = useGameSettingsStore.getState();
        
        engine.current.setGameConfig({ 
            speed: currentSettings.gameSpeed, 
            das: currentSettings.das || DEFAULT_DAS, 
            arr: currentSettings.arr !== undefined ? currentSettings.arr : DEFAULT_ARR
        });
        
        engine.current.resetGame(mode, startLevel, adventureLevelConfig, assistRows, activeBoosters, difficultySetting);
        engine.current.grid = { width: layout.cols, height: layout.rows };
        engine.current.boardManager.initialize(mode, startLevel);
        
        useEngineStore.getState().setGameMode(mode, difficultySetting);
        useBoosterStore.getState().consumeActiveBoosters(); 
        setSavedGameExists(false); 
    }, [engine, layout, setSavedGameExists]);

    const continueGame = useCallback(() => {
        if (engine.current.loadGame()) {
            const loadedMode = engine.current.mode;
            const loadedDiff = engine.current.difficulty;
            
            const currentSettings = useGameSettingsStore.getState();
            engine.current.setInputConfig({ 
                das: currentSettings.das || DEFAULT_DAS, 
                arr: currentSettings.arr !== undefined ? currentSettings.arr : DEFAULT_ARR 
            });
            
            useEngineStore.getState().setGameMode(loadedMode, loadedDiff);
            setSavedGameExists(false); 
        } else {
            setSavedGameExists(false);
        }
    }, [engine, setSavedGameExists]);

    const setGameState = useCallback((newState: any) => engine.current.stateManager.transitionTo(newState), [engine]);
    const setGameConfig = useCallback((config: any) => engine.current.setGameConfig(config), [engine]);

    const touchControls = useMemo(() => ({
        move: (dir: number) => engine.current.handleAction(dir === -1 ? 'moveLeft' : 'moveRight'),
        rotate: (dir: number) => engine.current.handleAction(dir === 1 ? 'rotateCW' : 'rotateCCW'),
        softDrop: () => engine.current.handleAction('softDrop'),
        hardDrop: () => engine.current.handleAction('hardDrop'),
        hold: () => engine.current.handleAction('hold'),
        useLineClearer: (y: number) => engine.current.executeLineClearer(y), 
        triggerBombBooster: () => engine.current.activateBombBoosterSelection(),
        triggerLineClearer: () => engine.current.activateLineClearerSelection(),
    }), [engine]);

    // High Level Actions
    const activateWildcardSelection = () => {
        useEngineStore.setState({ wildcardPieceActive: true });
        setGameState('WILDCARD_SELECTION');
    };

    const chooseWildcardPiece = (type: TetrominoType) => {
        engine.current.chooseWildcardPiece(type);
        useEngineStore.setState({ wildcardPieceActive: false });
        setGameState('PLAYING');
    };

    const triggerBombBoosterSelection = () => engine.current.activateBombBoosterSelection();
    const confirmBombBooster = (s: number, n: number) => engine.current.executeBombBooster(s, n);
    const cancelBombBoosterSelection = () => {
        engine.current.events.emit('BOMB_SELECTION_END');
        setGameState('PLAYING');
    };

    const triggerLineClearerSelection = () => engine.current.activateLineClearerSelection();
    const confirmLineClearer = (r: number) => engine.current.executeLineClearer(r);
    const cancelLineClearerSelection = () => {
        engine.current.events.emit('LINE_SELECTION_END');
        setGameState('PLAYING');
    };

    return {
        resetGame,
        continueGame,
        setGameState,
        setGameConfig,
        touchControls,
        activateWildcardSelection,
        chooseWildcardPiece,
        triggerBombBoosterSelection,
        confirmBombBooster,
        cancelBombBoosterSelection,
        triggerLineClearerSelection,
        confirmLineClearer,
        cancelLineClearerSelection
    };
};