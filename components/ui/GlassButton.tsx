
import React from 'react';
import { audioManager } from '../../utils/audioManager';
import Button, { ButtonProps } from './Button';

interface GlassButtonProps extends Omit<ButtonProps, 'onClick'> {
    onAction: () => void;
    icon: React.ElementType;
    className?: string;
    rotate?: number;
    activeClass?: string;
    size?: any; 
    repeat?: boolean; // New prop to control rapid fire
}

const GlassButton: React.FC<GlassButtonProps> = ({ 
    onAction, 
    icon: Icon, 
    className = '', 
    rotate = 0, 
    activeClass = 'active:bg-white/30', 
    size = 28,
    repeat = true, // Default to true to maintain existing behavior for game controls
    ...props 
}) => {
    const intervalRef = React.useRef<number | null>(null);
    const isPressed = React.useRef(false);
    const [isActive, setIsActive] = React.useState(false);

    const trigger = (e: React.TouchEvent | React.MouseEvent) => {
        if (e.cancelable && e.type === 'touchstart') e.preventDefault();
        
        if (isPressed.current) return;
        isPressed.current = true;
        setIsActive(true);

        onAction();
        audioManager.playUiClick();
        
        if (repeat) {
            intervalRef.current = window.setTimeout(() => {
                intervalRef.current = window.setInterval(() => {
                    onAction();
                }, 50); 
            }, 150); 
        }
    };

    const release = (e: React.TouchEvent | React.MouseEvent) => {
        if (e.cancelable && e.type === 'touchend') e.preventDefault();
        
        isPressed.current = false;
        setIsActive(false);
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    return (
        <Button
            variant="glass"
            onTouchStart={trigger}
            onTouchEnd={release}
            onMouseDown={trigger}
            onMouseUp={release}
            onMouseLeave={release}
            className={`
                touch-none
                ${isActive ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_15px_cyan]' : ''}
                ${className}
            `}
            style={{ transform: `rotate(${rotate}deg)` }}
            icon={Icon}
            size={typeof size === 'string' ? size : 'icon'}
            soundEnabled={false} 
            {...props}
        />
    );
};

export default GlassButton;
