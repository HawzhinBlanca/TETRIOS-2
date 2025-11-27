
import React, { useRef, useEffect } from 'react';
import StatRow from './ui/StatRow';
import ProgressBar from './ui/ProgressBar';
import EffectBar from './ui/EffectBar';
import PanelHeader from './ui/PanelHeader';
import GlassPanel from './ui/GlassPanel';
import { Label, Value } from './ui/Text';
import { GameMode, AdventureLevelConfig, GameStats, LevelObjectiveType } from '../types';
import { FRENZY_DURATION_MS, FOCUS_GAUGE_MAX } from '../constants';
import { Clock, Target, Zap, Eye, Trophy, Layers, Skull, Palette } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { Delta } from './ui/Delta';
import { useGameContext } from '../contexts/GameContext';

interface Props {
  gameStats: GameStats; 
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
      tetrisesAchieved, tspinsAchieved, combosAchieved, isFrenzyActive, frenzyTimer, 
      slowTimeActive, slowTimeTimer, flippedGravityActive, flippedGravityTimer, bossHp,
      focusGauge, isZoneActive, zoneTimer, zoneLines, colorClears,
      scoreMultiplierActive, scoreMultiplierTimer,
      timeFreezeActive, timeFreezeTimer
  } = gameStats;

  const scoreDelta = useAnimatedValue(score);
  const levelProgress: number = (rows % 10) / 10;
  
  // Refs for fast updates
  const scoreRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  
  const { engine } = useGameContext();

  // Transient Subscriptions
  useEffect(() => {
      if (!engine.current) return;
      
      const handleScore = (newScore: number, newTime: number) => {
          if (scoreRef.current) scoreRef.current.textContent = newScore.toLocaleString();
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
      
      engine.current.events.on('FAST_SCORE', ({ score, time }) => handleScore(score, time));
      engine.current.events.on('FAST_GAUGE', ({ value }) => handleGauge(value));
      
      // Clean up listeners isn't strictly necessary here as component lifespan matches game session
      // but good practice for complex apps
      return () => {};
  }, [engine, gameMode, isZoneActive]);

  const renderActiveEffects = () => {
      const effects = [];
      if (isFrenzyActive) effects.push({ label: 'FRENZY', progress: frenzyTimer! / FRENZY_DURATION_MS, color: 'text-yellow-400', barColor: 'bg-yellow-500' });
      if (slowTimeActive) effects.push({ label: 'SLOW TIME', progress: slowTimeTimer! / 30000, color: 'text-indigo-400', barColor: 'bg-indigo-500' });
      if (flippedGravityActive) effects.push({ label: 'ANTI-GRAVITY', progress: flippedGravityTimer! / 15000, color: 'text-blue-400', barColor: 'bg-blue-500' });
      if (scoreMultiplierActive) effects.push({ label: 'DOUBLE SCORE', progress: scoreMultiplierTimer! / 15000, color: 'text-yellow-300', barColor: 'bg-yellow-400' });
      if (timeFreezeActive) effects.push({ label: 'TIME FREEZE', progress: timeFreezeTimer! / 10000, color: 'text-cyan-200', barColor: 'bg-cyan-200' });
      
      if (isZoneActive) {
          effects.push({ label: 'HYPER FOCUS', progress: zoneTimer / 15000, color: 'text-white', barColor: 'bg-white' }); 
      }

      if (effects.length === 0) return null;

      return (
          <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
              {effects.map((eff, i) => (
                  <EffectBar 
                    key={i}
                    label={eff.label}
                    progress={eff.progress}
                    colorClass={eff.color}
                    barColorClass={eff.barColor}
                  />
              ))}
          </div>
      );
  };

  const renderAdventureObjective = () => {
    if (!adventureLevelConfig) return null;

    const objectiveType: LevelObjectiveType = adventureLevelConfig.objective.type;
    const target: number = adventureLevelConfig.objective.target;
    let currentProgress: number = 0;
    let label: string = '';
    let text: string | number = '';
    let progressRatio: number | undefined = undefined;
    let icon = Target;

    switch (objectiveType) {
        case 'LINES': currentProgress = rows; label = 'Lines Cleared'; icon = Layers; break;
        case 'SCORE': currentProgress = score; label = 'Score Target'; icon = Trophy; break;
        case 'TIME_SURVIVAL': 
            label = 'Survive Time'; 
            text = formatTime(time); 
            progressRatio = time / (adventureLevelConfig.constraints?.timeLimit || 60); 
            icon = Clock;
            break;
        case 'GEMS': currentProgress = gemsCollected || 0; label = 'Collect Gems'; break;
        case 'BOMBS': currentProgress = bombsDefused || 0; label = 'Defuse Bombs'; icon = Zap; break;
        case 'TETRIS': currentProgress = tetrisesAchieved || 0; label = 'Tetris Clears'; break;
        case 'TSPIN': currentProgress = tspinsAchieved || 0; label = 'T-Spin Clears'; break;
        case 'COMBO': currentProgress = combosAchieved || 0; label = 'Max Combo'; break;
        case 'BOSS': 
            currentProgress = bossHp !== undefined ? bossHp : target; 
            label = 'Boss Health'; 
            text = `${currentProgress} / ${target}`; 
            progressRatio = currentProgress / target;
            icon = Skull;
            break; 
        case 'MOVES': currentProgress = movesTaken || 0; label = 'Moves Used'; break;
        case 'B2B_CHAIN': currentProgress = gameStats.maxB2BChain || 0; label = 'B2B Chain'; break;
        case 'COLOR_MATCH':
            const targetColor = adventureLevelConfig.objective.targetColor;
            currentProgress = targetColor && colorClears ? (colorClears[targetColor] || 0) : 0;
            label = 'Color Match';
            icon = Palette;
            break;
    }

    if (objectiveType !== 'TIME_SURVIVAL' && objectiveType !== 'BOSS') {
        text = `${currentProgress} / ${target}`;
        progressRatio = Math.min(1, currentProgress / target);
    }

    const movesLimit = adventureLevelConfig.constraints?.movesLimit;
    const timeLimit = adventureLevelConfig.constraints?.timeLimit;

    return (
      <GlassPanel variant="cyan" intensity="low" className="mb-6 p-5 border-l-4 border-l-cyan-500 relative overflow-hidden bg-cyan-950/30 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"></div>
          
          <PanelHeader title="Mission Objective" icon={icon} className="mb-4" textColor="text-cyan-300" />
          
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
      {renderActiveEffects()}
      
      {gameMode === 'ADVENTURE' && renderAdventureObjective()}

      <div className={`space-y-1 transition-all duration-300 ${isZoneActive ? 'opacity-60 grayscale' : 'opacity-100'}`}>
          {gameMode !== 'ZEN' && (
              <div className="pb-6 mb-4 relative">
                  <div className="flex items-center gap-2 mb-1">
                      <Trophy size={14} className="text-cyan-500" />
                      <Label className="text-cyan-500/80">Total Score</Label>
                  </div>
                  <div className="relative flex flex-col items-end">
                      {/* Use ref for score to update without re-render */}
                      <div ref={scoreRef} className="font-mono font-bold tabular-nums leading-none tracking-tight text-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] [text-shadow:0_0_5px_currentColor,0_0_15px_currentColor]">
                          {score.toLocaleString()}
                      </div>
                      <div className="absolute top-0 right-0 transform -translate-y-full pointer-events-none h-6">
                         <Delta value={scoreDelta} />
                      </div>
                  </div>
              </div>
          )}

          <div className="space-y-0 bg-black/20 rounded-xl border border-white/5 p-3">
            {(gameMode === 'TIME_ATTACK' || gameMode === 'SPRINT' || gameMode === 'SURVIVAL' || gameMode === 'COMBO_MASTER' || gameMode === 'BLITZ') && (
                <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={14} className="text-cyan-500/70" />
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
                <StatRow label="Lines" value={rows} icon={Layers} />
            )}
          </div>

          {(gameMode === 'MARATHON' || gameMode === 'SURVIVAL' || gameMode === 'COMBO_MASTER' || gameMode === 'MASTER') && (
              <div className="py-5 px-4 flex items-center justify-between mt-6 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl border border-white/5">
                  <div>
                      <Label className="text-purple-400/80 mb-1">Level</Label>
                      <Value size="3xl" className="text-white drop-shadow-md tabular-nums" glow>{level}</Value>
                  </div>
                  
                  <div className="w-16 h-16 relative flex items-center justify-center group">
                      <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-md group-hover:bg-cyan-500/20 transition-colors"></div>
                      <svg className="w-full h-full -rotate-90 drop-shadow-lg overflow-visible">
                          <defs>
                              <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#22d3ee" />
                                  <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                          </defs>
                          <circle cx="32" cy="32" r="14" className="stroke-gray-800 fill-none" strokeWidth="3"></circle>
                          <circle 
                            cx="32" cy="32" r="14" 
                            className="fill-none transition-all duration-500 ease-out" 
                            stroke="url(#levelGradient)"
                            strokeWidth="3" 
                            strokeDasharray="87.96" 
                            strokeDashoffset={87.96 - (87.96 * levelProgress)}
                            strokeLinecap="round"
                          ></circle>
                      </svg>
                      <div className="absolute text-[10px] font-bold text-cyan-100 tracking-tighter tabular-nums">{Math.round(levelProgress*100)}%</div>
                  </div>
              </div>
          )}
          
          {/* Focus Gauge (Zone) */}
          <div className={`mt-8 pt-5 border-t border-white/5 transition-all duration-500 ${isZoneActive ? 'scale-105 brightness-125' : ''}`}>
              <div className="flex justify-between items-center mb-3">
                  <div className={`flex items-center gap-2 ${isZoneActive || isFocusReady ? 'text-yellow-400' : 'text-gray-400'}`}>
                      <Eye size={16} className={isFocusReady || isZoneActive ? "text-yellow-400 animate-pulse filter drop-shadow-[0_0_5px_gold]" : "text-gray-500"} />
                      <Label className={isZoneActive ? "text-yellow-100" : (isFocusReady ? "text-yellow-400" : "")}>
                          {isZoneActive ? 'ZONE ACTIVE' : (isFocusReady ? 'ZONE READY' : 'FOCUS')}
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
                            className={`h-full absolute top-0 left-0 transition-all duration-200 ${isZoneActive ? "bg-white shadow-[0_0_20px_gold]" : (isFocusReady ? "bg-gradient-to-r from-yellow-400 to-yellow-200 shadow-[0_0_15px_gold]" : "bg-gray-600")}`}
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
