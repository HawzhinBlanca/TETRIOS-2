import React, { useState, useEffect } from 'react';
import { StoryNode } from '../types';
import { audioManager } from '../utils/audioManager';
import { ChevronRight } from 'lucide-react';

interface Props {
    story: StoryNode[];
    onComplete: () => void;
}

const StoryOverlay: React.FC<Props> = ({ story, onComplete }) => {
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(false);
    
    const currentNode = story[index];

    useEffect(() => {
        setVisible(true);
    }, [index]);

    const handleNext = () => {
        audioManager.playUiClick();
        if (index < story.length - 1) {
            setIndex(index + 1);
        } else {
            onComplete();
        }
    };

    if (!currentNode) return null;

    const isLeft = currentNode.side === 'left' || !currentNode.side;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end pb-12 md:pb-24 bg-black/60 backdrop-blur-sm">
            <div className="max-w-4xl w-full mx-auto px-4">
                <div className={`flex items-end gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Avatar */}
                    <div className={`w-24 h-24 md:w-32 md:h-32 bg-gray-900 border-2 ${isLeft ? 'border-cyan-500 rounded-tr-xl rounded-tl-xl rounded-bl-xl' : 'border-red-500 rounded-tr-xl rounded-tl-xl rounded-br-xl'} flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(0,0,0,0.5)] shrink-0 animate-in zoom-in duration-300`}>
                        {currentNode.avatar || (isLeft ? '🤖' : '👤')}
                    </div>
                    
                    {/* Dialogue Box */}
                    <div 
                        className="flex-1 bg-gray-900/90 border border-white/10 p-6 md:p-8 rounded-xl shadow-2xl relative cursor-pointer hover:bg-gray-800 transition-colors"
                        onClick={handleNext}
                    >
                        <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLeft ? 'text-cyan-400' : 'text-red-400'}`}>
                            {currentNode.speaker}
                        </div>
                        <div className="text-lg md:text-xl text-white font-medium leading-relaxed">
                            {currentNode.text}
                        </div>
                        <div className="absolute bottom-4 right-4 text-gray-500 animate-pulse">
                            <ChevronRight />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryOverlay;