
import { renderHook, act } from '@testing-library/react-hooks';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { safeStorage } from '../utils/safeStorage';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

describe('gameSettingsStore', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useGameSettingsStore());
    act(() => {
      result.current.setGhostStyle('dashed');
      result.current.setGameSpeed(1.0);
    });
    jest.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useGameSettingsStore());
    expect(result.current.ghostStyle).toBe('dashed');
    expect(result.current.masterVolume).toBe(0.6);
  });

  it('updates settings correctly', () => {
    const { result } = renderHook(() => useGameSettingsStore());
    
    act(() => {
      result.current.setGhostStyle('neon');
      result.current.setMasterVolume(0.8);
    });

    expect(result.current.ghostStyle).toBe('neon');
    expect(result.current.masterVolume).toBe(0.8);
  });

  it('toggles boolean settings', () => {
    const { result } = renderHook(() => useGameSettingsStore());
    const initial = result.current.showAi;
    
    act(() => {
      result.current.toggleShowAi();
    });

    expect(result.current.showAi).toBe(!initial);
  });
});