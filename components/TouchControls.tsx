
import React, { useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, RotateCw, RotateCcw, Eye, Pause, Menu } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface TouchController {
    move: (dir: number) => void;
    softDrop: () => void;
    hardDrop: () => void;
    rotate: (dir: number) => void;
    hold: () => void;
    triggerBombBooster: () => void;
    triggerLineClearer: () => void;
}

interface Props {
    controller: TouchController;
    onZone?: () => void;
    onPause?: () => void;
    isZoneReady?: boolean;
    flippedGravity?: boolean;
}

const GlassButton = ({ onAction, icon: Icon, className = '', rotate = 0, activeClass = 'active:bg-white/30', size=28 }: any) => {
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
        
        intervalRef.current = window.setTimeout(() => {
            intervalRef.current = window.setInterval(() => {
                onAction();
            }, 50); 
        }, 150); 
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
        <button
            onTouchStart={trigger}
            onTouchEnd={release}
            onMouseDown={trigger}
            onMouseUp={release}
            onMouseLeave={release}
            className={`
                flex items-center justify-center select-none touch-none
                bg-black/20 border border-white/10
                text-white shadow-lg backdrop-blur-[2px]
                transition-all duration-75
                active:scale-90 ${activeClass}
                ${isActive ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_15px_cyan]' : ''}
                ${className}
            `}
            style={{ transform: `rotate(${rotate}deg)` }}
        >
            <Icon size={size} strokeWidth={2.5} className={isActive ? 'text-white drop-shadow-md' : ''} />
        </button>
    );
};

const TouchControls: React.FC<Props> = ({ 
    controller,
    onZone,
    isZoneReady = false,
    flippedGravity = false
}) => {
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const minSwipeDistance = 30;

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartRef.current.x;
        const deltaY = touchEndY - touchStartRef.current.y;

        // Horizontal swipe check (horizontal distance > vertical distance && > threshold)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            // Determine direction
            // Standard: Right (+x) = CW (1), Left (-x) = CCW (-1)
            let direction = deltaX > 0 ? 1 : -1;

            // Respect flipped gravity (Invert rotation on swipe if requested)
            if (flippedGravity) {
                direction *= -1;
            }

            controller.rotate(direction);
        }

        touchStartRef.current = null;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 pb-safe pt-4 px-2 h-[220px] flex justify-between items-end z-[100] pointer-events-none select-none" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
            
            {/* Gesture Layer for Swipes */}
            <div 
                className="absolute inset-0 pointer-events-auto z-0"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                aria-label="Swipe area for rotation"
            />

            {/* D-Pad Island */}
            <div className="pointer-events-auto grid grid-cols-3 gap-2 mb-2 p-2 bg-black/10 rounded-2xl backdrop-blur-sm border border-white/5 relative z-10">
                <div className="col-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.hardDrop()} icon={ArrowUp} rotate={flippedGravity ? 180 : 0} className="w-14 h-14 rounded-xl bg-white/5" size={28} />
                </div>
                <div className="col-start-1 row-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.move(-1)} icon={ArrowLeft} className="w-14 h-14 rounded-xl bg-white/5" size={28} />
                </div>
                <div className="col-start-2 row-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.softDrop()} icon={ArrowDown} rotate={flippedGravity ? 180 : 0} className="w-14 h-14 rounded-xl bg-white/5" size={28} />
                </div>
                <div className="col-start-3 row-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.move(1)} icon={ArrowRight} className="w-14 h-14 rounded-xl bg-white/5" size={28} />
                </div>
            </div>

            {/* Action Island */}
            <div className="pointer-events-auto flex flex-col gap-4 items-end mb-4 p-2 relative z-10">
                <div className="flex gap-3 pr-2">
                    {isZoneReady && onZone && (
                        <button onClick={onZone} className="w-16 h-16 rounded-full bg-yellow-500/40 border border-yellow-400/60 flex items-center justify-center active:scale-90 backdrop-blur-sm shadow-[0_0_20px_rgba(253,224,71,0.4)] animate-pulse pointer-events-auto">
                            <Eye size={32} className="text-yellow-100" />
                        </button>
                    )}
                </div>
                
                <div className="flex gap-4 items-center bg-black/10 rounded-2xl p-2 backdrop-blur-sm border border-white/5">
                    <GlassButton onAction={() => controller.rotate(-1)} icon={RotateCcw} className="w-16 h-16 rounded-full bg-white/5" size={28} />
                    <GlassButton onAction={() => controller.rotate(1)} icon={RotateCw} className="w-20 h-20 rounded-full bg-cyan-600/30 border-cyan-400/40 text-cyan-50" size={40} />
                </div>
            </div>
        </div>
    );
};

export default React.memo(TouchControls);
