import type { ReactElement } from "react"
import { Bell, Menu } from "lucide-react"

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
        <div className="border-b border-[var(--border)] bg-[color:color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur">
            <div className="mx-auto flex h-16 items-center gap-3 px-3">
                <div className={props.title === undefined ? "md:hidden" : "hidden md:flex"}>
                    <Button
                        isIconOnly
                        radius="full"
                        variant="light"
                        aria-label="Open navigation menu"
                        onPress={props.onMobileMenuOpen}
                    >
                        <Menu size={20} />
                    </Button>
                </div>
                <p className="text-sm font-semibold tracking-wide text-[var(--foreground)]">CodeNautic</p>
                <div className="mx-auto hidden md:block">
                    {props.title !== undefined ? (
                        <p className="text-sm font-medium text-[var(--foreground)]/80">{props.title}</p>
                    ) : null}
                </div>
                <div className="ml-auto flex items-center gap-2">
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
                    <ThemeToggle />
                    <UserMenu
                        onSignOut={props.onSignOut}
                        userEmail={props.userEmail}
                        userName={props.userName}
                    />
                </div>
            </div>
            {props.title === undefined ? null : (
                <div className="border-t border-[var(--border)] px-3 py-2 md:hidden">
                    <p className="text-sm text-[var(--foreground)]/80">{props.title}</p>
                </div>
            )}
        </div>
    )
}
