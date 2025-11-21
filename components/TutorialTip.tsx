import React from 'react';
import { X, Lightbulb } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface Props {
    text: string;
    onDismiss: () => void;
}

const TutorialTip: React.FC<Props> = ({ text, onDismiss }) => {
    return (
        <div 
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 p-4 w-full max-w-md bg-gray-800/95 backdrop-blur-md border border-cyan-700 rounded-lg shadow-xl animate-in slide-in-from-bottom fade-in duration-300"
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <Lightbulb size={24} className="text-cyan-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                    <h3 className="text-cyan-300 text-sm font-bold uppercase tracking-widest mb-1">Tip!</h3>
                    <p className="text-gray-200 text-sm leading-snug">{text}</p>
                </div>
                <button 
                    onClick={() => { audioManager.playUiBack(); onDismiss(); }}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 -mt-1 -mr-1"
                    aria-label="Dismiss tutorial tip"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default TutorialTip;