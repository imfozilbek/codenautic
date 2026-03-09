import type { Meta, StoryObj } from "@storybook/react"

import type { IHeaderOrganizationOption, IHeaderRoleOption, IHeaderSearchRouteOption } from "./header"
import { Header } from "./header"

const meta: Meta<typeof Header> = {
    title: "Layout/Header",
    component: Header,
}

export default meta

type TStory = StoryObj<typeof Header>

const MOCK_ORGANIZATIONS: ReadonlyArray<IHeaderOrganizationOption> = [
    { id: "org-1", label: "Acme Corp" },
    { id: "org-2", label: "Globex Inc" },
    { id: "org-3", label: "Initech" },
]

const MOCK_ROLES: ReadonlyArray<IHeaderRoleOption> = [
    { id: "admin", label: "Admin" },
    { id: "developer", label: "Developer" },
    { id: "viewer", label: "Viewer" },
]

const MOCK_SEARCH_ROUTES: ReadonlyArray<IHeaderSearchRouteOption> = [
    { label: "Dashboard", path: "/" },
    { label: "CCR Management", path: "/reviews" },
    { label: "Issues", path: "/issues" },
    { label: "Repositories", path: "/repositories" },
    { label: "Settings", path: "/settings" },
    { label: "Reports", path: "/reports" },
]

export const Default: TStory = {
    args: {
        title: "Dashboard",
        userName: "Alex Petrov",
        userEmail: "alex@codenautic.com",
        notificationCount: 3,
        breadcrumbs: ["Home", "Dashboard"],
        organizations: MOCK_ORGANIZATIONS,
        activeOrganizationId: "org-1",
        roleOptions: MOCK_ROLES,
        activeRoleId: "developer",
        searchRoutes: MOCK_SEARCH_ROUTES,
    },
}

export const Minimal: TStory = {
    args: {
        userName: "Guest",
    },
}

export const WithNotifications: TStory = {
    args: {
        title: "CCR Management",
        userName: "Maria Ivanova",
        userEmail: "maria@codenautic.com",
        notificationCount: 12,
    },
}
