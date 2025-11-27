
import React from 'react';
import { GhostStyle } from '../../types';

interface GhostPreviewProps { 
  style: GhostStyle; 
  opacity: number; 
  thickness: number; 
  glow: number;
  rgb?: string;
}

const GhostPreview: React.FC<GhostPreviewProps> = ({ style, opacity, thickness, glow, rgb = "168, 85, 247" }) => (
    <div className="w-full h-32 bg-black/40 border border-gray-800 rounded flex items-center justify-center relative overflow-hidden select-none" aria-hidden="true">
         <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
         <div className="relative grid grid-cols-3 gap-0.5 p-4">
              <div className="w-6 h-6"></div>
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="w-6 h-6 rounded-[1px]"
                  style={{
                      background: style === 'neon' || style === 'dashed' ? `rgba(${rgb}, 0.1)` : `rgba(${rgb}, 0.3)`,
                      border: style === 'solid' ? 'none' : `${thickness}px ${style === 'dashed' ? 'dashed' : 'solid'} rgba(${rgb}, 0.8)`,
                      boxShadow: style === 'neon' ? `0 0 ${8 * glow}px rgba(${rgb}, 0.6), inset 0 0 ${4 * glow}px rgba(${rgb}, 0.4)` : 'none',
                      opacity: opacity
                  }}
                ></div>
              ))}
         </div>
         <div className="absolute bottom-2 right-2 text-[9px] text-gray-500 uppercase tracking-widest font-mono">Live Preview</div>
    </div>
);

export default GhostPreview;
