
import { 
    Trophy, Zap, Skull, Map, Clock, Flame, Calendar, Palette, 
    Bomb, RotateCcw, Sparkles, ArrowDownUp, ArrowDown, Hammer, 
    Trash2, Lock, Unlock, Layers, Shield, Eye, RotateCw, Repeat, 
    Crown, Eraser, Star, Target, Diamond, Box, Mountain, Snowflake,
    ChevronDown, HelpCircle, User, Settings, Save, Receipt, Hash,
    BarChart2, Loader2, Play, Volume2, VolumeX, Smartphone, Tablet,
    Keyboard, Gamepad2, Vibrate, RefreshCw, Dice5, Share2, PauseCircle,
    ArrowRight, Lightbulb, X, Activity, Hexagon, Cloud, Triangle
} from 'lucide-react';
import React from 'react';

const ICON_REGISTRY: Record<string, React.ElementType> = {
    // Game Modes
    'Trophy': Trophy,
    'Zap': Zap,
    'Skull': Skull,
    'Map': Map,
    'Clock': Clock,
    'Flame': Flame,
    'Calendar': Calendar,
    'Sparkles': Sparkles,
    'Brain': Activity, // Puzzle

    // Boosters & Abilities
    'Bomb': Bomb,
    'RotateCcw': RotateCcw,
    'ArrowDownUp': ArrowDownUp,
    'Palette': Palette,
    'ArrowDown': ArrowDown,
    'Hammer': Hammer,
    'Trash2': Trash2,
    
    // Achievements & Stats
    'Award': Trophy,
    'Layers': Layers,
    'Shield': Shield,
    'Eye': Eye,
    'RotateCw': RotateCw,
    'Repeat': Repeat,
    'Crown': Crown,
    'Eraser': Eraser,
    'Star': Star,
    'Target': Target,
    'Activity': Activity,

    // Modifiers
    'Diamond': Diamond,
    'Lock': Lock,
    'Unlock': Unlock,
    'Box': Box,
    'Mountain': Mountain,
    'Snowflake': Snowflake,
    'ChevronDown': ChevronDown,
    'HelpCircle': HelpCircle,

    // UI
    'User': User,
    'Settings': Settings,
    'Save': Save,
    'Receipt': Receipt,
    'Hash': Hash,
    'BarChart2': BarChart2,
    'Loader2': Loader2,
    'Play': Play,
    'Volume2': Volume2,
    'VolumeX': VolumeX,
    'Smartphone': Smartphone,
    'Tablet': Tablet,
    'Keyboard': Keyboard,
    'Gamepad2': Gamepad2,
    'Vibrate': Vibrate,
    'RefreshCw': RefreshCw,
    'Dice5': Dice5,
    'Share2': Share2,
    'PauseCircle': PauseCircle,
    'ArrowRight': ArrowRight,
    'Lightbulb': Lightbulb,
    'X': X,
    'Hexagon': Hexagon,
    'Cloud': Cloud,
    'Triangle': Triangle
};

export const getIcon = (id: string, fallback: React.ElementType = Trophy): React.ElementType => {
    return ICON_REGISTRY[id] || fallback;
};
