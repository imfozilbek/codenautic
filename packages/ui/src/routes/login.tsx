import type { ReactElement } from "react"
import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import {
    AuthBoundary,
    sanitizeAppDestinationPath,
    type TAuthGuardStatusCode,
} from "@/lib/auth/auth-boundary"

interface ILoginRouteSearch {
    readonly next?: string
    readonly reason?: string
}

interface ILoginRedirectContentProps {
    readonly intendedDestination: string
}

function LoginRouteComponent(): ReactElement {
    const search = Route.useSearch()
    const intendedDestination = resolveLoginDestination(search.next)
    const authStatusHint = resolveAuthStatusHint(search.reason)

    return (
        <AuthBoundary authStatusHint={authStatusHint} intendedDestination={intendedDestination}>
            <LoginRedirectContent intendedDestination={intendedDestination} />
        </AuthBoundary>
    )
}

function LoginRedirectContent(props: ILoginRedirectContentProps): ReactElement {
    const { t } = useTranslation(["auth"])

    useEffect((): void => {
        window.location.assign(props.intendedDestination)
    }, [props.intendedDestination])

    return (
        <section
            aria-busy="true"
            className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8"
        >
            <p className="text-base text-slate-600">{t("auth:checkingSession")}</p>
        </section>
    )
}

export function validateLoginRouteSearch(search: Record<string, unknown>): ILoginRouteSearch {
    const rawReason = search.reason

    return {
        next: typeof search.next === "string" ? search.next : undefined,
        reason:
            typeof rawReason === "string"
                ? rawReason
                : typeof rawReason === "number"
                  ? String(rawReason)
                  : undefined,
    }
}

export function resolveLoginDestination(next: string | undefined): string {
    const sanitizedDestination = sanitizeAppDestinationPath(next, "/")

    if (sanitizedDestination.startsWith("/login")) {
        return "/"
    }

    return sanitizedDestination
}

export function resolveAuthStatusHint(
    reason: string | undefined,
): TAuthGuardStatusCode | undefined {
    if (reason === "401") {
        return 401
    }

    if (reason === "403") {
        return 403
    }

    return undefined
}

export const Route = createFileRoute("/login")({
    validateSearch: validateLoginRouteSearch,
    component: LoginRouteComponent,
})
