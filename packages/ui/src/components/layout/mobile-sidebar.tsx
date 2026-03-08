import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui"

import type { ReactElement } from "react"

import { Sidebar } from "./sidebar"

/**
 * Свойства мобильного sidebar.
 */
export interface IMobileSidebarProps {
    /** Видима ли панель. */
    readonly isOpen: boolean
    /** Обновление статуса Drawer. */
    readonly onOpenChange: (isOpen: boolean) => void
    /** Заголовок mobile sidebar. */
    readonly title?: string
}

/**
 * Drawer-обёртка для мобильной навигации.
 *
 * @param props Конфигурация панели.
 * @returns Мобильный сайдбар с close-on-nav behavior.
 */
export function MobileSidebar(props: IMobileSidebarProps): ReactElement {
    return (
        <Drawer isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
            <DrawerContent className="!m-0 !h-full !w-72 !rounded-none bg-surface text-foreground">
                <DrawerHeader className="border-b border-border px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">
                        {props.title ?? "Navigation"}
                    </p>
                </DrawerHeader>
                <DrawerBody>
                    <Sidebar
                        onNavigate={(): void => {
                            props.onOpenChange(false)
                        }}
                    />
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    )
}
