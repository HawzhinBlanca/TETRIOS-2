
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameOverlayManager } from '../components/GameOverlayManager';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;

// Mock lazy components
jest.mock('../components/MainMenu', () => () => <div data-testid="main-menu">MainMenu</div>);
jest.mock('../components/modals/BoosterSelectionModal', () => ({ BoosterSelectionModal: () => <div>Boosters</div> }));

// Mock Context
jest.mock('../contexts/GameContext', () => ({
  useGameContext: () => ({
    stats: { score: 1000, rows: 10 },
    resetGame: jest.fn(),
    gameMode: 'MARATHON',
  }),
}));
jest.mock('../stores/adventureStore', () => ({
  useAdventureStore: () => ({
    getCurrentLevelConfig: jest.fn(),
  }),
}));
jest.mock('../stores/boosterStore', () => ({
  useBoosterStore: () => ({
    coins: 100,
    ownedBoosters: {},
    activeBoosters: [],
  }),
}));
jest.mock('../utils/audioManager', () => ({ audioManager: { playUiHover: jest.fn(), playUiClick: jest.fn() } }));

describe('GameOverlayManager', () => {
  const mockProps = {
    gameState: 'MENU',
    setGameState: jest.fn(),
    highScore: 5000,
    lastRewards: null,
    openSettings: jest.fn(),
    handleShareScore: jest.fn(),
    mainMenuRef: { current: null },
    gameOverModalRef: { current: null },
    pausedModalRef: { current: null },
  };

  it('renders Main Menu in MENU state', async () => {
    render(<GameOverlayManager {...mockProps as any} gameState="MENU" />);
    expect(await screen.findByTestId('main-menu')).toBeInTheDocument();
  });

  it('renders Victory Screen', () => {
    render(<GameOverlayManager {...mockProps as any} gameState="VICTORY" />);
    expect(screen.getByText('VICTORY')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Score from mock context
  });

  it('renders Paused Screen', () => {
    render(<GameOverlayManager {...mockProps as any} gameState="PAUSED" />);
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
    expect(screen.getByLabelText('Resume Game')).toBeInTheDocument();
  });
});