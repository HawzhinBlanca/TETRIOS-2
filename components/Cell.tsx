
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
  
  // Customization Props (Optional overrides)
  ghostStyle?: GhostStyle;
  ghostOutlineThickness?: number;
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
  ghostStyle: propGhostStyle,
  ghostOutlineThickness: propGhostThickness, 
  ghostOpacity: propGhostOpacity, 
  ghostGlowIntensity: propGhostGlow,
  children
}) => {
  // OPTIMIZATION: Individual selectors prevent re-renders when unrelated settings change
  const colorblindMode = useGameSettingsStore(state => state.colorblindMode);
  const blockGlowIntensity = useGameSettingsStore(state => state.blockGlowIntensity);
  const blockSkin = useGameSettingsStore(state => state.blockSkin);
  const storeGhostStyle = useGameSettingsStore(state => state.ghostStyle);
  const storeGhostOpacity = useGameSettingsStore(state => state.ghostOpacity);
  const storeGhostThickness = useGameSettingsStore(state => state.ghostOutlineThickness);
  const storeGhostGlow = useGameSettingsStore(state => state.ghostGlowIntensity);
  
  // Use props if provided, else fall back to store settings
  const ghostStyle = propGhostStyle ?? storeGhostStyle;
  const ghostOpacity = propGhostOpacity ?? storeGhostOpacity;
  const ghostThickness = propGhostThickness ?? storeGhostThickness;
  const ghostGlow = propGhostGlow ?? storeGhostGlow;

  const color = useMemo(() => {
      return type ? getPieceColor(type as TetrominoType, colorblindMode) : null;
  }, [type, colorblindMode]);

  const rgb = useMemo(() => color ? parseRgb(color) : '255,255,255', [color]);

  if (isGhost && color) {
      return <GhostView 
          rgb={rgb} 
          warning={!!isGhostWarning} 
          style={ghostStyle} 
          thickness={ghostThickness}
          opacity={ghostOpacity}
          glow={ghostGlow}
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
          glowIntensity={blockGlowIntensity}
          skin={blockSkin}
          type={type}
      >
          {children}
      </ActiveView>;
  }

  return <EmptyView />;
};

export default React.memo(Cell);
