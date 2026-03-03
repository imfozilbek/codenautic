import type { ReactElement } from "react"
import { Bell, Menu } from "lucide-react"
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react"

import { Button } from "@/components/ui"

import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

/**
 * Параметры для layout header.
 */
export interface IHeaderProps {
    /** Заголовок в центре навбара. */
    readonly title?: string
    /** Количество непрочитанных уведомлений. */
    readonly notificationCount?: number
    /** Имя пользователя. */
    readonly userName?: string
    /** Почта пользователя для дополнительного текста. */
    readonly userEmail?: string
    /** Действие выхода. */
    readonly onSignOut?: () => void
    /** Открыть мобильную панель навигации. */
    readonly onMobileMenuOpen?: () => void
}

/**
 * Общий header для приложений с hero ui shell.
 *
 * @param props Параметры header.
 * @returns Navbar c переключателем темы и блоком пользователя.
 */
export function Header(props: IHeaderProps): ReactElement {
    const hasNotifications = props.notificationCount !== undefined && props.notificationCount > 0

    return (
        <Navbar
            isBlurred
            className="border-b border-slate-200 bg-white/80 backdrop-blur"
            maxWidth="full"
        >
            <NavbarContent justify="start">
                <NavbarItem className="md:hidden">
                    <Button
                        isIconOnly
                        radius="full"
                        variant="light"
                        aria-label="Open navigation menu"
                        onPress={props.onMobileMenuOpen}
                    >
                        <Menu size={20} />
                    </Button>
                </NavbarItem>
                <NavbarBrand>
                    <p className="text-sm font-semibold tracking-wide">CodeNautic</p>
                </NavbarBrand>
            </NavbarContent>
            <NavbarContent justify="center">
                {props.title !== undefined ? (
                    <p className="text-sm font-medium text-slate-700">{props.title}</p>
                ) : null}
            </NavbarContent>
            <NavbarContent justify="end">
                <NavbarItem>
                    <Button
                        isIconOnly
                        radius="full"
                        variant="light"
                        aria-label={`Notifications (${props.notificationCount ?? 0})`}
                    >
                        <span className="relative inline-flex">
                            <Bell size={16} />
                            {hasNotifications ? (
                                <span
                                    aria-hidden="true"
                                    className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] leading-none text-white"
                                >
                                    {props.notificationCount}
                                </span>
                            ) : null}
                        </span>
                    </Button>
                </NavbarItem>
                <NavbarItem>
                    <ThemeToggle />
                </NavbarItem>
                <NavbarItem>
                    <UserMenu
                        onSignOut={props.onSignOut}
                        userEmail={props.userEmail}
                        userName={props.userName}
                    />
                </NavbarItem>
            </NavbarContent>
        </Navbar>
    )
}
