
import React from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ghostStyle: 'neon' | 'dashed' | 'solid';
  setGhostStyle: (s: 'neon' | 'dashed' | 'solid') => void;
  ghostOpacity: number;
  setGhostOpacity: (n: number) => void;
  ghostThickness: number;
  setGhostThickness: (n: number) => void;
  gameSpeed: number;
  setGameSpeed: (n: number) => void;
  lockWarning: boolean;
  setLockWarning: (b: boolean) => void;
}

const Settings: React.FC<Props> = ({ 
  isOpen, onClose, 
  ghostStyle, setGhostStyle, 
  ghostOpacity, setGhostOpacity, 
  ghostThickness, setGhostThickness, 
  gameSpeed, setGameSpeed,
  lockWarning, setLockWarning
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X /></button>
        </div>

        <div className="space-y-6">
          {/* Visual FX */}
          <div>
             <label className="block text-xs text-gray-500 uppercase tracking-widest mb-3">Visual FX</label>
             <div className="flex items-center justify-between bg-gray-800 p-3 rounded border border-gray-700">
                <span className="text-sm text-gray-300 font-bold">Lock Warning Glow</span>
                <button 
                   onClick={() => setLockWarning(!lockWarning)}
                   className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${lockWarning ? 'bg-cyan-600' : 'bg-gray-600'}`}
                   title="Toggle pulsing effect before piece locks"
                >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${lockWarning ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
             </div>
          </div>

          {/* Game Speed */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
              <span>Game Speed</span>
              <span className="text-cyan-400 font-mono">{gameSpeed.toFixed(1)}x</span>
            </label>
            <input 
              type="range" min="0.5" max="3.0" step="0.1" 
              value={gameSpeed} onChange={(e) => setGameSpeed(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Ghost Style */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-3">Ghost Style</label>
            <div className="flex gap-3">
               <button 
                  onClick={() => setGhostStyle('neon')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase rounded border transition-all duration-200 ${
                      ghostStyle === 'neon' 
                      ? 'bg-cyan-900/40 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                      : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'
                  }`}
                >
                  Neon
                </button>
                <button 
                  onClick={() => setGhostStyle('dashed')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase rounded border-2 border-dashed transition-all duration-200 ${
                      ghostStyle === 'dashed' 
                      ? 'bg-cyan-900/20 border-cyan-400 text-cyan-400' 
                      : 'bg-gray-800 border-gray-600 text-gray-500 hover:bg-gray-700'
                  }`}
                >
                  Dashed
                </button>
                <button 
                  onClick={() => setGhostStyle('solid')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase rounded border transition-all duration-200 ${
                      ghostStyle === 'solid' 
                      ? 'bg-cyan-700 border-cyan-500 text-white' 
                      : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'
                  }`}
                >
                  Solid
                </button>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
              <span>Ghost Opacity</span>
              <span className="text-cyan-400 font-mono">{Math.round(ghostOpacity * 100)}%</span>
            </label>
            <input 
              type="range" min="0.1" max="1" step="0.05" 
              value={ghostOpacity} onChange={(e) => setGhostOpacity(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Thickness */}
          <div>
             <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
              <span>Ghost Outline</span>
              <span className="text-cyan-400 font-mono">{ghostThickness}px</span>
            </label>
            <input 
              type="range" min="0" max="5" step="1" 
              value={ghostThickness} onChange={(e) => setGhostThickness(parseInt(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
