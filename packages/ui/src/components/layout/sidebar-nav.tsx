import type { ReactElement } from "react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "@tanstack/react-router"

import {
    Bug,
    Building2,
    ChartNoAxesColumn,
    ChartPie,
    FolderKanban,
    GitPullRequest,
    House,
    Inbox,
    LifeBuoy,
    Rocket,
    Settings,
} from "@/components/icons/app-icons"
import { Button } from "@/components/ui"

/**
 * Sidebar navigation item.
 */
export interface ISidebarItem {
    /** Display label. */
    readonly label: string
    /** Route path. Undefined for disabled state. */
    readonly to?: string
    /** Menu item icon. */
    readonly icon?: ReactElement
    /** Whether the item is disabled. */
    readonly isDisabled?: boolean
}

/**
 * Sidebar nav list props.
 */
export interface ISidebarNavProps {
    /** Menu items. */
    readonly items?: ReadonlyArray<ISidebarItem>
    /** Callback when item is selected (for closing mobile drawer). */
    readonly onNavigate?: (to?: string) => void
    /** Whether the sidebar is in collapsed icon-only mode. */
    readonly isCollapsed?: boolean
}

/**
 * Создаёт список навигационных элементов sidebar с переведёнными метками.
 *
 * @param t Функция перевода из react-i18next.
 * @returns Массив элементов навигации.
 */
function createDefaultSidebarItems(
    t: TFunction<ReadonlyArray<"navigation">>,
): ReadonlyArray<ISidebarItem> {
    return [
        {
            icon: <House aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.dashboard"),
            to: "/",
        },
        {
            icon: <Building2 aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.codeCity"),
            to: "/dashboard/code-city",
        },
        {
            icon: <Inbox aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.myWork"),
            to: "/my-work",
        },
        {
            icon: <GitPullRequest aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.ccrManagement"),
            to: "/reviews",
        },
        {
            icon: <Bug aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.issues"),
            to: "/issues",
        },
        {
            icon: <Rocket aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.onboarding"),
            to: "/onboarding",
        },
        {
            icon: <ChartNoAxesColumn aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.scanProgress"),
            to: "/scan-progress",
        },
        {
            icon: <FolderKanban aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.repositories"),
            to: "/repositories",
        },
        {
            icon: <ChartPie aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.reports"),
            to: "/reports",
        },
        {
            icon: <Settings aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.settings"),
            to: "/settings",
        },
        {
            icon: <LifeBuoy aria-hidden="true" size={16} />,
            label: t("navigation:sidebar.help"),
            to: "/help-diagnostics",
        },
    ]
}

/**
 * Sidebar navigation list with icon-only collapsed mode and tooltip.
 *
 * @param props List of route links.
 * @returns Navigation item list.
 */
export function SidebarNav(props: ISidebarNavProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    const currentLocation = useLocation()
    const navigate = useNavigate()
    const items = props.items ?? createDefaultSidebarItems(t)
    const isCollapsed = props.isCollapsed === true

    const isItemActive = (to: string): boolean => {
        if (to === "/") {
            return currentLocation.pathname === "/"
        }

        return currentLocation.pathname === to || currentLocation.pathname.startsWith(`${to}/`)
    }

    return (
        <nav aria-label="Main navigation">
            <ul className="flex flex-col gap-1">
                {items.map((item): ReactElement => {
                    const isNavigable = item.to !== undefined && item.isDisabled !== true
                    const isActive =
                        item.to !== undefined && isItemActive(item.to) && item.isDisabled !== true

                    const handlePress = (): void => {
                        if (isNavigable !== true) {
                            if (props.onNavigate !== undefined) {
                                props.onNavigate(item.to)
                            }
                            return
                        }

                        if (currentLocation.pathname === item.to) {
                            if (props.onNavigate !== undefined) {
                                props.onNavigate(item.to)
                            }
                            return
                        }

                        if (props.onNavigate !== undefined) {
                            props.onNavigate(item.to)
                        }

                        if (item.to === undefined) {
                            return
                        }

                        void navigate({ to: item.to })
                    }

                    const startContent =
                        item.icon === undefined ? undefined : (
                            <span
                                aria-hidden="true"
                                className="inline-flex items-center justify-center"
                            >
                                {item.icon}
                            </span>
                        )

                    if (isCollapsed) {
                        return (
                            <li key={item.label} title={item.label}>
                                <Button
                                    aria-current={isActive ? "page" : undefined}
                                    aria-label={item.label}
                                    className="w-full justify-center"
                                    fullWidth
                                    isDisabled={item.isDisabled}
                                    isIconOnly
                                    variant={isActive ? "solid" : "light"}
                                    onPress={handlePress}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="inline-flex items-center justify-center"
                                    >
                                        {item.icon}
                                    </span>
                                </Button>
                            </li>
                        )
                    }

                    return (
                        <li
                            key={item.label}
                            className="relative flex items-stretch transition-colors duration-150"
                        >
                            {isActive ? (
                                <span className="nav-active-indicator absolute left-0 top-1 bottom-1" />
                            ) : null}
                            <Button
                                aria-current={isActive ? "page" : undefined}
                                className="w-full justify-start"
                                fullWidth
                                isDisabled={item.isDisabled}
                                startContent={startContent}
                                variant={isActive ? "solid" : "light"}
                                onPress={handlePress}
                            >
                                {item.label}
                            </Button>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
