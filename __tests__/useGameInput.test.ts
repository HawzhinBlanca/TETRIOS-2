
import { renderHook, act } from '@testing-library/react-hooks';
import { useGameInput } from '../hooks/useGameInput';
import { useInputStore } from '../stores/inputStore';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

describe('useGameInput', () => {
  beforeEach(() => {
    useInputStore.getState().resetControls();
  });

  it('loads default controls', () => {
    const { result } = renderHook(() => useGameInput());
    expect(result.current.controls.moveLeft).toContain('ArrowLeft');
  });

  it('updates key binding', () => {
    const { result } = renderHook(() => useGameInput());
    
    act(() => {
      result.current.setKeyBinding('moveLeft', 'q', 0);
    });

    expect(result.current.controls.moveLeft[0]).toBe('q');
  });

  it('clears binding on Backspace', () => {
    const { result } = renderHook(() => useGameInput());
    
    // Initial state: moveLeft has multiple keys by default
    const initialCount = result.current.controls.moveLeft.length;
    
    act(() => {
      result.current.setKeyBinding('moveLeft', 'Backspace', 0);
    });

    expect(result.current.controls.moveLeft.length).toBe(initialCount - 1);
  });

  it('unbinds key from other actions if claimed', () => {
    const { result } = renderHook(() => useGameInput());
    
    // 'z' is normally rotateCCW. Let's bind it to moveLeft
    act(() => {
      result.current.setKeyBinding('moveLeft', 'z', 0);
    });

    expect(result.current.controls.moveLeft[0]).toBe('z');
    expect(result.current.controls.rotateCCW).not.toContain('z');
  });
});
