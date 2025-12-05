
import { GameState, GameEffect, TickResult } from '../types/internal';
import { checkCollision, getGhostY, isTSpin, getWallKicks } from './collision';
import { rotateMatrix, generateBag } from '../utils/gameUtils';
import { TETROMINOS } from '../constants';
import { calculateScore } from '../utils/scoreRules';
import { TetrominoType, Board, Player } from '../types';

interface GridDims {
    width: number;
    height: number;
}

export const createInitialState = (rng: any, piecePool?: TetrominoType[], gridSize: GridDims = { width: 10, height: 24 }): GameState => ({
    board: Array.from({ length: gridSize.height }, () => Array(gridSize.width).fill([null, 'clear'])),
    boardRevision: 0,
    player: {
        pos: { x: Math.floor(gridSize.width / 2) - 2, y: 0 },
        tetromino: TETROMINOS[piecePool ? piecePool[0] : 'I'], 
        collided: false,
        trail: []
    },
    queue: generateBag(rng, piecePool),
    hold: { piece: null, canHold: true, charge: 0, entryTime: 0 },
    piecePool: piecePool,
    rngState: rng.state,
    score: 0,
    lines: 0,
    level: 0,
    combo: -1,
    backToBack: false,
    gravity: { speed: 1000, dropTimer: 0, lockTimer: 0 },
    flags: { isGrounded: false, isLocking: false, isPaused: false, isGameOver: false, isZone: false },
    aiHint: null
});

// --- Helpers ---

const createSpawningPlayer = (type: TetrominoType, board: Board, flipped: boolean): Player => {
    const tetromino = TETROMINOS[type];
    const boardHeight = board.length;
    const boardWidth = board[0].length;
    
    const startY = flipped ? boardHeight - tetromino.shape.length : 0;
    const startX = Math.floor(boardWidth / 2) - Math.floor(tetromino.shape[0].length / 2);

    const player: Player = {
        pos: { x: startX, y: startY },
        tetromino: tetromino,
        collided: false,
        trail: [],
        ghostY: 0
    };
    
    player.ghostY = getGhostY(player, board, flipped);
    return player;
};

// --- Actions ---

export const movePiece = (state: GameState, dir: number, flipped: boolean): TickResult => {
    if (state.flags.isLocking || state.flags.isPaused || state.flags.isGameOver) return { state, effects: [] };

    if (!checkCollision(state.player, state.board, dir, 0, flipped)) {
        const newPos = { ...state.player.pos, x: state.player.pos.x + dir };
        const ghostY = getGhostY({ ...state.player, pos: newPos }, state.board, flipped);
        
        return {
            state: { 
                ...state, 
                player: { ...state.player, pos: newPos, ghostY } 
            },
            effects: [{ type: 'AUDIO', event: 'MOVE', payload: newPos.x }]
        };
    }
    return { state, effects: [] };
};

export const rotatePiece = (state: GameState, dir: number, flipped: boolean): TickResult => {
    if (state.flags.isLocking || state.flags.isPaused || state.flags.isGameOver) return { state, effects: [] };

    const { tetromino } = state.player;
    const rotatedShape = rotateMatrix(tetromino.shape, dir);
    
    const testPlayer = { 
        ...state.player, 
        tetromino: { ...tetromino, shape: rotatedShape } 
    };

    const kicks = getWallKicks(tetromino.type, 0, dir); 

    for (const [kx, ky] of kicks) {
        const offsetY = flipped ? -ky : ky;
        if (!checkCollision(testPlayer, state.board, kx, offsetY, flipped)) {
            const newPos = { x: state.player.pos.x + kx, y: state.player.pos.y + offsetY };
            const newPlayer = {
                ...state.player,
                tetromino: { ...tetromino, shape: rotatedShape },
                pos: newPos
            };
            
            newPlayer.ghostY = getGhostY(newPlayer, state.board, flipped);

            return {
                state: {
                    ...state,
                    player: newPlayer
                },
                effects: [{ type: 'AUDIO', event: 'ROTATE' }]
            };
        }
    }
    return { state, effects: [] };
};

export const holdPiece = (state: GameState, flipped: boolean, rng: any): TickResult => {
    if (!state.hold.canHold || state.flags.isLocking || state.flags.isPaused || state.flags.isGameOver) {
        return { state, effects: [] };
    }

    const currentType = state.player.tetromino.type;
    const heldType = state.hold.piece;
    let newQueue = [...state.queue];
    let nextType: TetrominoType;

    // Logic: If hold empty, take from queue. If hold exists, swap.
    if (heldType === null) {
        if (newQueue.length < 7) {
            newQueue = [...newQueue, ...generateBag(rng, state.piecePool)];
        }
        nextType = newQueue.shift()!;
    } else {
        nextType = heldType;
    }

    const newPlayer = createSpawningPlayer(nextType, state.board, flipped);
    
    let isGameOver = false;
    if (checkCollision(newPlayer, state.board, 0, 0, flipped)) {
        isGameOver = true;
    }

    const newState = {
        ...state,
        player: newPlayer,
        queue: newQueue,
        hold: {
            piece: currentType,
            canHold: false,
            charge: state.hold.charge,
            entryTime: Date.now()
        },
        flags: { ...state.flags, isGrounded: false, isLocking: false, isGameOver },
        rngState: rng.state
    };

    return {
        state: newState,
        effects: [
            { type: 'AUDIO', event: 'UI_SELECT' },
            { type: 'UI', event: 'HOLD_CHANGE', payload: { piece: currentType, canHold: false } }
        ]
    };
};

export const hardDrop = (state: GameState, flipped: boolean, rng: any): TickResult => {
    if (state.flags.isPaused || state.flags.isGameOver) return { state, effects: [] };

    const ghostY = state.player.ghostY !== undefined 
        ? state.player.ghostY 
        : getGhostY(state.player, state.board, flipped);
        
    const distance = Math.abs(ghostY - state.player.pos.y);
    
    const droppedState = {
        ...state,
        player: { ...state.player, pos: { ...state.player.pos, y: ghostY } },
        score: state.score + (distance * 2)
    };

    // Immediate lock
    return lockPiece(droppedState, flipped, rng);
};

export const softDrop = (state: GameState, flipped: boolean): TickResult => {
    if (state.flags.isPaused || state.flags.isGameOver) return { state, effects: [] };
    const dy = flipped ? -1 : 1;
    if (!checkCollision(state.player, state.board, 0, dy, flipped)) {
        return {
            state: {
                ...state,
                player: { ...state.player, pos: { ...state.player.pos, y: state.player.pos.y + dy } },
                score: state.score + 1
            },
            effects: []
        };
    }
    return { state, effects: [] };
};

// --- Internals ---

const writePieceToBoard = (board: Board, player: Player): Board => {
    const newBoard = board.map(row => [...row]);
    const { pos, tetromino } = player;
    const height = board.length;
    const width = board[0].length;

    tetromino.shape.forEach((row, y) => {
        row.forEach((val, x) => {
            if (val !== 0) {
                const by = pos.y + y;
                const bx = pos.x + x;
                if (by >= 0 && by < height && bx >= 0 && bx < width) {
                    newBoard[by][bx] = [tetromino.type, 'merged'];
                }
            }
        });
    });
    return newBoard;
};

const clearFullRows = (board: Board, flipped: boolean) => {
    const height = board.length;
    const width = board[0].length;
    const clearedIndices: number[] = [];

    for (let y = 0; y < height; y++) {
        if (board[y].every(cell => cell[1] !== 'clear' && cell[1] !== 'zoned')) {
            clearedIndices.push(y);
        }
    }

    if (clearedIndices.length === 0) {
        return { board, linesCleared: 0, clearedIndices: [] };
    }

    const remainingRows = board.filter((_, i) => !clearedIndices.includes(i));
    const emptyRows = Array.from({ length: clearedIndices.length }, () => 
        Array(width).fill([null, 'clear'])
    );

    const newBoard = flipped 
        ? [...remainingRows, ...emptyRows] 
        : [...emptyRows, ...remainingRows];

    return { 
        board: newBoard as Board, 
        linesCleared: clearedIndices.length, 
        clearedIndices 
    };
};

const lockPiece = (state: GameState, flipped: boolean, rng: any): TickResult => {
    const effects: GameEffect[] = [];
    
    const tSpinDetected = isTSpin(state.player, state.board, flipped);
    let currentBoard = writePieceToBoard(state.board, state.player);

    effects.push({ type: 'AUDIO', event: 'LOCK', payload: state.player.tetromino.type });
    effects.push({ type: 'VISUAL', event: 'SHAKE', payload: 'soft' });

    const { board: finalBoard, linesCleared, clearedIndices } = clearFullRows(currentBoard, flipped);

    let newState = { ...state, board: finalBoard, boardRevision: state.boardRevision + 1 };

    if (linesCleared > 0) {
        const scoreRes = calculateScore(linesCleared, state.level, tSpinDetected, state.backToBack, state.combo + 1);
        
        newState = {
            ...newState,
            lines: state.lines + linesCleared,
            score: state.score + scoreRes.score,
            combo: state.combo + 1,
            backToBack: scoreRes.isBackToBack,
            level: Math.floor((state.lines + linesCleared) / 10)
        };

        effects.push({ type: 'AUDIO', event: linesCleared >= 4 ? 'CLEAR_4' : 'CLEAR_1' });
        
        effects.push({ 
            type: 'VISUAL', 
            event: 'ROW_CLEAR', 
            payload: { 
                rows: clearedIndices,
                linesCleared,
                isTSpin: tSpinDetected,
                isBackToBack: scoreRes.isBackToBack,
                combo: state.combo + 1,
                text: scoreRes.text,
                scoreDelta: scoreRes.score,
                isOnBeat: false
            } 
        });
        
        // Let event handlers update score logic separately or via lock payload
        effects.push({ 
            type: 'LOCK', 
            payload: { 
                linesCleared, 
                isTSpin: tSpinDetected, 
                isBackToBack: scoreRes.isBackToBack, 
                combo: newState.combo,
                text: scoreRes.text
            } 
        });
    } else {
        newState.combo = -1;
    }

    return spawnPiece(newState, flipped, rng, effects);
};

export const spawnPiece = (state: GameState, flipped: boolean, rng: any, effects: GameEffect[]): TickResult => {
    let queue = [...state.queue];
    if (queue.length < 7) {
        queue = [...queue, ...generateBag(rng, state.piecePool)];
    }
    const nextType = queue.shift()!;
    
    const newPlayer = createSpawningPlayer(nextType, state.board, flipped);

    let isGameOver = false;
    if (checkCollision(newPlayer, state.board, 0, 0, flipped)) {
        isGameOver = true;
    }

    const newState = {
        ...state,
        player: newPlayer,
        queue: queue,
        hold: { ...state.hold, canHold: true },
        flags: { ...state.flags, isGrounded: false, isLocking: false, isGameOver },
        rngState: rng.state
    };

    if (newState.flags.isGameOver) {
        return {
            state: newState,
            effects: [
                ...effects, 
                { type: 'AUDIO', event: 'GAME_OVER' },
                { type: 'GAME_OVER' } 
            ]
        };
    }

    return { state: newState, effects };
};

export const gameTick = (state: GameState, dt: number, flipped: boolean, rng: any): TickResult => {
    if (state.flags.isPaused || state.flags.isGameOver) return { state, effects: [] };

    let newState = { ...state };
    
    newState.gravity.dropTimer += dt;
    if (newState.gravity.dropTimer > newState.gravity.speed) {
        const dy = flipped ? -1 : 1;
        if (!checkCollision(newState.player, newState.board, 0, dy, flipped)) {
            newState.player.pos.y += dy;
            newState.flags.isGrounded = false;
        } else {
            newState.flags.isGrounded = true;
        }
        newState.gravity.dropTimer = 0;
    }

    if (newState.flags.isGrounded) {
        newState.gravity.lockTimer += dt;
        if (newState.gravity.lockTimer > 500) {
            return lockPiece(newState, flipped, rng);
        }
    } else {
        newState.gravity.lockTimer = 0;
    }

    // Re-calculate ghost if anything moved
    const moved = state.player.pos.x !== newState.player.pos.x || state.player.pos.y !== newState.player.pos.y || state.boardRevision !== newState.boardRevision;
    
    if (moved || state.player.ghostY === undefined) {
        newState.player.ghostY = getGhostY(newState.player, newState.board, flipped);
    } else {
        newState.player.ghostY = state.player.ghostY;
    }

    return { state: newState, effects: [] };
};
