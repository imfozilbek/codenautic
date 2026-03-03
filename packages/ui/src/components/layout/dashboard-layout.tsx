import type {ReactElement, ReactNode} from "react"
import {Navbar, NavbarBrand, NavbarContent, NavbarItem} from "@heroui/react"

import {ThemeToggle} from "./theme-toggle"

/**
 * Свойства layout-контейнера для страниц dashboard.
 */
export interface IDashboardLayoutProps {
    /** Основное содержимое страницы. */
    readonly children: ReactNode
    /** Заголовок страницы (рендерится в хедере). */
    readonly title?: string
}

/**
 * Базовый layout для dashboard-экранов с HeroUI navbar и глобальными контролами.
 *
 * @param props Конфигурация контента.
 * @returns Обёрнутый контент с верхней панелью.
 */
export function DashboardLayout(props: IDashboardLayoutProps): ReactElement {
    return (
        <div className="relative min-h-screen bg-[linear-gradient(140deg,#f7f8fa_0%,#eef4ff_55%,#f6fbe7_100%)] text-slate-900">
            <Navbar
                isBlurred
                className="border-b border-slate-200 bg-white/80 backdrop-blur"
                maxWidth="full"
                position="sticky"
            >
                <NavbarContent justify="start">
                    <NavbarBrand>
                        <p className="text-sm font-semibold tracking-wide">CodeNautic</p>
                    </NavbarBrand>
                </NavbarContent>
                <NavbarContent justify="center">
                    {props.title !== undefined ? (
                        <span className="text-sm font-medium text-slate-700">{props.title}</span>
                    ) : null}
                </NavbarContent>
                <NavbarContent justify="end">
                    <NavbarItem>
                        <ThemeToggle />
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
            <main className="px-4 py-6 sm:px-6">{props.children}</main>
        </div>
    )
}
