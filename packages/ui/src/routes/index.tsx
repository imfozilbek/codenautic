import type {ReactElement} from "react"
import {Suspense, lazy} from "react"
import {createFileRoute} from "@tanstack/react-router"

import {RouteErrorFallback} from "@/app/error-fallback"
import {RouteSuspenseFallback} from "@/app/route-suspense-fallback"

const LazySystemHealthPage = lazy(async (): Promise<{default: () => ReactElement}> => {
    const pageModule = await import("@/pages/system-health.page")
    return {
        default: pageModule.SystemHealthPage,
    }
})

/**
 * Route-level boundary для lazy-загрузки главного экрана.
 *
 * @returns Suspense boundary + lazy route component.
 */
function IndexRouteComponent(): ReactElement {
    return (
        <Suspense fallback={<RouteSuspenseFallback />}>
            <LazySystemHealthPage />
        </Suspense>
    )
}

/**
 * Главный route dashboard-уровня.
 */
export const Route = createFileRoute("/")({
    component: IndexRouteComponent,
    errorComponent: RouteErrorFallback,
})
