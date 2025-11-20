import React from 'react';
import Display from './Display';
import { GameMode } from '../types';

interface Props {
  score: number;
  rows: number;
  level: number;
  time: number;
  gameMode: GameMode;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

const StatsPanel: React.FC<Props> = ({ score, rows, level, time, gameMode }) => {
  const levelProgress = (rows % 10) / 10;

  return (
    <div className="w-full max-w-[240px] flex flex-col gap-2">
      {gameMode === 'ZEN' ? (
         <Display label="Zen Mode" text="∞" />
      ) : (
         <Display label="Score Data" text={score} />
      )}
      
      {/* Dynamic Mode Stats */}
      {gameMode === 'TIME_ATTACK' && (
         <Display label="Time Remaining" text={formatTime(time)} />
      )}
      
      {gameMode === 'SPRINT' && (
         <Display label="Time Elapsed" text={formatTime(time)} />
      )}
      
      {gameMode === 'MARATHON' && (
         <Display label="Current Level" text={level} progress={levelProgress} />
      )}
      
      {gameMode === 'SPRINT' && (
         <Display label="Lines Left" text={Math.max(0, 40 - rows)} progress={rows / 40} />
      )}
      
      {gameMode !== 'SPRINT' && (
         <Display label="Lines Cleared" text={rows} />
      )}
    </div>
  );
};

export default StatsPanel;