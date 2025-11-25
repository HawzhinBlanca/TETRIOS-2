
import { renderHook, act } from '@testing-library/react-hooks';
import { useAdventureStore } from '../stores/adventureStore';
import { safeStorage } from '../utils/safeStorage';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

jest.mock('../utils/safeStorage');

describe('adventureStore', () => {
  beforeEach(() => {
    useAdventureStore.getState().resetProgress();
    jest.clearAllMocks();
  });

  it('initializes locked', () => {
    const { result } = renderHook(() => useAdventureStore());
    expect(result.current.unlockedIndex).toBe(0);
  });

  it('unlocks next level', () => {
    const { result } = renderHook(() => useAdventureStore());
    
    act(() => {
      result.current.setCurrentLevel('lvl_1_1'); // Index 0
      result.current.unlockNextLevel();
    });

    expect(result.current.unlockedIndex).toBe(1);
  });

  it('tracks failed attempts', () => {
    const { result } = renderHook(() => useAdventureStore());
    
    act(() => {
      result.current.trackFailedLevel('lvl_1_1');
    });

    expect(result.current.getFailedAttempts('lvl_1_1')).toBe(1);
  });

  it('tracks stars', () => {
    const { result } = renderHook(() => useAdventureStore());
    
    act(() => {
      result.current.setStarsEarned('lvl_1_1', 3);
    });

    expect(result.current.getStarsEarned('lvl_1_1')).toBe(3);
  });
});