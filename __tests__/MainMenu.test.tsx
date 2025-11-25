
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainMenu from '../components/MainMenu';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

// Mock audio manager
jest.mock('../utils/audioManager', () => ({
  audioManager: {
    playUiHover: jest.fn(),
    playUiClick: jest.fn(),
    playUiSelect: jest.fn(),
  }
}));

// Mock Profile Store
jest.mock('../stores/profileStore', () => ({
  useProfileStore: jest.fn(() => ({
    stats: { 
      highScores: { MARATHON: 5000 }, 
      highScore: 5000, 
      totalGamesPlayed: 10 
    }
  }))
}));

describe('MainMenu', () => {
  const onStartMock = jest.fn();

  beforeEach(() => {
    onStartMock.mockClear();
  });

  it('renders default view with Title', () => {
    render(<MainMenu onStart={onStartMock} />);
    expect(screen.getByText('TETRIOS')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Marathon mode')).toBeInTheDocument();
  });

  it('selects game mode', () => {
    render(<MainMenu onStart={onStartMock} />);
    const blitzButton = screen.getByLabelText('Start Blitz mode');
    
    fireEvent.click(blitzButton);
    // Check visual feedback or state change representation if possible, 
    // or check if onStart is called with correct mode later
    // Here we verify the description changed
    expect(screen.getByText('Fast-paced action! Clear for points as the game gets faster over 2 minutes.')).toBeInTheDocument();
  });

  it('triggers game start on button click', () => {
    render(<MainMenu onStart={onStartMock} />);
    const startBtn = screen.getByLabelText('Initialize Game');
    fireEvent.click(startBtn);
    expect(onStartMock).toHaveBeenCalledWith(0, 'MARATHON', 'MEDIUM'); // Default args
  });

  it('allows level selection', () => {
    render(<MainMenu onStart={onStartMock} />);
    // Find level 5 button (Assuming logic or specific test setup, but based on component logic +1 increments)
    // Actually the component uses +1/-1. Let's click next 5 times.
    const nextLvl = screen.getByLabelText('Increase Level');
    fireEvent.click(nextLvl);
    fireEvent.click(nextLvl);
    fireEvent.click(nextLvl);
    fireEvent.click(nextLvl);
    fireEvent.click(nextLvl);
    
    const startBtn = screen.getByLabelText('Initialize Game');
    fireEvent.click(startBtn);
    
    expect(onStartMock).toHaveBeenCalledWith(5, 'MARATHON', 'MEDIUM');
  });
});