import type { ReactElement } from "react"
import type { Decorator, Meta, StoryObj } from "@storybook/react"
import {
    RouterContextProvider,
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router"

import { Sidebar } from "./sidebar"

/**
 * Creates a minimal TanStack Router instance for Storybook isolation.
 * SidebarNav and SettingsNav call useLocation/useNavigate internally.
 */
const withRouter: Decorator = (storyFn): ReactElement => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
    })
    rootRoute.addChildren([indexRoute])

    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ["/"] }),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- TanStack Router internal type mismatch in Storybook
    const typedRouter: Parameters<typeof RouterContextProvider>[0]["router"] = router as any

    return <RouterContextProvider router={typedRouter}>{storyFn()}</RouterContextProvider>
}

const meta: Meta<typeof Sidebar> = {
    title: "Layout/Sidebar",
    component: Sidebar,
    decorators: [withRouter],
}

export default meta

type TStory = StoryObj<typeof Sidebar>

export const Expanded: TStory = {
    args: {
        isCollapsed: false,
        title: "Navigation",
    },
}

export const Collapsed: TStory = {
    args: {
        isCollapsed: true,
        title: "Navigation",
    },
}
