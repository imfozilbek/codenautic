import { type ReactElement, type ReactNode } from "react"
import { motion } from "motion/react"

import { STAGGER_DELAY, EASING } from "./motion-config"
import { useReducedMotion } from "./use-reduced-motion"

/**
 * Props for the StaggerContainer component.
 */
export interface IStaggerContainerProps {
    /** Child elements to stagger. */
    readonly children: ReactNode
    /** Additional CSS classes. */
    readonly className?: string
    /** Custom stagger delay in seconds. */
    readonly staggerDelay?: number
    /** HTML element to render as. */
    readonly as?: "div" | "section" | "ul"
    /** Accessible label for the container. */
    readonly ariaLabel?: string
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: (staggerDelay: number) => ({
        opacity: 1,
        transition: {
            staggerChildren: staggerDelay,
            ease: EASING.enter,
        },
    }),
} as const

/**
 * Container that staggers the entrance animation of its children.
 * Children should use STAGGER_ITEM_VARIANTS for coordinated animation.
 * Respects prefers-reduced-motion by disabling animation.
 *
 * @param props Configuration.
 * @returns Animated container with staggered children.
 */
export function StaggerContainer(props: IStaggerContainerProps): ReactElement {
    const prefersReducedMotion = useReducedMotion()
    const delay = props.staggerDelay ?? STAGGER_DELAY
    const Component = motion[props.as ?? "div"]

    if (prefersReducedMotion) {
        const Tag = props.as ?? "div"

        return (
            <Tag aria-label={props.ariaLabel} className={props.className}>
                {props.children}
            </Tag>
        )
    }

    return (
        <Component
            animate="visible"
            aria-label={props.ariaLabel}
            className={props.className}
            custom={delay}
            initial="hidden"
            variants={containerVariants}
        >
            {props.children}
        </Component>
    )
}
