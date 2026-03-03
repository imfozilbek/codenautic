import type {ReactElement} from "react"
import {Outlet, createRootRoute} from "@tanstack/react-router"

import {GlobalErrorFallback, NotFoundFallback} from "@/app/error-fallback"
import {ThemeToggle} from "@/components/layout"

function RootRouteComponent(): ReactElement {
    return (
        <main className="relative min-h-screen bg-[linear-gradient(140deg,#f7f8fa_0%,#eef4ff_55%,#f6fbe7_100%)] text-slate-900">
            <div className="absolute right-4 top-4 z-10">
                <ThemeToggle />
            </div>
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
