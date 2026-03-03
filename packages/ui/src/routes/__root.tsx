import type {ReactElement} from "react"
import {Outlet, createRootRoute} from "@tanstack/react-router"

import {GlobalErrorFallback, NotFoundFallback} from "@/app/error-fallback"
import {DashboardLayout} from "@/components/layout"

function RootRouteComponent(): ReactElement {
    return (
        <DashboardLayout>
            <Outlet />
        </DashboardLayout>
    )
}

/**
 * Корневой route-контейнер приложения.
 */
export const Route = createRootRoute({
    component: RootRouteComponent,
    errorComponent: GlobalErrorFallback,
    notFoundComponent: NotFoundFallback,
})
