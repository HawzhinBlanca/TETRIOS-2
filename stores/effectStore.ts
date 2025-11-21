
import { create } from 'zustand';
import { VisualEffectPayload } from '../types';

type VisualEffectType = 'SHAKE' | 'PARTICLE' | 'FLASH' | 'FRENZY_START' | 'FRENZY_END' | 'POWERUP_ACTIVATE' | 'BLITZ_SPEED_THRESHOLD' | 'FLIPPED_GRAVITY_ACTIVATE' | 'FLIPPED_GRAVITY_END';

interface EffectState {
  shakeClass: string;
  flashOverlay: string | null;
  visualEffect: VisualEffectPayload | null;
  
  setShakeClass: (cls: string) => void;
  setFlashOverlay: (color: string | null) => void;
  triggerVisualEffect: (type: VisualEffectType, payload?: VisualEffectPayload['payload']) => void;
  clearVisualEffect: () => void;
}

export const useEffectStore = create<EffectState>((set) => ({
  shakeClass: '',
  flashOverlay: null,
  visualEffect: null,

  setShakeClass: (cls) => set({ shakeClass: cls }),
  setFlashOverlay: (color) => set({ flashOverlay: color }),
  triggerVisualEffect: (type, payload) => set({ visualEffect: { type, payload } as VisualEffectPayload }),
  clearVisualEffect: () => set({ visualEffect: null }),
}));
