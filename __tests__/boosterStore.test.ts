
import { renderHook, act } from '@testing-library/react-hooks';
import { useBoosterStore } from '../stores/boosterStore';
import { DEFAULT_COINS } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

describe('boosterStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useBoosterStore());
    act(() => {
        // Reset to default state manually if needed
    });
  });

  it('adds coins', () => {
    const { result } = renderHook(() => useBoosterStore());
    const initial = result.current.coins;
    
    act(() => {
      result.current.addCoins(100);
    });

    expect(result.current.coins).toBe(initial + 100);
  });

  it('spends coins successfully', () => {
    const { result } = renderHook(() => useBoosterStore());
    act(() => { result.current.addCoins(500); }); // Ensure funds
    
    let success = false;
    act(() => {
      success = result.current.spendCoins(100);
    });

    expect(success).toBe(true);
  });

  it('fails to spend insufficient coins', () => {
    const { result } = renderHook(() => useBoosterStore());
    // Drain coins
    act(() => { result.current.spendCoins(result.current.coins); });
    
    let success = false;
    act(() => {
      success = result.current.spendCoins(100);
    });

    expect(success).toBe(false);
  });

  it('manages boosters inventory', () => {
    const { result } = renderHook(() => useBoosterStore());
    
    act(() => {
      result.current.addBooster('BOMB_BOOSTER', 1);
    });
    
    expect(result.current.ownedBoosters['BOMB_BOOSTER']).toBeGreaterThanOrEqual(1);
    
    act(() => {
      result.current.toggleActiveBooster('BOMB_BOOSTER');
    });
    
    expect(result.current.activeBoosters).toContain('BOMB_BOOSTER');
  });
});