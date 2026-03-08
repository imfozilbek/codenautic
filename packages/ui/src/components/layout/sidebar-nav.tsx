import type { ReactElement } from "react"
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
        icon: <ChartPie aria-hidden="true" size={16} />,
        label: "Reports",
        to: "/reports",
    },
    {
        icon: <Settings aria-hidden="true" size={16} />,
        label: "Settings",
        to: "/settings",
    },
    {
        icon: <LifeBuoy aria-hidden="true" size={16} />,
        label: "Help",
        to: "/help-diagnostics",
    },
] as const

/**
 * Sidebar navigation list with icon-only collapsed mode and tooltip.
 *
 * @param props List of route links.
 * @returns Navigation item list.
 */
export function SidebarNav(props: ISidebarNavProps): ReactElement {
    const currentLocation = useLocation()
    const navigate = useNavigate()
    const items = props.items ?? DEFAULT_SIDEBAR_ITEMS
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
                        <li key={item.label} className="transition-colors duration-150">
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
