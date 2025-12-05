
import React, { useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, RotateCw, RotateCcw, Eye } from 'lucide-react';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import GlassButton from './ui/GlassButton';

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

const TouchControls: React.FC<Props> = ({ 
    controller,
    onZone,
    isZoneReady = false,
    flippedGravity = false
}) => {
    const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
    const sensitivity = useGameSettingsStore(state => state.swipeSensitivity);
    const swapLayout = useGameSettingsStore(state => state.swapTouchControls);
    const controlMode = useGameSettingsStore(state => state.touchControlMode); 
    
    const SWIPE_THRESHOLD = 30 / (sensitivity || 1);
    const TAP_THRESHOLD = 10;
    const TAP_TIMEOUT = 200; 

    const handleTouchStart = (e: React.TouchEvent) => {
        if (controlMode === 'BUTTONS') return;
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current || controlMode === 'BUTTONS') return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const duration = Date.now() - touchStartRef.current.time;

        const deltaX = touchEndX - touchStartRef.current.x;
        const deltaY = touchEndY - touchStartRef.current.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD && duration < TAP_TIMEOUT) {
            controller.rotate(1); 
        } else if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
            if (absX > absY) {
                const dir = deltaX > 0 ? 1 : -1;
                const steps = Math.max(1, Math.floor(absX / (SWIPE_THRESHOLD * 1.5)));
                for(let i=0; i<steps; i++) controller.move(dir); 
            } else {
                if (deltaY > 0) {
                    if (flippedGravity) controller.hardDrop(); 
                    else controller.softDrop();
                } else {
                    if (flippedGravity) controller.softDrop();
                    else controller.hardDrop();
                }
            }
        }
        touchStartRef.current = null;
    };

    const showButtons = controlMode !== 'GESTURES';

    return (
        <div 
            className={`fixed bottom-0 left-0 right-0 h-[120px] flex items-end z-[100] pointer-events-none select-none pb-4 px-4 justify-between ${swapLayout ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Full Screen Gesture Layer */}
            {controlMode !== 'BUTTONS' && (
                <div 
                    className="fixed inset-0 pointer-events-auto z-0"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    aria-label="Gesture Zone"
                />
            )}

            {/* Ghost D-Pad */}
            <div className={`pointer-events-auto grid grid-cols-3 gap-1 transition-opacity duration-300 ${showButtons ? 'opacity-80' : 'opacity-0 pointer-events-none'}`}>
                <div className="col-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.hardDrop()} icon={flippedGravity ? ArrowDown : ArrowUp} className="w-14 h-12 bg-white/5 border-white/5 rounded-2xl backdrop-blur-sm active:bg-white/20 active:border-white/30" size={20} />
                </div>
                <div className="col-start-1 row-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.move(-1)} icon={ArrowLeft} className="w-14 h-12 bg-white/5 border-white/5 rounded-2xl backdrop-blur-sm active:bg-white/20 active:border-white/30" size={20} />
                </div>
                <div className="col-start-2 row-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.softDrop()} icon={flippedGravity ? ArrowUp : ArrowDown} className="w-14 h-12 bg-white/5 border-white/5 rounded-2xl backdrop-blur-sm active:bg-white/20 active:border-white/30" size={20} />
                </div>
                <div className="col-start-3 row-start-2 flex justify-center">
                    <GlassButton onAction={() => controller.move(1)} icon={ArrowRight} className="w-14 h-12 bg-white/5 border-white/5 rounded-2xl backdrop-blur-sm active:bg-white/20 active:border-white/30" size={20} />
                </div>
            </div>

            {/* Action Cluster */}
            <div className={`flex gap-6 pointer-events-auto items-center mb-2 transition-opacity duration-300 ${showButtons ? 'opacity-90' : 'opacity-0 pointer-events-none'}`}>
                <GlassButton 
                    onAction={() => controller.rotate(-1)} 
                    icon={RotateCcw} 
                    className="w-16 h-16 rounded-full bg-white/5 border-white/5 backdrop-blur-md active:bg-cyan-500/30 active:scale-95 active:border-cyan-400"
                    size={28}
                />
                <GlassButton 
                    onAction={() => controller.rotate(1)} 
                    icon={RotateCw} 
                    className="w-20 h-20 rounded-full bg-white/10 border-white/10 backdrop-blur-md active:bg-cyan-500/40 active:scale-95 active:border-cyan-400 shadow-lg"
                    size={36}
                />
            </div>

            {/* Zone Trigger (Floating Center) */}
            {onZone && isZoneReady && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto animate-in zoom-in duration-300">
                    <GlassButton 
                        onAction={onZone} 
                        icon={Eye} 
                        className="w-16 h-16 rounded-full bg-yellow-500/20 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.4)] animate-pulse backdrop-blur-md active:scale-95 active:bg-yellow-500/40"
                        size={32}
                    />
                </div>
            )}
        </div>
    );
};

export default TouchControls;
