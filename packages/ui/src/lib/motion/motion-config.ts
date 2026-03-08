/**
 * Duration tokens for motion animations.
 * Values follow a progressive scale from instant to slow.
 */
export const DURATION = {
    /** Instant feedback: tooltips, micro-states. */
    instant: 0.1,
    /** Fast transitions: hover effects, button states. */
    fast: 0.15,
    /** Standard transitions: page elements, cards. */
    normal: 0.25,
    /** Slow transitions: modals, overlays, page changes. */
    slow: 0.4,
} as const

/**
 * Easing curves for consistent motion feel.
 */
export const EASING = {
    /** Standard ease-out for enter animations. */
    enter: [0.0, 0.0, 0.2, 1.0] as readonly [number, number, number, number],
    /** Standard ease-in for exit animations. */
    exit: [0.4, 0.0, 1.0, 1.0] as readonly [number, number, number, number],
    /** Ease-in-out for continuous motion. */
    move: [0.4, 0.0, 0.2, 1.0] as readonly [number, number, number, number],
    /** Spring-like overshoot for playful entrances. */
    spring: [0.34, 1.56, 0.64, 1.0] as readonly [number, number, number, number],
} as const

/**
 * Stagger delay between sequential child animations.
 */
export const STAGGER_DELAY = 0.06

/**
 * Reusable variant definitions for staggered children.
 */
export const STAGGER_ITEM_VARIANTS = {
    hidden: {
        opacity: 0,
        y: 12,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: DURATION.normal,
            ease: EASING.enter,
        },
    },
} as const

/**
 * Fade-in variant for simple opacity transitions.
 */
export const FADE_VARIANTS = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: DURATION.normal },
    },
    exit: {
        opacity: 0,
        transition: { duration: DURATION.fast },
    },
} as const

/**
 * Scale + fade variant for modal/overlay entrances.
 */
export const SCALE_FADE_VARIANTS = {
    hidden: {
        opacity: 0,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: DURATION.normal,
            ease: EASING.enter,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: {
            duration: DURATION.fast,
            ease: EASING.exit,
        },
    },
} as const

/**
 * Slide-up + fade variant for page transitions.
 */
export const PAGE_TRANSITION_VARIANTS = {
    initial: {
        opacity: 0,
        y: 4,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: EASING.enter,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: DURATION.fast,
        },
    },
} as const
