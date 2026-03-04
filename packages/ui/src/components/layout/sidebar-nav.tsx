import type { ReactElement } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import {
    Bug,
    Building2,
    ChartNoAxesColumn,
    FolderKanban,
    GitPullRequest,
    House,
    Inbox,
    Rocket,
    Settings,
} from "lucide-react"
import { Button } from "@/components/ui"

/**
 * Навигационный элемент сайдбара.
 */
export interface ISidebarItem {
    /** Отображаемый лейбл пункта. */
    readonly label: string
    /** Маршрут. Не указывается для disabled-состояния. */
    readonly to?: string
    /** Иконка пункта меню. */
    readonly icon?: ReactElement
    /** Доступен ли пункт для перехода. */
    readonly isDisabled?: boolean
}

/**
 * Свойства навигационного списка сайдбара.
 */
export interface ISidebarNavProps {
    /** Список элементов меню. */
    readonly items?: ReadonlyArray<ISidebarItem>
    /** Коллбэк при выборе элемента, полезен для закрытия mobile-drawer. */
    readonly onNavigate?: (to?: string) => void
}

const DEFAULT_SIDEBAR_ITEMS: readonly ISidebarItem[] = [
    {
        icon: <House aria-hidden="true" size={16} />,
        label: "Dashboard",
        to: "/",
    },
    {
        icon: <Building2 aria-hidden="true" size={16} />,
        label: "CodeCity",
        to: "/dashboard/code-city",
    },
    {
        icon: <Inbox aria-hidden="true" size={16} />,
        label: "My Work",
        to: "/my-work",
    },
    {
        icon: <GitPullRequest aria-hidden="true" size={16} />,
        label: "CCR Management",
        to: "/reviews",
    },
    {
        icon: <Bug aria-hidden="true" size={16} />,
        label: "Issues",
        to: "/issues",
    },
    {
        icon: <Rocket aria-hidden="true" size={16} />,
        label: "Onboarding",
        to: "/onboarding",
    },
    {
        icon: <ChartNoAxesColumn aria-hidden="true" size={16} />,
        label: "Scan Progress",
        to: "/scan-progress",
    },
    {
        icon: <FolderKanban aria-hidden="true" size={16} />,
        label: "Repositories",
        to: "/repositories",
    },
    {
        icon: <Settings aria-hidden="true" size={16} />,
        label: "Settings",
        to: "/settings",
    },
] as const

/**
 * Навигационный список для sidebar.
 *
 * @param props Список ссылок.
 * @returns Список доступных route-переходов.
 */
export function SidebarNav(props: ISidebarNavProps): ReactElement {
    const currentLocation = useLocation()
    const navigate = useNavigate()
    const items = props.items ?? DEFAULT_SIDEBAR_ITEMS
    const isItemActive = (to: string): boolean => {
        if (to === "/") {
            return currentLocation.pathname === "/"
        }

        return (
            currentLocation.pathname === to || currentLocation.pathname.startsWith(`${to}/`)
        )
    }

    return (
        <nav aria-label="Main navigation">
            <ul className="flex flex-col gap-1">
                {items.map((item): ReactElement => {
                    const isNavigable = item.to !== undefined && item.isDisabled !== true
                    const isActive =
                        item.to !== undefined &&
                        isItemActive(item.to) &&
                        item.isDisabled !== true

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

                    const startContent = item.icon === undefined ? undefined : (
                        <span aria-hidden="true" className="inline-flex items-center justify-center">
                            {item.icon}
                        </span>
                    )

                    return (
                        <li key={item.label}>
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
