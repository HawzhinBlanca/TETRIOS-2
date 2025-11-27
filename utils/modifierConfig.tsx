
import React from 'react';
import { Bomb, Diamond, Zap, HelpCircle, Skull, Lock, Unlock, Box, Mountain, Clock, Snowflake, ChevronDown } from 'lucide-react';
import { MODIFIER_COLORS } from '../constants';
import { CellModifier, CellModifierType } from '../types';

export interface ModifierVisualConfig {
    icon?: React.ElementType;
    baseClass: string;
    iconClass?: string;
    animation?: string;
    getStyle?: (mod: CellModifier, isClearing?: boolean) => React.CSSProperties;
    getClass?: (mod: CellModifier, isClearing?: boolean) => string;
    borderColor: string;
}

export const MODIFIER_CONFIG: Record<CellModifierType, ModifierVisualConfig> = {
    GEM: {
        icon: Diamond,
        borderColor: MODIFIER_COLORS.GEM,
        baseClass: "bg-pink-600/80 border shadow-[0_0_15px_rgba(236,72,153,0.6)]",
        iconClass: "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]",
        animation: "ghost-pulse 2s infinite ease-in-out",
        getClass: (_, isClearing) => isClearing 
            ? "animate-[pulse_0.3s_ease-in-out_infinite] brightness-200 scale-110 z-20 shadow-[0_0_30px_rgba(236,72,153,1)] border-white" 
            : "",
        getStyle: (_, isClearing) => isClearing ? { boxShadow: `0 0 30px 10px ${MODIFIER_COLORS.GEM}` } : {}
    },
    BOMB: {
        borderColor: MODIFIER_COLORS.BOMB,
        baseClass: "bg-red-600/90 border-2 shadow-[0_0_15px_rgba(239,68,68,0.8)]",
        animation: "ghost-warning 0.5s infinite ease-in-out alternate",
        getClass: (mod, isClearing) => {
            if (isClearing) return "shadow-[0_0_40px_rgba(74,222,128,1)] border-green-400 !bg-green-500 brightness-110 scale-110 z-20 transition-colors duration-200";
            if (mod.timer !== undefined && mod.timer <= 3) return "shadow-[0_0_30px_rgba(255,50,50,0.9)] !border-white animate-[pulse_0.2s_ease-in-out_infinite] z-20";
            return "";
        },
        getStyle: () => ({ backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, transparent 80%)' })
    },
    ICE: {
        icon: Lock,
        borderColor: MODIFIER_COLORS.ICE,
        baseClass: "bg-cyan-600/80 border-2 border-solid backdrop-blur-md shadow-[inset_0_0_8px_rgba(255,255,255,0.3)]",
        iconClass: "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
        animation: "none",
        getClass: (_, isClearing) => isClearing ? "brightness-200 scale-105 border-white shadow-[0_0_30px_cyan]" : "",
    },
    CRACKED_ICE: {
        icon: Unlock,
        borderColor: MODIFIER_COLORS.CRACKED_ICE,
        baseClass: "bg-cyan-900/30 border-2 border-dashed animate-pulse backdrop-blur-sm",
        iconClass: "text-cyan-200/80",
        getStyle: () => ({
            backgroundImage: `
                linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.4) 50%, transparent 52%),
                linear-gradient(-45deg, transparent 45%, rgba(255,255,255,0.3) 50%, transparent 55%),
                radial-gradient(circle at center, rgba(6,182,212,0.1) 0%, transparent 70%)
            `,
            backgroundSize: '100% 100%, 100% 100%, cover'
        })
    },
    WILDCARD_BLOCK: {
        icon: HelpCircle,
        borderColor: MODIFIER_COLORS.WILDCARD_BLOCK,
        baseClass: "bg-yellow-600/80 border shadow-[0_0_15px_rgba(234,179,8,0.6)]",
        iconClass: "text-yellow-100 drop-shadow-md",
        animation: "ghost-pulse 1.5s infinite ease-in-out",
        getClass: (_, isClearing) => isClearing ? "brightness-150 scale-110 shadow-[0_0_30px_rgba(234,179,8,0.9)] border-white z-20" : ""
    },
    LASER_BLOCK: {
        icon: Zap,
        borderColor: MODIFIER_COLORS.LASER_BLOCK,
        baseClass: "bg-cyan-600/80 border shadow-[0_0_15px_rgba(6,182,212,0.6)]",
        iconClass: "text-cyan-100 drop-shadow-md",
        animation: "ghost-pulse 1s infinite ease-in-out",
        getClass: (_, isClearing) => isClearing ? "brightness-200 scale-110 shadow-[0_0_40px_rgba(6,182,212,1)] border-white z-20" : ""
    },
    NUKE_BLOCK: {
        icon: Skull,
        borderColor: MODIFIER_COLORS.NUKE_BLOCK,
        baseClass: "bg-fuchsia-700/90 border-2 shadow-[0_0_20px_rgba(255,0,128,0.9)]",
        iconClass: "text-white drop-shadow-lg",
        animation: "ghost-warning 0.2s infinite ease-in-out alternate",
        getClass: (_, isClearing) => isClearing ? "brightness-200 scale-110 shadow-[0_0_50px_rgba(255,0,128,1)] border-white z-20" : ""
    },
    SOFT_BLOCK: {
        icon: Box,
        borderColor: '#94a3b8', // slate-400
        baseClass: "bg-slate-600/80 border shadow-sm",
        iconClass: "text-slate-200",
        animation: "none",
        getClass: (_, isClearing) => isClearing ? "brightness-150 scale-105" : ""
    },
    BEDROCK: {
        icon: Mountain,
        borderColor: MODIFIER_COLORS.BEDROCK,
        baseClass: "bg-slate-700 border-2 border-slate-500 shadow-inner",
        iconClass: "text-slate-400",
        animation: "none",
        getClass: () => "grayscale contrast-125",
        getStyle: () => ({
            backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.2) 5px, rgba(0,0,0,0.2) 10px),
                linear-gradient(to bottom, #334155, #1e293b)
            `
        })
    },
    SLOW_BLOCK: {
        icon: Clock,
        borderColor: MODIFIER_COLORS.SLOW_BLOCK,
        baseClass: "bg-indigo-600/80 border shadow-[0_0_15px_rgba(99,102,241,0.6)]",
        iconClass: "text-indigo-100 drop-shadow-md",
        animation: "ghost-pulse 2s infinite ease-in-out",
        getClass: (_, isClearing) => isClearing ? "brightness-200 scale-110 z-20 shadow-[0_0_30px_rgba(99,102,241,1)] border-white" : ""
    },
    MULTIPLIER_BLOCK: {
        borderColor: MODIFIER_COLORS.MULTIPLIER_BLOCK,
        baseClass: "bg-yellow-600/90 border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]",
        animation: "ghost-pulse 1s infinite ease-in-out",
        getClass: (_, isClearing) => isClearing ? "brightness-150 scale-110 shadow-[0_0_40px_rgba(234,179,8,1)] border-white z-20" : ""
    },
    FREEZE_BLOCK: {
        icon: Snowflake,
        borderColor: MODIFIER_COLORS.FREEZE_BLOCK,
        baseClass: "bg-cyan-400/80 border-2 border-white shadow-[0_0_15px_rgba(165,243,252,0.8)]",
        iconClass: "text-white drop-shadow-lg animate-[spin_3s_linear_infinite]",
        animation: "ghost-pulse 1.5s infinite ease-in-out",
        getClass: (_, isClearing) => isClearing ? "brightness-150 scale-125 shadow-[0_0_50px_rgba(165,243,252,1)] z-20" : ""
    },
    DRILL_BLOCK: {
        icon: ChevronDown,
        borderColor: MODIFIER_COLORS.DRILL_BLOCK,
        baseClass: "bg-orange-600/90 border-2 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.7)]",
        iconClass: "text-white drop-shadow-md animate-bounce",
        animation: "none",
        getClass: (_, isClearing) => isClearing ? "brightness-150 scale-125 shadow-[0_0_40px_rgba(249,115,22,1)] z-20" : ""
    }
};
