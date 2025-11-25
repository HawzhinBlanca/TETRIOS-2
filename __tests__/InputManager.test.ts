
import { InputManager } from '../utils/InputManager';
import { DEFAULT_CONTROLS } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

describe('InputManager', () => {
  let inputManager: InputManager;
  const actionListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    inputManager = new InputManager({
      keyMap: DEFAULT_CONTROLS,
      das: 100,
      arr: 20,
    });
    inputManager.addActionListener(actionListener);
  });

  it('triggers discrete action on key press', () => {
    const event = new KeyboardEvent('keydown', { key: ' ' }); // Space = Hard Drop
    // Simulate window event logic (we need to manually call handleKeyDown if not in browser env or mock window)
    // But InputManager attaches to window. In jsdom environment this works.
    window.dispatchEvent(event);
    
    inputManager.update(16);
    expect(actionListener).toHaveBeenCalledWith('hardDrop');
  });

  it('charges DAS for movement', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(event);
    
    // Initial Move
    inputManager.update(16);
    expect(actionListener).toHaveBeenCalledWith('moveRight');
    actionListener.mockClear();

    // Wait < DAS
    inputManager.update(50);
    expect(actionListener).not.toHaveBeenCalled();

    // Wait > DAS
    inputManager.update(100);
    expect(actionListener).toHaveBeenCalledWith('moveRight');
  });

  it('cleans up on blur', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(event);
    
    window.dispatchEvent(new Event('blur'));
    inputManager.update(200); // Should process nothing
    
    // Only the initial move (1 call) before blur should have happened
    // The updates after blur should trigger nothing
    expect(actionListener).toHaveBeenCalledTimes(1); 
  });
});
