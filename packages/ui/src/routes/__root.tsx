import type {ReactElement} from "react"
import {Outlet, createRootRoute} from "@tanstack/react-router"

import {GlobalErrorFallback, NotFoundFallback} from "@/app/error-fallback"

function RootRouteComponent(): ReactElement {
    return (
        <main className="min-h-screen bg-[linear-gradient(140deg,#f7f8fa_0%,#eef4ff_55%,#f6fbe7_100%)] text-slate-900">
            <Outlet />
        </main>
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
