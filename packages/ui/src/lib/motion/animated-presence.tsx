import { type ReactElement, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"

import { DURATION, EASING } from "./motion-config"
import { useReducedMotion } from "./use-reduced-motion"

/**
 * Props for the AnimatedAlert wrapper.
 */
export interface IAnimatedAlertProps {
    /** Whether the alert is visible. */
    readonly isVisible: boolean
    /** Alert content. */
    readonly children: ReactNode
    /** Additional CSS classes. */
    readonly className?: string
}

/**
 * Wraps alert/banner content with enter/exit animations (opacity + height).
 * Respects prefers-reduced-motion.
 *
 * @param props Configuration.
 * @returns Animated wrapper for conditional alerts.
 */
export function AnimatedAlert(props: IAnimatedAlertProps): ReactElement {
    const prefersReducedMotion = useReducedMotion()

    if (prefersReducedMotion) {
        if (props.isVisible !== true) {
            return <></>
        }

        return <div className={props.className}>{props.children}</div>
    }

    return (
        <AnimatePresence>
            {props.isVisible === true ? (
                <motion.div
                    animate={{ opacity: 1, height: "auto" }}
                    className={props.className}
                    exit={{ opacity: 0, height: 0 }}
                    initial={{ opacity: 0, height: 0 }}
                    transition={{
                        duration: DURATION.normal,
                        ease: EASING.enter,
                    }}
                >
                    {props.children}
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}

/**
 * Props for the AnimatedMount wrapper.
 */
export interface IAnimatedMountProps {
    /** Unique key for AnimatePresence tracking. */
    readonly motionKey: string
    /** Content to animate. */
    readonly children: ReactNode
    /** Additional CSS classes. */
    readonly className?: string
    /** Animation mode for AnimatePresence. */
    readonly mode?: "wait" | "sync" | "popLayout"
}

/**
 * Wraps content with fade mount/unmount animation.
 * Uses AnimatePresence mode="wait" by default for swap transitions.
 *
 * @param props Configuration.
 * @returns Animated presence wrapper.
 */
export function AnimatedMount(props: IAnimatedMountProps): ReactElement {
    const prefersReducedMotion = useReducedMotion()

    if (prefersReducedMotion) {
        return <div className={props.className}>{props.children}</div>
    }

    return (
        <AnimatePresence mode={props.mode ?? "wait"}>
            <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={props.className}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0, y: 4 }}
                key={props.motionKey}
                transition={{
                    duration: DURATION.fast,
                    ease: EASING.enter,
                }}
            >
                {props.children}
            </motion.div>
        </AnimatePresence>
    )
}
