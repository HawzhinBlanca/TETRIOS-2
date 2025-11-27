
import React from 'react';
import { GhostStyle } from '../../types';
import { GhostView } from '../CellViews';

interface GhostPreviewProps { 
  style: GhostStyle; 
  opacity: number; 
  thickness: number; 
  glow: number;
  rgb?: string;
}

const GhostPreview: React.FC<GhostPreviewProps> = ({ style, opacity, thickness, glow, rgb = "168, 85, 247" }) => (
    <div className="w-full h-32 bg-black/40 border border-gray-800 rounded flex items-center justify-center relative overflow-hidden select-none mb-6" aria-hidden="true">
         {/* Background Grid Pattern */}
         <div className="absolute inset-0 opacity-30" style={{ 
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', 
             backgroundSize: '24px 24px',
             backgroundPosition: 'center' 
         }}></div>
         
         {/* T-Piece Configuration */}
         <div className="relative grid grid-cols-3 gap-[2px] p-4">
              {/* Row 1 */}
              <div className="w-6 h-6"></div>
              <div className="w-6 h-6"><GhostView rgb={rgb} warning={false} style={style} thickness={thickness} opacity={opacity} glow={glow} /></div>
              <div className="w-6 h-6"></div>
              
              {/* Row 2 */}
              <div className="w-6 h-6"><GhostView rgb={rgb} warning={false} style={style} thickness={thickness} opacity={opacity} glow={glow} /></div>
              <div className="w-6 h-6"><GhostView rgb={rgb} warning={false} style={style} thickness={thickness} opacity={opacity} glow={glow} /></div>
              <div className="w-6 h-6"><GhostView rgb={rgb} warning={false} style={style} thickness={thickness} opacity={opacity} glow={glow} /></div>
         </div>
         
         <div className="absolute bottom-2 right-2 text-[9px] text-gray-500 uppercase tracking-widest font-mono">Live Preview</div>
    </div>
);

export default GhostPreview;
