
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsPanel from '../components/StatsPanel';
import { GameStats } from '../types';

declare var describe: any;
declare var it: any;
declare var expect: any;

const mockStats: GameStats = {
  score: 5000,
  rows: 42,
  level: 4,
  time: 120.5,
  movesTaken: 100,
  gemsCollected: 3,
  bombsDefused: 1,
  tetrisesAchieved: 2,
  combosAchieved: 5,
  currentB2BChain: 0,
  maxB2BChain: 0,
  b2bMultiplier: 1,
  isFrenzyActive: false,
  frenzyTimer: 0,
  slowTimeActive: false,
  slowTimeTimer: 0,
  wildcardAvailable: false,
  bombBoosterReady: false,
  lineClearerActive: false,
  flippedGravityActive: false,
  flippedGravityTimer: 0,
  focusGauge: 0,
  isZoneActive: false,
  zoneTimer: 0,
  zoneLines: 0,
  momentum: 0,
  isOverdriveActive: false,
  overdriveTimer: 0,
};

describe('StatsPanel', () => {
  it('renders standard Marathon stats', () => {
    render(<StatsPanel gameStats={mockStats} gameMode="MARATHON" />);
    expect(screen.getByText('5,000')).toBeInTheDocument(); // Score
    expect(screen.getByText('42')).toBeInTheDocument();   // Lines
    expect(screen.getByText('4')).toBeInTheDocument();    // Level
  });

  it('renders time formatted for Sprint mode', () => {
    render(<StatsPanel gameStats={mockStats} gameMode="SPRINT" />);
    // 120.5 seconds -> 2:00.5
    expect(screen.getByText('2:00.5')).toBeInTheDocument();
  });

  it('displays Adventure objective progress', () => {
    const config: any = {
        objective: { type: 'GEMS', target: 5 },
        constraints: { movesLimit: 50 }
    };
    render(<StatsPanel gameStats={mockStats} gameMode="ADVENTURE" adventureLevelConfig={config} />);
    expect(screen.getByText('GEMS')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument(); // 3 collected / 5 target
  });

  it('shows Frenzy Bar when active', () => {
    const frenzyStats = { ...mockStats, isFrenzyActive: true, frenzyTimer: 4000 };
    render(<StatsPanel gameStats={frenzyStats} gameMode="MARATHON" />);
    expect(screen.getByText('FRENZY')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 4000 / 8000ms
  });
});
