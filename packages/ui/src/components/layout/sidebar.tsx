import type { ReactElement, ReactNode } from "react"
import { motion, AnimatePresence } from "motion/react"

import { ChevronLeft, ChevronRight } from "@/components/icons/app-icons"
import { Button } from "@/components/ui"
import { DURATION, EASING, useReducedMotion } from "@/lib/motion"

import { BrandMark } from "./brand-mark"
import { SidebarNav } from "./sidebar-nav"
import { SettingsNav } from "./settings-nav"

/**
 * Sidebar component props.
 */
export interface ISidebarProps {
    /** Additional class for the container. */
    readonly className?: string
    /** Navigation block title. */
    readonly title?: string
    /** Whether the sidebar is collapsed. */
    readonly isCollapsed?: boolean
    /** Content before main menu. */
    readonly headerSlot?: ReactNode
    /** Callback when a nav item is selected (close mobile sidebar). */
    readonly onNavigate?: (to?: string) => void
    /** Callback to toggle collapse state. */
    readonly onSidebarToggle?: () => void
}

/**
 * Desktop sidebar with sticky positioning, collapse animation, and icon-only mode.
 *
 * @param props Configuration.
 * @returns Sticky sidebar navigation.
 */
export function Sidebar(props: ISidebarProps): ReactElement {
    const isCollapsed = props.isCollapsed === true
    const prefersReducedMotion = useReducedMotion()
    const targetWidth = isCollapsed ? 48 : 240

    const sidebarContent = (
        <>
            <BrandMark isCompact={isCollapsed} />
            <div className="mb-2 flex items-center justify-between px-2">
                {isCollapsed ? (
                    <span className="w-0 overflow-hidden" />
                ) : (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">
                        {props.title ?? "Navigation"}
                    </p>
                )}
                <Button
                    aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                    className="h-7 min-h-7 w-7 rounded-full px-0"
                    isIconOnly
                    radius="full"
                    size="sm"
                    variant="light"
                    onPress={props.onSidebarToggle}
                >
                    {isCollapsed ? (
                        <ChevronRight aria-hidden className="size-4" />
                    ) : (
                        <ChevronLeft aria-hidden className="size-4" />
                    )}
                </Button>
            </div>
            {props.headerSlot !== undefined ? (
                <div className="mb-3 px-2">{props.headerSlot}</div>
            ) : null}
            <SidebarNav isCollapsed={isCollapsed} onNavigate={props.onNavigate} />
            <hr className="my-3 border-border" />
            <SettingsNav isCollapsed={isCollapsed} onNavigate={props.onNavigate} />
        </>
    )

    if (prefersReducedMotion) {
        return (
            <aside
                className={`sticky top-20 max-h-[calc(100vh-5rem)] self-start overflow-y-auto rounded-lg bg-sidebar-bg p-2 shadow-sm ${props.className ?? ""}`}
                style={{ width: targetWidth }}
            >
                {sidebarContent}
            </aside>
        )
    }

    return (
        <motion.aside
            animate={{ width: targetWidth }}
            className={`sticky top-20 max-h-[calc(100vh-5rem)] self-start overflow-y-auto rounded-lg bg-sidebar-bg p-2 shadow-sm ${props.className ?? ""}`}
            transition={{
                duration: DURATION.slow,
                ease: EASING.spring,
            }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key={isCollapsed ? "collapsed" : "expanded"}
                    transition={{ duration: DURATION.fast }}
                >
                    {sidebarContent}
                </motion.div>
            </AnimatePresence>
        </motion.aside>
    )
}
