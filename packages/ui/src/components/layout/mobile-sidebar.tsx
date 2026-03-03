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
            <DrawerContent className="!m-0 !h-full !w-72 !rounded-none">
                <DrawerHeader className="border-b border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
