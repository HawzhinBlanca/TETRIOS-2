
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../components/Settings';
import { useModalStore } from '../stores/modalStore';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

// Mock Stores
jest.mock('../stores/modalStore', () => ({
  useModalStore: jest.fn(),
}));
jest.mock('../stores/gameSettingsStore', () => ({
  useGameSettingsStore: jest.fn(() => ({
    ghostStyle: 'neon',
    setGhostStyle: jest.fn(),
    setDas: jest.fn(),
    setArr: jest.fn(),
    setGameSpeed: jest.fn(),
    setMasterVolume: jest.fn(),
    setMusicVolume: jest.fn(),
    setSfxVolume: jest.fn(),
    setUiVolume: jest.fn(),
  })),
}));
jest.mock('../stores/uiStore', () => ({
  useUiStore: jest.fn(() => ({
    musicEnabled: true,
    setMusicEnabled: jest.fn(),
  })),
}));
jest.mock('../utils/audioManager', () => ({
  audioManager: {
    playUiHover: jest.fn(),
    playUiClick: jest.fn(),
    playUiSelect: jest.fn(),
    playUiBack: jest.fn(),
  }
}));

describe('Settings Component', () => {
  const mockControls = { moveLeft: ['ArrowLeft'] };
  const mockSetKeyBinding = jest.fn();
  const mockResetControls = jest.fn();

  beforeEach(() => {
    (useModalStore as any).mockReturnValue({
      isSettingsOpen: true,
      closeSettings: jest.fn(),
      openProfile: jest.fn(),
    });
  });

  it('renders settings modal when open', () => {
    render(<Settings controls={mockControls as any} setKeyBinding={mockSetKeyBinding} resetControls={mockResetControls} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
  });

  it('renders tabs', () => {
    render(<Settings controls={mockControls as any} setKeyBinding={mockSetKeyBinding} resetControls={mockResetControls} />);
    expect(screen.getByText('Gameplay')).toBeInTheDocument();
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('Visuals')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });

  it('switches tabs', () => {
    render(<Settings controls={mockControls as any} setKeyBinding={mockSetKeyBinding} resetControls={mockResetControls} />);
    const controlsTab = screen.getByText('Controls');
    fireEvent.click(controlsTab);
    expect(screen.getByText('Key Mapping')).toBeInTheDocument();
  });
});
