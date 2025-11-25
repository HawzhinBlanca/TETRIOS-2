
import { FXManager } from '../utils/FXManager';
import { GameCore } from '../utils/GameCore';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var beforeEach: any;

const mockCore = {
  pieceManager: { player: { pos: { x: 5, y: 10 } } },
  flippedGravity: false,
} as unknown as GameCore;

describe('FXManager', () => {
  let manager: FXManager;

  beforeEach(() => {
    manager = new FXManager(mockCore);
  });

  it('adds floating text', () => {
    manager.addFloatingText('TEST', '#fff');
    expect(manager.floatingTexts.length).toBe(1);
    expect(manager.floatingTexts[0].text).toBe('TEST');
    expect(manager.floatingTexts[0].x).toBe(5); // Player X
  });

  it('updates floating text life and position', () => {
    manager.addFloatingText('TEST', '#fff');
    const initialY = manager.floatingTexts[0].y;
    
    manager.update(500); // 0.5s
    
    expect(manager.floatingTexts[0].life).toBeLessThan(1.0);
    expect(manager.floatingTexts[0].y).toBeLessThan(initialY); // Floats up
  });

  it('removes dead text', () => {
    manager.addFloatingText('TEST', '#fff');
    manager.update(2000); // > 1.0s default life
    expect(manager.floatingTexts.length).toBe(0);
  });

  it('decays flash effects', () => {
    manager.triggerLockResetFlash();
    expect(manager.lockResetFlash).toBe(1.0);
    
    manager.update(16);
    expect(manager.lockResetFlash).toBeLessThan(1.0);
  });
});