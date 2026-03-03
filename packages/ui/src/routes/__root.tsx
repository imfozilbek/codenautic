import type {ReactElement} from "react"
import {Outlet, createRootRoute} from "@tanstack/react-router"

import {GlobalErrorFallback, NotFoundFallback} from "@/app/error-fallback"

/**
 * Корневой route-контейнер приложения.
 */
export const Route = createRootRoute({
    component: (): ReactElement => <Outlet />,
    errorComponent: GlobalErrorFallback,
    notFoundComponent: NotFoundFallback,
})
