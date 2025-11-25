
import React from 'react';

interface ProgressBarProps {
    progress: number; // 0 to 1
    className?: string;
    fillClassName?: string; // e.g. "bg-cyan-500"
    trackClassName?: string; // e.g. "bg-gray-800"
    height?: string; // e.g. "h-1"
}

const ProgressBar: React.FC<ProgressBarProps> = React.memo(({ 
    progress, 
    className = '', 
    fillClassName = 'bg-cyan-500', 
    trackClassName = 'bg-gray-800',
    height = 'h-1.5' 
}) => {
    // Clamp progress between 0 and 1
    const percentage = Math.min(100, Math.max(0, progress * 100));
    
    return (
        <div className={`w-full ${height} ${trackClassName} rounded-full overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100}>
            <div 
                className={`h-full ${fillClassName}`} 
                style={{ width: `${percentage}%`, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
        </div>
    );
});

export default ProgressBar;
