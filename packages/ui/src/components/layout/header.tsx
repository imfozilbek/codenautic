import type { ReactElement } from "react"
import { Bell, Menu } from "lucide-react"

import { Button } from "@/components/ui"

import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

/**
 * Опция выбора организации в header switcher.
 */
export interface IHeaderOrganizationOption {
    /** Идентификатор организации/tenant. */
    readonly id: string
    /** Отображаемое название в selector. */
    readonly label: string
}

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
    /** Список доступных tenant/workspace. */
    readonly organizations?: ReadonlyArray<IHeaderOrganizationOption>
    /** Активная организация. */
    readonly activeOrganizationId?: string
    /** Смена организации/workspace. */
    readonly onOrganizationChange?: (organizationId: string) => void
}

/**
 * Общий header для приложений с hero ui shell.
 *
 * @param props Параметры header.
 * @returns Navbar c переключателем темы и блоком пользователя.
 */
export function Header(props: IHeaderProps): ReactElement {
    const hasNotifications = props.notificationCount !== undefined && props.notificationCount > 0
    const activeOrganization = props.organizations?.find((organization): boolean => {
        return organization.id === props.activeOrganizationId
    })

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
                {props.organizations === undefined ? null : (
                    <div className="hidden min-w-[220px] md:flex md:flex-col">
                        <label
                            className="text-[11px] uppercase tracking-[0.08em] text-[var(--foreground)]/60"
                            htmlFor="header-organization-switcher"
                        >
                            Workspace
                        </label>
                        <select
                            aria-label="Organization workspace switcher"
                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
                            id="header-organization-switcher"
                            value={props.activeOrganizationId}
                            onChange={(event): void => {
                                props.onOrganizationChange?.(event.currentTarget.value)
                            }}
                        >
                            {props.organizations.map((organization): ReactElement => (
                                <option key={organization.id} value={organization.id}>
                                    {organization.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-[var(--foreground)]/60">
                            Current: {activeOrganization?.label ?? "Unknown workspace"}
                        </p>
                    </div>
                )}
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
