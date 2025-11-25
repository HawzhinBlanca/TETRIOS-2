
import React from 'react';
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, RotateCw, RotateCcw, Archive, Eye, Pause } from 'lucide-react';
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

// Helper for repeating actions with Apple-grade minimalist styling
const RepeatButton = ({ onAction, icon: Icon, className, label, rotate = 0, activeClass = 'active:bg-white/20 active:border-white/50' }: any) => {
    const intervalRef = React.useRef<number | null>(null);

    const start = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault(); // Prevent ghost clicks
        onAction();
        audioManager.playUiClick();
        // Initial delay before repeat
        intervalRef.current = window.setTimeout(() => {
            intervalRef.current = window.setInterval(() => {
                onAction();
            }, 50); // Fast repeat
        }, 150);
    };

    const stop = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    return (
        <button
            onTouchStart={start}
            onTouchEnd={stop}
            onMouseDown={start}
            onMouseUp={stop}
            onMouseLeave={stop}
            className={`w-16 h-16 rounded-full bg-transparent backdrop-blur-[2px] border border-white/10 
                hover:bg-white/5 ${activeClass} active:scale-95 active:backdrop-blur-md
                transition-all duration-100 flex items-center justify-center select-none touch-none ${className}`}
            aria-label={label}
            style={{ transform: `rotate(${rotate}deg)` }}
        >
            <Icon size={32} className="text-white/80 drop-shadow-sm" strokeWidth={1.5} />
        </button>
    );
};

const TouchControls: React.FC<Props> = ({ 
    controller,
    onZone,
    onPause,
    isZoneReady = false,
    flippedGravity = false
}) => {
    return (
        // Anchored to bottom with safe area padding support.
        // The controls sit in a "Thin Line" area visually defined by spacing, but transparent.
        // Ultra-minimalist see-through style.
        <div className="fixed bottom-0 left-0 right-0 pb-safe pt-2 px-4 h-[180px] flex justify-between items-end z-[100] pointer-events-none bg-gradient-to-t from-black/40 to-transparent">
            
            {/* Left Cluster: D-Pad (Movement & Drops) */}
            <div className="pointer-events-auto grid grid-cols-3 gap-1 mb-4">
                {/* Hard Drop */}
                <div className="col-start-2 flex justify-center">
                    <RepeatButton onAction={() => controller.hardDrop()} icon={ArrowUp} label="Hard Drop" rotate={flippedGravity ? 180 : 0} />
                </div>
                
                {/* Move Left */}
                <div className="col-start-1 row-start-2 flex justify-center">
                    <RepeatButton onAction={() => controller.move(-1)} icon={ArrowLeft} label="Move Left" />
                </div>
                
                {/* Soft Drop */}
                <div className="col-start-2 row-start-2 flex justify-center">
                    <RepeatButton onAction={() => controller.softDrop()} icon={ArrowDown} label="Soft Drop" rotate={flippedGravity ? 180 : 0} />
                </div>
                
                {/* Move Right */}
                <div className="col-start-3 row-start-2 flex justify-center">
                    <RepeatButton onAction={() => controller.move(1)} icon={ArrowRight} label="Move Right" />
                </div>
            </div>

            {/* Right Cluster: Action Buttons (Rotation, Hold, Zone) */}
            <div className="pointer-events-auto flex flex-col gap-4 items-end mb-6 mr-2">
                <div className="flex gap-4 items-center">
                    {isZoneReady && onZone && (
                        <button onClick={onZone} className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-400/30 flex items-center justify-center active:scale-95 active:bg-yellow-500/30 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                            <Eye size={20} className="text-yellow-200" />
                        </button>
                    )}
                    <button onClick={() => controller.hold()} className="w-12 h-12 rounded-full bg-transparent border border-white/10 flex items-center justify-center active:scale-95 active:bg-white/10 backdrop-blur-[2px] transition-all hover:bg-white/5">
                        <Archive size={20} className="text-gray-300" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => controller.rotate(-1)} className="w-14 h-14 rounded-full bg-transparent border border-white/10 flex items-center justify-center active:scale-95 active:bg-white/10 backdrop-blur-[2px] transition-all hover:bg-white/5">
                        <RotateCcw size={24} className="text-white/80" strokeWidth={1.5} />
                    </button>
                </div>
                {/* Big Rotate CW Button */}
                <button onClick={() => controller.rotate(1)} className="w-20 h-20 rounded-full bg-transparent border border-white/20 flex items-center justify-center active:scale-95 active:bg-white/10 active:border-white/40 backdrop-blur-[2px] transition-all shadow-sm hover:bg-white/5">
                    <RotateCw size={36} className="text-white" strokeWidth={1.5} />
                </button>
            </div>
        </div>
    );
};

export default React.memo(TouchControls);
