import React from 'react';

interface Props {
  label: string;
  text: string | number;
}

const Display: React.FC<Props> = ({ label, text }) => (
  <div className="flex flex-col items-end mb-4 p-4 bg-gray-900/80 border-r-4 border-cyan-500 rounded-l-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-sm w-full">
    <span className="text-cyan-400 text-xs uppercase tracking-widest mb-1 font-semibold">{label}</span>
    <span className="text-white text-2xl font-mono font-bold glow-text">{text}</span>
  </div>
);

export default Display;
