
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Display from '../components/Display';
import Cell from '../components/Cell';
import MainMenu from '../components/MainMenu';
import StatsPanel from '../components/StatsPanel';
import Preview from '../components/Preview';
import Modal from '../components/ui/Modal';
import { MODIFIER_COLORS } from '../constants';
import { GameStats } from '../types';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeAll: any;
declare var afterEach: any;

// --- TEST SETUP & MOCKS ---

// Mock Audio Manager to prevent errors during interactions
jest.mock('../utils/audioManager', () => ({
  audioManager: {
    playUiHover: jest.fn(),
    playUiClick: jest.fn(),
    playUiSelect: jest.fn(),
    playUiBack: jest.fn(),
    init: jest.fn(),
  }
}));

// Mock Profile Store to provide high scores
jest.mock('../stores/profileStore', () => ({
  useProfileStore: jest.fn(() => ({
    stats: { 
      highScores: { MARATHON: 5000 }, 
      highScore: 5000, 
      totalGamesPlayed: 10 
    }
  }))
}));

// Mock Canvas getContext for components that use canvas (like Preview/Particles if they were included, or internal logic)
beforeAll(() => {
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    rect: jest.fn(),
    arc: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    setLineDash: jest.fn(),
  }));
});

describe('Display Component', () => {
  afterEach(cleanup);

  it('renders label and text correctly', () => {
    render(<Display label="Score" text="1000" />);
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('renders progress bar correctly', () => {
    render(<Display label="Level" text="5" progress={0.5} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-label', 'Level progress');
  });
});

describe('Cell Component', () => {
  afterEach(cleanup);

  it('renders empty cell correctly', () => {
    const { container } = render(<Cell type={0} />);
    const cellDiv = container.firstChild as HTMLElement;
    expect(cellDiv).toHaveStyle('border: 1px solid rgba(255,255,255,0.03)');
  });

  it('renders active tetromino correctly', () => {
    const { container } = render(<Cell type="I" />);
    const cellDiv = container.firstChild as HTMLElement;
    expect(cellDiv.style.boxShadow).toContain('rgb(6, 182, 212)');
  });

  it('renders ghost piece correctly', () => {
    const { container } = render(<Cell type="T" isGhost={true} ghostStyle="dashed" />);
    const cellDiv = container.firstChild as HTMLElement;
    expect(cellDiv.style.border).toContain('dashed');
  });

  it('renders modifiers correctly', () => {
    const { getByText, container } = render(<Cell type={0} modifier={{ type: 'GEM' }} />);
    expect(getByText('💎')).toBeInTheDocument();
    const cellDiv = container.firstChild as HTMLElement;
    expect(cellDiv.style.borderColor).toBe(MODIFIER_COLORS.GEM);
  });
});

describe('MainMenu Component', () => {
  afterEach(cleanup);

  it('renders title and high score', () => {
    render(<MainMenu onStart={jest.fn()} />);
    expect(screen.getByText('TETRIOS')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });

  it('triggers onStart when Initialize is clicked', () => {
    const onStart = jest.fn();
    render(<MainMenu onStart={onStart} />);
    const button = screen.getByLabelText('Initialize Game');
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalled();
  });

  it('allows mode switching', () => {
    render(<MainMenu onStart={jest.fn()} />);
    const blitzButton = screen.getByLabelText('Start Blitz mode');
    fireEvent.click(blitzButton);
    expect(screen.getByText('Blitz')).toBeInTheDocument();
  });
});

describe('StatsPanel Component', () => {
  afterEach(cleanup);

  const mockStats: GameStats = {
    score: 1234, rows: 10, level: 1, time: 60,
    movesTaken: 0, gemsCollected: 0, bombsDefused: 0, 
    tetrisesAchieved: 0, combosAchieved: 0,
    focusGauge: 0, isZoneActive: false, zoneTimer: 0, zoneLines: 0
  };

  it('renders score correctly in Marathon', () => {
    render(<StatsPanel gameStats={mockStats} gameMode="MARATHON" />);
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('Current Level')).toBeInTheDocument();
  });

  it('renders time correctly in Sprint', () => {
    render(<StatsPanel gameStats={mockStats} gameMode="SPRINT" />);
    expect(screen.getByText('Time Elapsed')).toBeInTheDocument();
    // 60 seconds = 1:00.0
    expect(screen.getByText('1:00.0')).toBeInTheDocument();
  });
});

describe('Preview Component', () => {
  afterEach(cleanup);

  it('renders component with title', () => {
    render(<Preview title="Next" type="T" />);
    expect(screen.getByText('NEXT')).toBeInTheDocument();
  });

  it('renders Wildcard question mark', () => {
    render(<Preview title="Mystery" type="WILDCARD_SHAPE" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('Modal Component', () => {
  afterEach(cleanup);

  it('renders children content', () => {
    render(<Modal><div>Test Content</div></Modal>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Modal onClose={onClose} showCloseButton={true}><div>Content</div></Modal>);
    const closeBtn = screen.getByLabelText('Close Modal');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});