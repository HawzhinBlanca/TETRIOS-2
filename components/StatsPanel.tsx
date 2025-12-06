
import React, { useRef, useEffect } from 'react';
import StatRow from './ui/StatRow';
import ProgressBar from './ui/ProgressBar';
import PanelHeader from './ui/PanelHeader';
import GlassPanel from './ui/GlassPanel';
import RollingNumber from './ui/RollingNumber';
import { Label, Value } from './ui/Text';
import { GameMode, AdventureLevelConfig, GameStats, LevelObjectiveType } from '../types';
import { FOCUS_GAUGE_MAX, MOMENTUM_MAX } from '../constants';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { Delta } from './ui/Delta';
import { useGameContext } from '../contexts/GameContext';
import { formatTime } from '../utils/formatters';
import { getIcon } from '../utils/icons';
import ActiveEffectsList from './ActiveEffectsList';

interface Props {
  gameStats: GameStats; 
  gameMode: GameMode;
  adventureLevelConfig?: AdventureLevelConfig;
  blitzSpeedThresholdIndex?: number; 
}

const StatsPanel: React.FC<Props> = React.memo(({ 
    gameStats, gameMode, adventureLevelConfig
}) => {
  const { 
      score, rows, level, time, movesTaken, gemsCollected, bombsDefused, 
      tetrisesAchieved, tspinsAchieved, combosAchieved, bossHp,
      focusGauge, isZoneActive, zoneLines, colorClears,
      perfectDropStreak, momentum, isOverdriveActive
  } = gameStats;

  const scoreDelta = useAnimatedValue(score);
  const levelProgress: number = (rows % 10) / 10;
  
  // Refs for fast updates
  const timeRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  
  const { engine } = useGameContext();

  // Transient Subscriptions
  useEffect(() => {
      if (!engine.current) return;
      
      const handleFastUpdate = (newScore: number, newTime: number) => {
          // We let React handle score via RollingNumber for smoothness, 
          // but Time needs direct DOM manip for high FPS updates to avoid jitter
          if (timeRef.current && (gameMode === 'SPRINT' || gameMode === 'BLITZ' || gameMode === 'TIME_ATTACK')) {
              timeRef.current.textContent = formatTime(newTime);
          }
      };

      const handleGauge = (val: number) => {
          if (gaugeRef.current && !isZoneActive) {
              const pct = Math.min(100, (val / FOCUS_GAUGE_MAX) * 100);
              gaugeRef.current.style.width = `${pct}%`;
          }
      };
      
      engine.current.events.on('FAST_SCORE', ({ score, time }) => handleFastUpdate(score, time));
      engine.current.events.on('FAST_GAUGE', ({ value }) => handleGauge(value));
      
      return () => {};
  }, [engine, gameMode, isZoneActive]);

  const renderAdventureObjective = () => {
    if (!adventureLevelConfig) return null;

    const objectiveType: LevelObjectiveType = adventureLevelConfig.objective.type;
    const target: number = adventureLevelConfig.objective.target;
    let currentProgress: number = 0;
    let label: string = '';
    let text: React.ReactNode = '';
    let progressRatio: number | undefined = undefined;
    let iconName = 'Target';

    switch (objectiveType) {
        case 'LINES': currentProgress = rows; label = 'Lines Cleared'; iconName = 'Layers'; break;
        case 'SCORE': currentProgress = score; label = 'Score Target'; iconName = 'Trophy'; break;
        case 'TIME_SURVIVAL': 
            label = 'Survive Time'; 
            text = formatTime(time); 
            progressRatio = time / (adventureLevelConfig.constraints?.timeLimit || 60); 
            iconName = 'Clock';
            break;
        case 'GEMS': currentProgress = gemsCollected || 0; label = 'Collect Gems'; break;
        case 'BOMBS': currentProgress = bombsDefused || 0; label = 'Defuse Bombs'; iconName = 'Zap'; break;
        case 'TETRIS': currentProgress = tetrisesAchieved || 0; label = 'Tetris Clears'; break;
        case 'TSPIN': currentProgress = tspinsAchieved || 0; label = 'T-Spin Clears'; break;
        case 'COMBO': currentProgress = combosAchieved || 0; label = 'Max Combo'; break;
        case 'BOSS': 
            currentProgress = bossHp !== undefined ? bossHp : target; 
            label = 'Boss Health'; 
            text = `${currentProgress} / ${target}`; 
            progressRatio = currentProgress / target;
            iconName = 'Skull';
            break; 
        case 'MOVES': currentProgress = movesTaken || 0; label = 'Moves Used'; break;
        case 'B2B_CHAIN': currentProgress = gameStats.maxB2BChain || 0; label = 'B2B Chain'; break;
        case 'COLOR_MATCH':
            const targetColor = adventureLevelConfig.objective.targetColor;
            currentProgress = targetColor && colorClears ? (colorClears[targetColor] || 0) : 0;
            label = 'Color Match';
            iconName = 'Palette';
            break;
    }

    if (objectiveType !== 'TIME_SURVIVAL' && objectiveType !== 'BOSS') {
        text = <><RollingNumber value={currentProgress} /> / {target}</>;
        progressRatio = Math.min(1, currentProgress / target);
    }

    const movesLimit = adventureLevelConfig.constraints?.movesLimit;
    const timeLimit = adventureLevelConfig.constraints?.timeLimit;

    return (
      <GlassPanel variant="cyan" intensity="low" className="mb-6 p-5 border-l-4 border-l-cyan-500 relative overflow-hidden bg-cyan-950/30 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"></div>
          
          <PanelHeader title="Mission Objective" icon={getIcon(iconName)} className="mb-4" textColor="text-cyan-300" />
          
          <div className="flex justify-between items-end mb-3">
              <div className="flex flex-col">
                  <Label className="text-cyan-400/70 text-[10px] font-bold tracking-wide">{label}</Label>
                  {objectiveType === 'COLOR_MATCH' && adventureLevelConfig.objective.targetColor && (
                      <div className="mt-1 flex items-center gap-1">
                          <div className="w-3 h-3 rounded-sm border border-white/20" style={{ backgroundColor: adventureLevelConfig.objective.targetColor }}></div>
                          <span className="text-[10px] text-gray-400 font-mono">TARGET</span>
                      </div>
                  )}
              </div>
              <Value size="xl" className="text-white drop-shadow-lg tabular-nums" glow>{text}</Value>
          </div>
          {progressRatio !== undefined && (
              <div className="mb-4">
                  <ProgressBar 
                      progress={progressRatio} 
                      fillClassName={objectiveType === 'BOSS' ? "bg-red-500 shadow-[0_0_15px_red]" : "bg-cyan-400 shadow-[0_0_15px_cyan]"}
                      trackClassName="bg-black/40 border border-white/10"
                      height="h-2" 
                  />
              </div>
          )}

          <div className="flex gap-3 mt-2 pt-3 border-t border-cyan-500/20">
              {movesLimit !== undefined && (
                  <div className="flex-1 flex items-center justify-between bg-black/20 rounded px-3 py-2 border border-white/5">
                      <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Moves</span>
                      <span className={`font-mono text-sm font-bold tabular-nums ${(movesLimit - (movesTaken||0)) < 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{Math.max(0, movesLimit - (movesTaken || 0))}</span>
                  </div>
              )}
              {timeLimit !== undefined && objectiveType !== 'TIME_SURVIVAL' && (
                  <div className="flex-1 flex items-center justify-between bg-black/20 rounded px-3 py-2 border border-white/5">
                      <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Time</span>
                      <span className={`font-mono text-sm font-bold tabular-nums ${time < 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{formatTime(time)}</span>
                  </div>
              )}
          </div>
      </GlassPanel>
    );
  };

  const isFocusReady = focusGauge >= FOCUS_GAUGE_MAX;

  return (
    <div className="w-full flex flex-col gap-1 select-none" aria-live="polite" aria-atomic="true" role="region" aria-label="Game Statistics Panel">
      
      <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
          <ActiveEffectsList stats={gameStats} />
      </div>
      
      {gameMode === 'ADVENTURE' && renderAdventureObjective()}

      <div className={`space-y-1 transition-all duration-300 ${isZoneActive ? 'opacity-100' : 'opacity-100'}`}>
          {gameMode !== 'ZEN' && (
              <div className="pb-6 mb-4 relative">
                  <div className="flex items-center gap-2 mb-1">
                      {React.createElement(getIcon('Trophy'), { size: 14, className: "text-cyan-500" })}
                      <Label className="text-cyan-500/80">Total Score</Label>
                  </div>
                  <div className="relative flex flex-col items-end">
                      <div className="font-mono font-bold tabular-nums leading-none tracking-tight text-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] [text-shadow:0_0_5px_currentColor,0_0_15px_currentColor]">
                          <RollingNumber value={score} />
                      </div>
                      <div className="absolute top-0 right-0 transform -translate-y-full pointer-events-none h-6">
                         <Delta value={scoreDelta} />
                      </div>
                  </div>
                  
                  {/* Perfect Drop Indicator */}
                  {perfectDropStreak !== undefined && perfectDropStreak > 1 && (
                      <div className="absolute -bottom-2 right-0 flex items-center gap-1 animate-pulse">
                          <span className="text-[9px] font-black uppercase text-yellow-400 tracking-widest bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-500/30 shadow-[0_0_10px_gold]">
                              Rhythm Chain x{perfectDropStreak}
                          </span>
                      </div>
                  )}
              </div>
          )}

          <div className="space-y-0 bg-black/20 rounded-xl border border-white/5 p-3">
            {(gameMode === 'TIME_ATTACK' || gameMode === 'SPRINT' || gameMode === 'SURVIVAL' || gameMode === 'COMBO_MASTER' || gameMode === 'BLITZ') && (
                <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2 text-gray-400">
                        {React.createElement(getIcon('Clock'), { size: 14, className: "text-cyan-500/70" })}
                        <Label>
                            {gameMode === 'SPRINT' || gameMode === 'SURVIVAL' ? 'Time' : 'Time Left'}
                        </Label>
                    </div>
                    <div className="text-right">
                        <div ref={timeRef} className="font-mono font-bold tabular-nums leading-none tracking-tight text-base text-white">
                            {formatTime(time)}
                        </div>
                    </div>
                </div>
            )}

            {gameMode !== 'SPRINT' && gameMode !== 'ADVENTURE' && (
                <StatRow label="Lines" value={rows} icon={getIcon('Layers')} />
            )}
          </div>

          {(gameMode === 'MARATHON' || gameMode === 'SURVIVAL' || gameMode === 'COMBO_MASTER' || gameMode === 'MASTER') && (
              <div className="py-5 px-4 flex items-center justify-center mt-6 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl border border-white/5">
                  <div className="flex gap-4 w-full">
                      <div className="flex-1">
                          <Label className="text-purple-400/80 mb-1">Level</Label>
                          <Value size="3xl" className="text-white drop-shadow-md tabular-nums" glow>{level}</Value>
                      </div>
                      
                      <div className="w-12 h-12 relative flex items-center justify-center group">
                          <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-md group-hover:bg-cyan-500/20 transition-colors"></div>
                          <svg className="w-full h-full -rotate-90 drop-shadow-lg overflow-visible">
                              <defs>
                                  <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor="#22d3ee" />
                                      <stop offset="100%" stopColor="#3b82f6" />
                                  </linearGradient>
                              </defs>
                              <circle cx="24" cy="24" r="10" className="stroke-gray-800 fill-none" strokeWidth="3"></circle>
                              <circle 
                                cx="24" cy="24" r="10" 
                                className="fill-none transition-all duration-500 ease-out" 
                                stroke="url(#levelGradient)"
                                strokeWidth="3" 
                                strokeDasharray="62.83" 
                                strokeDashoffset={62.83 - (62.83 * levelProgress)}
                                strokeLinecap="round"
                              ></circle>
                          </svg>
                      </div>
                  </div>
              </div>
          )}
          
          {/* Momentum Meter */}
          <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center mb-2">
                  <Label className={isOverdriveActive ? "text-orange-400 animate-pulse" : "text-gray-400"}>Momentum</Label>
                  <span className={`text-[9px] font-bold ${isOverdriveActive ? "text-orange-400" : "text-gray-500"}`}>
                      {isOverdriveActive ? "OVERDRIVE" : Math.floor(momentum)}
                  </span>
              </div>
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                  <div 
                      className={`h-full transition-all duration-200 ${isOverdriveActive ? "bg-orange-500 shadow-[0_0_15px_orange]" : "bg-gradient-to-r from-blue-500 to-cyan-400"}`}
                      style={{ width: isOverdriveActive ? '100%' : `${(momentum / MOMENTUM_MAX) * 100}%` }}
                  />
              </div>
          </div>
          
          {/* Rizz Meter (Focus Gauge) */}
          <div className={`mt-4 transition-all duration-500 ${isZoneActive ? 'scale-105 brightness-125' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                  <div className={`flex items-center gap-2 ${isZoneActive || isFocusReady ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {React.createElement(getIcon('Eye'), { size: 14, className: isFocusReady || isZoneActive ? "text-yellow-400 animate-pulse filter drop-shadow-[0_0_5px_gold]" : "text-gray-500" })}
                      <Label className={isZoneActive ? "text-yellow-100" : (isFocusReady ? "text-yellow-400" : "")}>
                          {isZoneActive ? 'MAIN CHARACTER' : (isFocusReady ? 'MAX RIZZ' : 'RIZZ METER')}
                      </Label>
                  </div>
                  <div className={`text-[10px] font-bold tracking-widest tabular-nums ${isFocusReady ? "text-yellow-400 animate-pulse" : "text-gray-500"}`}>
                      {isZoneActive ? `${zoneLines} LINES` : (isFocusReady ? 'PRESS V' : `${Math.floor(focusGauge)}%`)}
                  </div>
              </div>
              <div className={`rounded-full p-[2px] bg-black/60 border border-white/10 ${isFocusReady && !isZoneActive ? 'ring-2 ring-yellow-500/50 ring-offset-1 ring-offset-black animate-pulse border-yellow-500/50' : ''}`}>
                  <div className="w-full h-2 bg-transparent rounded-full overflow-hidden relative">
                        <div 
                            ref={gaugeRef}
                            className={`h-full absolute top-0 left-0 transition-all duration-200 ${isZoneActive ? "bg-white shadow-[0_0_20px_gold]" : (isFocusReady ? "bg-gradient-to-r from-yellow-400 to-yellow-200 shadow-[0_0_15px_gold]" : "bg-gradient-to-r from-purple-600 to-purple-400")}`}
                            style={{ width: isZoneActive ? '100%' : `${(focusGauge / FOCUS_GAUGE_MAX) * 100}%` }}
                        />
                  </div>
              </div>
              {isZoneActive && <div className="text-[9px] text-center text-yellow-200/70 mt-2 uppercase tracking-widest font-bold animate-pulse">Gravity Suspended</div>}
          </div>

          {gameMode === 'SPRINT' && (
              <div className="py-3 px-3 bg-black/20 rounded-lg mt-4 border border-white/5">
                  <div className="flex justify-between mb-2">
                      <Label className="text-gray-500">Lines Remaining</Label>
                      <Value size="sm" className="tabular-nums">{Math.max(0, 40 - rows)}</Value>
                  </div>
                  <ProgressBar progress={rows/40} fillClassName="bg-green-500" height="h-1.5" />
              </div>
          )}
      </div>
    </div>
  );
});

export default StatsPanel;
