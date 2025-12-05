
import React from 'react';
import { KeyAction } from '../../types';
import { audioManager } from '../../utils/audioManager';

interface KeyBindingRowProps {
    action: KeyAction;
    keys: string[];
    onBind: (action: KeyAction, key: string, slot: number) => void;
}

export const KeyBindingRow: React.FC<KeyBindingRowProps> = ({ action, keys, onBind }) => {
    return (
        <div className="flex items-center justify-between bg-black/20 p-2 rounded border border-white/5 hover:bg-black/30 transition-colors">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                {action.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <div className="flex gap-2">
                {keys.map((key, i) => (
                    <button 
                        key={i}
                        className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-white min-w-[60px] hover:bg-gray-700 hover:border-cyan-500 focus:border-cyan-500 focus:outline-none transition-all duration-200 shadow-sm active:scale-95"
                        onClick={(e) => {
                            const target = e.currentTarget;
                            const originalText = target.innerText;
                            target.innerText = 'PRESS KEY...';
                            target.classList.add('animate-pulse', 'border-cyan-500', 'text-cyan-400', 'bg-cyan-900/20');
                            
                            const handleKeyDown = (ev: KeyboardEvent) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                onBind(action, ev.key, i);
                                audioManager.playUiSelect();
                                target.classList.remove('animate-pulse', 'border-cyan-500', 'text-cyan-400', 'bg-cyan-900/20');
                                window.removeEventListener('keydown', handleKeyDown);
                            };
                            
                            // Add click listener to cancel if clicked again/outside essentially
                            const handleOutsideClick = () => {
                                target.innerText = originalText;
                                target.classList.remove('animate-pulse', 'border-cyan-500', 'text-cyan-400', 'bg-cyan-900/20');
                                window.removeEventListener('keydown', handleKeyDown);
                                document.removeEventListener('click', handleOutsideClick);
                            };

                            window.addEventListener('keydown', handleKeyDown, { once: true });
                            // Small timeout to avoid immediate trigger from the click itself bubbling up if logic was different
                            setTimeout(() => document.addEventListener('click', handleOutsideClick, { once: true }), 0);
                        }}
                    >
                        {key === ' ' ? 'SPACE' : (key.toUpperCase() || 'NONE')}
                    </button>
                ))}
            </div>
        </div>
    );
};
