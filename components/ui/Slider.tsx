
import React, { useState, useEffect } from 'react';
import { audioManager } from '../../utils/audioManager';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  ariaLabel?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit = '', ariaLabel }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const percentage = ((localValue - min) / (max - min)) * 100;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = parseFloat(e.target.value);
      setLocalValue(newVal);
  };

  const handleCommit = () => {
      onChange(localValue);
      audioManager.playUiHover();
  };

  return (
    <div className="group">
        <label className="flex justify-between text-[10px] text-gray-400 mb-3 font-bold tracking-widest uppercase group-hover:text-cyan-400 transition-colors" htmlFor={`slider-${label.replace(/\s/g, '')}`}>
            <span>{label}</span>
            <span className="font-mono text-white">{typeof localValue === 'number' && !Number.isInteger(localValue) ? localValue.toFixed(1) : localValue}{unit}</span>
        </label>
        <div className="relative flex items-center h-6">
            <input 
                id={`slider-${label.replace(/\s/g, '')}`}
                type="range" min={min} max={max} step={step} 
                value={localValue} 
                onChange={handleInput}
                onMouseUp={handleCommit}
                onTouchEnd={handleCommit}
                className="slider-thumb-custom w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label={ariaLabel || label}
                style={{
                    '--progress': `${percentage}%`,
                    backgroundImage: `linear-gradient(to right, #06b6d4 var(--progress), #1f2937 var(--progress))`
                } as React.CSSProperties}
            />
        </div>
    </div>
  );
};

export default Slider;
