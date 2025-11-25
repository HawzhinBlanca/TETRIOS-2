
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { audioManager } from '../../utils/audioManager';

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  variant?: 'default' | 'skewed';
  borderColorClass?: string; // e.g., 'border-red-500'
  showCloseButton?: boolean;
  role?: string;
  ariaLabel?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  children, 
  onClose, 
  className = '', 
  variant = 'default', 
  borderColorClass = 'border-gray-800',
  showCloseButton = false,
  role = 'dialog',
  ariaLabel
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    // Find focusable elements for Focus Trap
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = modalElement.querySelectorAll(selector);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      if (e.key === 'Escape' && onClose) {
          onClose();
      }
    };

    modalElement.addEventListener('keydown', handleKeyDown);
    // Focus the first element or the container if nothing focusable
    if (firstElement) firstElement.focus();
    else modalElement.focus();

    return () => {
      modalElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const overlayClasses = "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 p-4";
  
  const containerBase = variant === 'skewed'
    ? `bg-[#0a0f1e] border-l-4 p-8 md:p-12 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-lg w-full text-center ${borderColorClass}`
    : `bg-[#050810] border ${borderColorClass} w-full max-w-2xl shadow-[0_0_100px_rgba(6,182,212,0.15)] rounded-lg p-8 text-center relative flex flex-col`;

  // Added max-h and overflow handling
  const maxHeightClass = "max-h-[90vh] overflow-y-auto custom-scrollbar";

  return (
    <div className={overlayClasses} role={role} aria-modal="true" aria-label={ariaLabel} ref={modalRef}>
        <div className={`${containerBase} ${maxHeightClass} ${className}`}>
            {showCloseButton && onClose && (
                <button 
                    onClick={() => { audioManager.playUiBack(); onClose(); }}
                    className={`absolute top-4 right-4 text-gray-500 hover:text-white z-50 ${variant === 'skewed' ? 'skew-x-[10deg]' : ''}`}
                    aria-label="Close Modal"
                >
                    <X size={24} />
                </button>
            )}
            {variant === 'skewed' ? (
                <div className="skew-x-[10deg] h-full w-full">
                    {children}
                </div>
            ) : (
                children
            )}
        </div>
    </div>
  );
};

export default Modal;
