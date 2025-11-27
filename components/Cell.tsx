
import React, { useMemo } from 'react';
import { TetrominoType, GhostStyle, CellModifier } from '../types';
import { parseRgb } from '../utils/gameUtils';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { getPieceColor } from '../utils/themeUtils';
import { MODIFIER_COLORS } from '../constants';
import CellModifierRenderer from './CellModifierRenderer';
import { GhostView, ActiveView, EmptyView } from './CellViews';

interface Props {
  type: TetrominoType | 0 | null;
  isGhost?: boolean;
  isGhostWarning?: boolean;
  isRotating?: boolean;
  lockWarning?: boolean;
  modifier?: CellModifier;
  isClearing?: boolean;
  
  // Customization Props
  ghostStyle?: GhostStyle;
  ghostOutline?: string;
  ghostOutlineThickness?: number;
  ghostAnimationDuration?: string;
  ghostShadow?: string;
  ghostOpacity?: number;
  ghostGlowIntensity?: number;
  
  children?: React.ReactNode;
}

const Cell: React.FC<Props> = ({ 
  type, 
  isGhost, 
  isGhostWarning,
  isRotating,
  lockWarning,
  modifier,
  isClearing,
  ghostStyle = 'neon',
  ghostOutlineThickness, 
  ghostOpacity = 0.6, 
  ghostGlowIntensity = 1,
  children
}) => {
  const colorblindMode = useGameSettingsStore(state => state.colorblindMode);
  
  const color = useMemo(() => {
      return type ? getPieceColor(type as TetrominoType, colorblindMode) : null;
  }, [type, colorblindMode]);

  const rgb = useMemo(() => color ? parseRgb(color) : '255,255,255', [color]);

  if (isGhost && color) {
      return <GhostView 
          rgb={rgb} 
          warning={!!isGhostWarning} 
          style={ghostStyle} 
          thickness={ghostOutlineThickness}
          opacity={ghostOpacity}
          glow={ghostGlowIntensity}
      />;
  }

  if (modifier) {
      const modifierColor = MODIFIER_COLORS[modifier.type] || '#ffffff';
      return <CellModifierRenderer modifier={modifier} isClearing={isClearing} color={modifierColor} />;
  }

  if (color) {
      return <ActiveView 
          rgb={rgb} 
          color={color} 
          rotating={!!isRotating} 
          locked={!!lockWarning}
      >
          {children}
      </ActiveView>;
  }

  return <EmptyView />;
};

export default React.memo(Cell);
