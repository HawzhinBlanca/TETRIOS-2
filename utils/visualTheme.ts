
export const VISUAL_THEME = {
    GRID: {
        COLOR: 'rgba(255, 255, 255, 0.04)',
        WIDTH: 1,
    },
    GHOST: {
        BASE_OPACITY: 0.5,
        WARNING_OPACITY_MIN: 0.6,
        WARNING_OPACITY_AMP: 0.4,
        NEON_PULSE_BASE: 0.7,
        NEON_PULSE_AMP: 0.3,
        BLUR_MULTIPLIER: 8,
        WARNING_BLUR: 15,
    },
    BLOCK: {
        BEVEL_TOP_ALPHA: 0.25,
        BEVEL_SHADOW_ALPHA: 0.15,
        INNER_GLOW_ALPHA: 0.1,
        GARBAGE_COLOR: '#64748b',
    },
    MODIFIER: {
        RADIUS_RATIO: 0.3,
        FONT_SIZE_RATIO: 0.5,
    },
    OVERLAY: {
        COMBO_B2B_ALPHA: 0.03,
        GARBAGE_ALPHA: 0.1,
        FRENZY_ALPHA: 0.05,
        SELECTION_ALPHA: 0.3,
        ZONE_ALPHA: 0.1,
    },
    TEXT: {
        SCALE_DEFAULT: 0.5,
        SCALE_B2B: 0.7,
        FLOAT_SPEED: 0.05,
        FLIPPED_FLOAT_SPEED: 0.05,
    },
    SPRITE: {
        GLOW_SCALE: 2.5,
    },
    // Evolving Themes
    THEMES: [
        { threshold: 0, name: 'VOID', background: 'radial-gradient(circle at 50% -10%, #0f172a 0%, #000000 80%)' },
        { threshold: 5, name: 'DAWN', background: 'radial-gradient(circle at 50% -10%, #4c1d95 0%, #1e1b4b 80%)' },
        { threshold: 10, name: 'CYBER', background: 'radial-gradient(circle at 50% -10%, #0e7490 0%, #0f172a 80%)' },
        { threshold: 15, name: 'ASCENSION', background: 'radial-gradient(circle at 50% -10%, #d946ef 0%, #4c1d95 80%)' },
    ]
};
