import {type ReactElement, type ReactNode, useState} from "react"

import {Header} from "./header"
import {Sidebar} from "./sidebar"
import {MobileSidebar} from "./mobile-sidebar"

/**
 * Свойства layout-контейнера для страниц dashboard.
 */
export interface IDashboardLayoutProps {
    /** Основное содержимое страницы. */
    readonly children: ReactNode
    /** Заголовок страницы (рендерится в хедере). */
    readonly title?: string
    /** Имя пользователя для user-menu. */
    readonly userName?: string
    /** Email пользователя для user-menu. */
    readonly userEmail?: string
    /** Действие выхода из системы. */
    readonly onSignOut?: () => Promise<void> | void
}

/**
 * Базовый layout для dashboard-экранов с HeroUI navbar и глобальными контролями.
 *
 * @param props Конфигурация контента.
 * @returns Обёрнутый контент с верхней панелью.
 */
export function DashboardLayout(props: IDashboardLayoutProps): ReactElement {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    return (
        <div className="relative min-h-screen bg-[linear-gradient(140deg,#f7f8fa_0%,#eef4ff_55%,#f6fbe7_100%)] text-slate-900">
            <Header
                onMobileMenuOpen={(): void => {
                    setIsMobileSidebarOpen(true)
                }}
                userEmail={props.userEmail}
                userName={props.userName}
                onSignOut={props.onSignOut}
                title={props.title}
            />
            <MobileSidebar
                isOpen={isMobileSidebarOpen}
                onOpenChange={setIsMobileSidebarOpen}
                title="Menu"
            />
            <div className="mx-auto flex w-full max-w-screen-xl gap-4 px-4 py-4 sm:px-6">
                <div className="hidden min-h-0 flex-shrink-0 md:block">
                    <Sidebar
                        isCollapsed={isSidebarCollapsed}
                        onNavigate={(): void => {
                            setIsMobileSidebarOpen(false)
                        }}
                        onSidebarToggle={(): void => {
                            setIsSidebarCollapsed((previousValue): boolean => !previousValue)
                        }}
                        title="Menu"
                    />
                </div>
                <div className="min-h-0 flex-1 rounded-lg bg-white/80 p-4 shadow-sm">
                    {props.children}
                </div>
            </div>
        </div>
    )
}
