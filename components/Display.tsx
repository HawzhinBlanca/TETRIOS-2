
import React from 'react';
import GlassPanel from './ui/GlassPanel';
import ProgressBar from './ui/ProgressBar';
import { Label, Value } from './ui/Text';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { Delta } from './ui/Delta';
import PanelHeader from './ui/PanelHeader';

interface Props {
  label: string;
  text?: string | number;
  progress?: number; // 0 to 1
  icon?: React.ElementType; // Changed to ElementType for consistency with other UI components
  className?: string;
  labelClassName?: string;
  variant?: 'default' | 'mobile';
  align?: 'left' | 'right' | 'center';
}

const Display: React.FC<Props> = React.memo(({ 
    label, 
    text, 
    progress, 
    icon, 
    className = '', 
    labelClassName = 'text-cyan-400/90',
    variant = 'default',
    align = 'left'
}) => {
  const delta = useAnimatedValue(text || 0);

  const alignmentClasses = {
      left: 'items-start text-left',
      right: 'items-end text-right',
      center: 'items-center text-center',
  };

  if (variant === 'mobile') {
      return (
        <GlassPanel 
            variant="darker" 
            intensity="high" 
            className={`px-4 py-2.5 flex flex-col justify-center min-w-[90px] pointer-events-auto shadow-lg ${alignmentClasses[align]} ${className}`}
            role="status" 
            aria-label={`${label} display`}
        >
            <Label className={`mb-1.5 flex items-center gap-1 ${labelClassName}`}>
                {icon && React.createElement(icon, { size: 12, className: "inline-block align-text-bottom" })}
                {label}
            </Label>
            <div className="relative w-full">
                {text !== undefined && <Value size="lg" glow>{text}</Value>}
                <Delta value={delta} className="absolute top-0 right-0" />
            </div>
            {progress !== undefined && (
                <ProgressBar 
                    progress={progress} 
                    height="h-1.5" 
                    fillClassName="bg-cyan-500" 
                    className="mt-1"
                />
            )}
        </GlassPanel>
      );
  }

  return (
    <GlassPanel 
        interactive 
        className={`flex flex-col mb-4 ${className}`} 
        role="status" 
        aria-label={`${label} display`}
    >
      <div className="relative z-10 p-5 flex flex-col w-full min-w-[180px]">
          <PanelHeader 
            title={label} 
            icon={icon} 
            className="mb-2 w-full" 
            textColor={labelClassName}
          />
          
          {/* Main Value */}
          <div className="relative flex items-baseline justify-end gap-2 overflow-hidden">
             <Delta value={delta} />
             <Value size="3xl" className="tracking-tight drop-shadow-md" glow>
                  {text}
             </Value>
          </div>

          {/* Progress Bar */}
          {progress !== undefined && (
              <div className="mt-3">
                  <ProgressBar 
                      progress={progress} 
                      height="h-1" 
                      trackClassName="bg-gray-700/30" 
                      fillClassName="bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" 
                  />
              </div>
          )}
      </div>
    </GlassPanel>
  );
});

export default Display;
