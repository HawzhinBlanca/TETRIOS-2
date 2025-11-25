


import React, { useState, useEffect, useRef } from 'react';
import { StoryNode } from '../types';
import { audioManager } from '../utils/audioManager';
import { ChevronRight, Terminal, Cpu, Radio } from 'lucide-react';

interface Props {
    story: StoryNode[];
    onComplete: () => void;
}

const StoryOverlay: React.FC<Props> = ({ story, onComplete }) => {
    const [index, setIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    const currentNode = story[index];
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!currentNode) return;
        
        setDisplayedText('');
        setIsTyping(true);
        let charIndex = 0;
        const fullText = currentNode.text;

        // Faster Typing effect
        timerRef.current = window.setInterval(() => {
            if (charIndex < fullText.length) {
                setDisplayedText(prev => prev + fullText[charIndex]);
                charIndex++;
            } else {
                setIsTyping(false);
                if (timerRef.current) clearInterval(timerRef.current);
            }
        }, 20); 

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [index, currentNode]);

    const handleNext = () => {
        if (isTyping) {
            // Skip typing
            setDisplayedText(currentNode.text);
            setIsTyping(false);
            if (timerRef.current) clearInterval(timerRef.current);
        } else {
            audioManager.playUiClick();
            if (index < story.length - 1) {
                setIndex(index + 1);
            } else {
                onComplete();
            }
        }
    };

    if (!currentNode) return null;

    const isLeft = currentNode.side === 'left' || !currentNode.side;
    const isBoss = currentNode.speaker.includes('Overlord') || currentNode.speaker.includes('Architect') || currentNode.speaker.includes('Guardian');
    const isAI = currentNode.speaker.includes('AI');

    // Dynamic Theme Colors based on speaker type
    const themeColor = isBoss ? 'red' : (isAI ? 'cyan' : 'yellow');
    const borderColor = isBoss ? 'border-red-500' : (isAI ? 'border-cyan-500' : 'border-yellow-500');
    const textColor = isBoss ? 'text-red-400' : (isAI ? 'text-cyan-400' : 'text-yellow-400');
    const bgColor = isBoss ? 'bg-red-900/20' : (isAI ? 'bg-cyan-900/20' : 'bg-yellow-900/20');

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end pb-12 md:pb-24 items-center bg-black/60 backdrop-blur-sm p-4" onClick={handleNext}>
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,20,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>

            <div className="w-full max-w-5xl flex flex-col gap-4 relative z-10 animate-in slide-in-from-bottom-10 duration-300" onClick={(e) => e.stopPropagation()}>
                
                {/* Top Bar Signal */}
                <div className="flex justify-between items-center px-2">
                    <div className={`flex items-center gap-2 ${textColor} opacity-80 mb-2 animate-pulse`}>
                        <Radio size={16} />
                        <span className="text-[10px] font-mono uppercase tracking-widest">Incoming Transmission...</span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-500">CH-9022</div>
                </div>

                {/* Content Row */}
                <div className={`flex items-end gap-4 md:gap-8 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                    
                    {/* Character Portrait */}
                    <div className={`w-32 h-32 md:w-48 md:h-48 bg-black/80 border-2 flex items-center justify-center text-7xl shadow-[0_0_50px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden relative
                        ${borderColor} ${isBoss ? 'rounded-xl' : (isLeft ? 'rounded-tr-3xl rounded-bl-3xl' : 'rounded-tl-3xl rounded-br-3xl')}
                        transition-all duration-300 transform hover:scale-105
                    `}>
                        <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/80`}></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                        
                        <span className={`relative z-10 filter drop-shadow-2xl text-8xl md:text-9xl transform ${isLeft ? '' : 'scale-x-[-1]'}`}>
                            {currentNode.avatar || '👤'}
                        </span>
                        
                        {/* Hologram Scan Effect */}
                        <div className="absolute inset-0 bg-white/5 animate-[scan_2s_linear_infinite] mix-blend-overlay pointer-events-none h-[20%] w-full blur-md"></div>
                    </div>
                    
                    {/* Dialogue Box */}
                    <div 
                        className={`flex-1 bg-black/90 border p-6 md:p-8 shadow-2xl relative cursor-pointer min-h-[180px] flex flex-col justify-between group
                            ${borderColor} ${bgColor}
                            rounded-xl backdrop-blur-xl
                        `}
                        onClick={handleNext}
                    >
                        {/* Decorative Corner */}
                        <div className={`absolute top-0 ${isLeft ? 'left-0' : 'right-0'} w-4 h-4 border-t-2 border-${isLeft ? 'l' : 'r'}-2 ${borderColor}`}></div>
                        <div className={`absolute bottom-0 ${isLeft ? 'right-0' : 'left-0'} w-4 h-4 border-b-2 border-${isLeft ? 'r' : 'l'}-2 ${borderColor}`}></div>

                        <div>
                            <div className={`text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 pb-2 border-b border-white/10
                                ${textColor}
                            `}>
                                {isAI ? <Cpu size={14} /> : <Terminal size={14} />}
                                {currentNode.speaker}
                            </div>
                            <div className="text-lg md:text-2xl text-white font-medium leading-relaxed font-mono drop-shadow-md">
                                {displayedText}
                                {isTyping && <span className={`animate-pulse inline-block w-2 h-6 ml-1 align-middle ${isBoss ? 'bg-red-500' : 'bg-cyan-500'}`}></span>}
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <div className={`flex items-center gap-2 text-xs uppercase font-bold tracking-widest transition-all duration-300 
                                ${isTyping ? 'opacity-0 translate-y-2' : 'opacity-70 group-hover:opacity-100 group-hover:text-white animate-bounce'}
                            `}>
                                {index < story.length - 1 ? 'Next' : 'Engage'} <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryOverlay;
