
import React from 'react';
import Display from './Display';
import { GameMode, AdventureLevelConfig, GameStats, LevelObjectiveType } from '../types';
import { FRENZY_DURATION_MS } from '../constants';
import { Clock, Sparkles, Bomb, ArrowDownUp } from 'lucide-react';

interface Props {
  gameStats: GameStats; // Consolidated stats
  gameMode: GameMode;
  adventureLevelConfig?: AdventureLevelConfig;
  blitzSpeedThresholdIndex?: number; 
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

const StatsPanel: React.FC<Props> = React.memo(({ 
    gameStats, gameMode, adventureLevelConfig
}) => {
  const { 
      score, rows, level, time, movesTaken, gemsCollected, bombsDefused, 
      tetrisesAchieved, combosAchieved, isFrenzyActive, frenzyTimer, 
      slowTimeActive, slowTimeTimer, wildcardAvailable, bombBoosterReady, 
      lineClearerActive, flippedGravityActive, flippedGravityTimer 
  } = gameStats;

  const levelProgress: number = (rows % 10) / 10;

  const renderAdventureObjective = () => {
    if (!adventureLevelConfig) return null;

    const objectiveType: LevelObjectiveType = adventureLevelConfig.objective.type;
    const target: number = adventureLevelConfig.objective.target;
    let currentProgress: number = 0;
    let label: string = '';
    let text: string | number = '';
    let progressRatio: number | undefined = undefined;

    switch (objectiveType) {
        case 'LINES':
            currentProgress = rows;
            label = 'Lines Clear';
            text = `${currentProgress}/${target}`;
            progressRatio = currentProgress / target;
            break;
        case 'SCORE':
            currentProgress = score;
            label = 'Score Goal';
            text = `${currentProgress}/${target}`;
            progressRatio = currentProgress / target;
            break;
        case 'TIME_SURVIVAL':
            label = 'Survive For';
            text = formatTime(time); 
            progressRatio = (time) / adventureLevelConfig.constraints!.timeLimit!; 
            break;
        case 'GEMS':
            currentProgress = gemsCollected || 0;
            label = 'Gems Collect';
            text = `${currentProgress}/${target}`;
            progressRatio = currentProgress / target;
            break;
        case 'BOMBS':
            currentProgress = bombsDefused || 0;
            label = 'Bombs Defused';
            text = `${currentProgress}/${target}`;
            progressRatio = currentProgress / target;
            break;
        case 'TETRIS':
            currentProgress = tetrisesAchieved || 0;
            label = 'Tetrises';
            text = `${currentProgress}/${target}`;
            progressRatio = currentProgress / target;
            break;
        case 'COMBO':
            currentProgress = combosAchieved || 0;
            label = 'Max Combo';
            text = `${currentProgress}/${target}`;
            progressRatio = currentProgress / target;
            break;
        case 'BOSS':
            label = 'Boss Battle';
            text = `HP: ${target}`; 
            break;
        case 'MOVES': 
            currentProgress = movesTaken || 0;
            label = 'Moves Taken';
            text = `${currentProgress}/${target}`;
            progressRatio = currentProgress / target; 
            break;
    }

    const movesLimit = adventureLevelConfig.constraints?.movesLimit;
    const timeLimit = adventureLevelConfig.constraints?.timeLimit;

    return (
      <>
        <Display label="Objective" text={text} progress={progressRatio} aria-label={`${label}: ${text}`} />
        {movesLimit !== undefined && (
          <Display label="Moves Left" text={`${Math.max(0, movesLimit - (movesTaken || 0))}/${movesLimit}`} progress={1 - ((movesTaken || 0) / movesLimit)} aria-label={`Moves left: ${Math.max(0, movesLimit - (movesTaken || 0))} out of ${movesLimit}`} />
        )}
        {timeLimit !== undefined && objectiveType !== 'TIME_SURVIVAL' && (
             <Display label="Time Left" text={formatTime(time)} progress={time / timeLimit} aria-label={`Time left: ${formatTime(time)} out of ${formatTime(timeLimit)}`} />
        )}
      </>
    );
  };

  return (
    <div className="w-full max-w-[240px] flex flex-col gap-2" aria-live="polite" aria-atomic="true" role="region" aria-label="Game Statistics Panel">
      {isFrenzyActive && frenzyTimer !== undefined && (
        <Display label="FRENZY MODE" text={formatTime(frenzyTimer / 1000)} progress={frenzyTimer / FRENZY_DURATION_MS} />
      )}
      {slowTimeActive && slowTimeTimer !== undefined && (
        <Display label="SLOW TIME" icon={<Clock size={16} />} text={formatTime(slowTimeTimer / 1000)} progress={slowTimeTimer / 30000} /> 
      )}
      {wildcardAvailable && (
        <Display label="WILDCARD!" icon={<Sparkles size={16} />} text="Ready" />
      )}
      {bombBoosterReady && ( 
        <Display label="BOMB BOOSTER" icon={<Bomb size={16} />} text="Ready" />
      )}
      {lineClearerActive && ( 
        <Display label="LINE CLEARER" icon={<Sparkles size={16} />} text="Ready" />
      )}
      {flippedGravityActive && flippedGravityTimer !== undefined && ( 
        <Display label="FLIPPED GRAVITY" icon={<ArrowDownUp size={16} />} text={formatTime(flippedGravityTimer / 1000)} progress={flippedGravityTimer / 15000} /> 
      )}

      {gameMode === 'ADVENTURE' ? (
        renderAdventureObjective()
      ) : gameMode === 'ZEN' ? (
         <Display label="Zen Mode" text="∞" aria-label="Current game mode is Zen, infinite gameplay." />
      ) : (
         <Display label="Score Data" text={score} aria-label={`Current score is ${score}`} />
      )}
      
      {gameMode === 'TIME_ATTACK' && (
         <Display label="Time Remaining" text={formatTime(time)} aria-label={`Time remaining is ${formatTime(time)}`} />
      )}
      
      {gameMode === 'SPRINT' && (
         <Display label="Time Elapsed" text={formatTime(time)} aria-label={`Time elapsed is ${formatTime(time)}`} />
      )}

      {gameMode === 'SURVIVAL' && (
         <Display label="Time Survived" text={formatTime(time)} aria-label={`Time survived is ${formatTime(time)}`} />
      )}

      {gameMode === 'COMBO_MASTER' && (
         <Display label="Time Left" text={formatTime(time)} aria-label={`Time left is ${formatTime(time)}`} />
      )}
      
      {(gameMode === 'MARATHON' || gameMode === 'SURVIVAL' || gameMode === 'COMBO_MASTER') && (
         <Display label="Current Level" text={level} progress={levelProgress} aria-label={`Current level is ${level}, progress to next level ${Math.round(levelProgress * 100)} percent`} />
      )}
      
      {gameMode === 'SPRINT' && (
         <Display label="Lines Left" text={Math.max(0, 40 - rows)} progress={rows / 40} aria-label={`${Math.max(0, 40 - rows)} lines left to clear, ${Math.round((rows / 40) * 100)} percent complete`} />
      )}
      
      {gameMode !== 'SPRINT' && gameMode !== 'ADVENTURE' && ( 
         <Display label="Lines Cleared" text={rows} aria-label={`Total lines cleared ${rows}`} />
      )}
    </div>
  );
});

export default StatsPanel;