/**
 * Shared animation variants for motion components.
 */

/**
 * Stagger item animation variants — fade-in with upward slide.
 * Used by metric cards, work queue cards, settings cards.
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
            duration: 0.25,
            ease: [0.0, 0.0, 0.2, 1.0],
        },
    },
} as const

/**
 * Stagger container animation variants — sequential reveal of children.
 */
export const STAGGER_CONTAINER_VARIANTS = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
} as const
