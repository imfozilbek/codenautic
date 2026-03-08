import { useReducedMotion as useMotionReducedMotion } from "motion/react"

/**
 * Hook that respects user's reduced motion system preference.
 * Wraps motion/react's useReducedMotion for consistent API.
 *
 * @returns True if the user prefers reduced motion.
 */
export function useReducedMotion(): boolean {
    return useMotionReducedMotion() === true
}
