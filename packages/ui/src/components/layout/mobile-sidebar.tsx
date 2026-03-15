import { Drawer, useOverlayState } from "@heroui/react"

import type { ReactElement, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

import { Sidebar } from "./sidebar"

/**
 * Mobile sidebar props.
 */
export interface IMobileSidebarProps {
    /** Whether the drawer is visible. */
    readonly isOpen: boolean
    /** Update drawer open state. */
    readonly onOpenChange: (isOpen: boolean) => void
    /** Navigation section title. */
    readonly title?: string
    /** Footer slot to pass through to Sidebar (org switcher, user menu). */
    readonly footerSlot?: ReactNode
}

/**
 * Drawer wrapper for mobile navigation.
 *
 * @param props Drawer configuration.
 * @returns Mobile sidebar with close-on-nav behavior.
 */
export function MobileSidebar(props: IMobileSidebarProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    const state = useOverlayState({
        isOpen: props.isOpen,
        onOpenChange: props.onOpenChange,
    })

    return (
        <Drawer state={state}>
            <Drawer.Backdrop>
                <Drawer.Content placement="left">
                    <Drawer.Dialog>
                        <Drawer.Header>
                            <p className={TYPOGRAPHY.overline}>
                                {props.title ?? t("navigation:sidebarNav.title")}
                            </p>
                        </Drawer.Header>
                        <Drawer.Body>
                            <Sidebar
                                footerSlot={props.footerSlot}
                                onNavigate={(): void => {
                                    props.onOpenChange(false)
                                }}
                            />
                        </Drawer.Body>
                    </Drawer.Dialog>
                </Drawer.Content>
            </Drawer.Backdrop>
        </Drawer>
    )
}
