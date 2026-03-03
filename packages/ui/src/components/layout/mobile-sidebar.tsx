import {Drawer, DrawerBody, DrawerContent, DrawerHeader} from "@heroui/react"

import type {ReactElement} from "react"

import {Sidebar} from "./sidebar"

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
        <Drawer isOpen={props.isOpen} placement="left" size="xs" onOpenChange={props.onOpenChange}>
            <DrawerContent>
                <DrawerHeader className="border-b border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {props.title ?? "Navigation"}
                    </p>
                </DrawerHeader>
                <DrawerBody>
                    <Sidebar onNavigate={(): void => {
                        props.onOpenChange(false)
                    }} />
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    )
}
