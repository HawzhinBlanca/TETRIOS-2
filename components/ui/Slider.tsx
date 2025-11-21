import React from 'react';
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
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="group">
        <label className="flex justify-between text-[10px] text-gray-400 mb-3 font-bold tracking-widest uppercase group-hover:text-cyan-400 transition-colors" htmlFor={`slider-${label.replace(/\s/g, '')}`}>
            <span>{label}</span>
            <span className="font-mono text-white">{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}</span>
        </label>
        <div className="relative flex items-center h-6">
            {/* Native Range Input Styled Directly */}
            <input 
                id={`slider-${label.replace(/\s/g, '')}`}
                type="range" min={min} max={max} step={step} 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onInput={() => audioManager.playUiHover()} 
                className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label={ariaLabel || label}
                style={{
                    backgroundImage: `linear-gradient(to right, #06b6d4 ${percentage}%, #1f2937 ${percentage}%)`
                }}
            />
            {/* Thumb Style Injection for Webkit/Moz */}
            <style dangerouslySetInnerHTML={{__html: `
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #ffffff;
                    box-shadow: 0 0 10px rgba(255,255,255,0.8);
                    cursor: pointer;
                    margin-top: 0px; 
                    transition: transform 0.1s;
                }
                input[type=range]::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                input[type=range]::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border: none;
                    border-radius: 50%;
                    background: #ffffff;
                    box-shadow: 0 0 10px rgba(255,255,255,0.8);
                    cursor: pointer;
                    transition: transform 0.1s;
                }
                input[type=range]::-moz-range-thumb:hover {
                    transform: scale(1.2);
                }
            `}} />
        </div>
    </div>
  );
};

export default Slider;
