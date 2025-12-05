import React, { useRef, useEffect } from 'react';
import { GameCore } from '../utils/GameCore';
import { createAiWorker } from '../utils/aiWorker';
import { TETROMINOS, KICKS } from '../constants';
import { useEngineStore } from '../stores/engineStore';
import { LayoutMetrics } from './useResponsiveLayout';

export const useAiAssistant = (engine: React.MutableRefObject<GameCore>, layout: LayoutMetrics) => {
    const aiWorker = useRef<Worker | null>(null);
    const turnId = useRef<number>(0);
    
    // Subscribe to specific store changes that should trigger AI updates
    const nextQueue = useEngineStore(state => state.nextQueue);
    const pieceIsGrounded = useEngineStore(state => state.pieceIsGrounded);
    const heldPiece = useEngineStore(state => state.heldPiece);

    useEffect(() => {
        const worker = createAiWorker();
        if (worker) {
            aiWorker.current = worker;
            aiWorker.current.postMessage({ type: 'INIT', payload: { STAGE_WIDTH: layout.cols, STAGE_HEIGHT: layout.rows, TETROMINOS, KICKS }});
            aiWorker.current.onmessage = (e: MessageEvent) => {
                if (e.data && e.data.id === turnId.current) {
                    useEngineStore.setState({ aiHint: e.data.result });
                }
            };
        }
        
        return () => { 
            aiWorker.current?.terminate(); 
        };
    }, [layout.cols, layout.rows]);

    useEffect(() => {
        if(aiWorker.current && engine.current && engine.current.pieceManager.player.tetromino.type) {
            turnId.current++; 
            aiWorker.current.postMessage({
                id: turnId.current,
                stage: engine.current.boardManager.stage, 
                type: engine.current.pieceManager.player.tetromino.type,
                rotationState: engine.current.pieceManager.rotationState,
                flippedGravity: engine.current.flippedGravity, 
            });
        }
    }, [nextQueue, pieceIsGrounded, heldPiece, engine]); // Dependencies that signify a new turn/state
};