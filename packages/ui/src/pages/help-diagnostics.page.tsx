import { type ReactElement, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader, Chip, Textarea } from "@/components/ui"
import { SystemStateCard } from "@/components/infrastructure/system-state-card"
import { useExternalContext, useFeatureFlagsQuery } from "@/lib/hooks/queries"

type TArticleCategory = "auth" | "incidents" | "network" | "providers" | "rendering"
type TDiagnosticStatus = "error" | "ok" | "pending" | "warning"

interface IHelpArticle {
    /** Идентификатор статьи. */
    readonly id: string
    /** Категория статьи. */
    readonly category: TArticleCategory
    /** Заголовок статьи. */
    readonly title: string
    /** Краткое описание. */
    readonly summary: string
    /** Deep-link в экран или раздел диагностики. */
    readonly href: string
}

interface IDiagnosticCheck {
    /** Идентификатор проверки. */
    readonly id: string
    /** Название проверки. */
    readonly label: string
    /** Статус проверки. */
    readonly status: TDiagnosticStatus
    /** Подробность результата. */
    readonly details: string
    /** Ссылка на релевантную статью. */
    readonly articleHref: string
}

interface IDiagnosticSuggestedAction {
    /** Идентификатор действия. */
    readonly id: string
    /** Заголовок действия. */
    readonly label: string
    /** Описание шага. */
    readonly description: string
    /** Куда ведёт действие. */
    readonly path?:
        | "/dashboard/code-city"
        | "/scan-error-recovery"
        | "/session-recovery"
        | "/settings-integrations"
        | "/settings-provider-degradation"
}

const HELP_ARTICLES: ReadonlyArray<IHelpArticle> = [
    {
        category: "auth",
        href: "/settings-organization",
        id: "help-auth-401",
        summary: "Что проверить при истекшей сессии и ошибках доступа 401/403.",
        title: "Auth session recovery",
    },
    {
        category: "network",
        href: "/settings-integrations",
        id: "help-network-timeout",
        summary: "Диагностика сетевых таймаутов и проблем с API недоступностью.",
        title: "Network timeout diagnostics",
    },
    {
        category: "providers",
        href: "/settings-integrations",
        id: "help-provider-outage",
        summary: "Проверка деградации LLM/Git провайдеров и fallback стратегий.",
        title: "Provider outage playbook",
    },
    {
        category: "incidents",
        href: "/settings-jobs",
        id: "help-scan-failure",
        summary: "Как расследовать scan/review worker failures и перезапустить jobs.",
        title: "Scan failure triage",
    },
    {
        category: "rendering",
        href: "/dashboard/code-city",
        id: "help-webgl",
        summary: "Проверка readiness браузера и WebGL для CodeCity экранов.",
        title: "WebGL readiness and fallback",
    },
]

const INITIAL_CHECKS: ReadonlyArray<IDiagnosticCheck> = [
    {
        articleHref: "/settings-organization",
        details: "Not run yet.",
        id: "diag-auth",
        label: "Auth/session state",
        status: "pending",
    },
    {
        articleHref: "/settings-integrations",
        details: "Not run yet.",
        id: "diag-network",
        label: "Network availability",
        status: "pending",
    },
    {
        articleHref: "/settings-integrations",
        details: "Not run yet.",
        id: "diag-provider",
        label: "Provider connectivity",
        status: "pending",
    },
    {
        articleHref: "/settings",
        details: "Not run yet.",
        id: "diag-flags",
        label: "Feature flags state",
        status: "pending",
    },
    {
        articleHref: "/dashboard/code-city",
        details: "Not run yet.",
        id: "diag-webgl",
        label: "Browser/WebGL readiness",
        status: "pending",
    },
]

function normalize(value: string): string {
    return value.trim().toLowerCase()
}

function resolveClientFamily(userAgent: string | undefined): string {
    const normalizedUserAgent = normalize(userAgent ?? "")
    if (normalizedUserAgent.includes("edg/")) {
        return "edge"
    }
    if (normalizedUserAgent.includes("chrome/")) {
        return "chrome"
    }
    if (normalizedUserAgent.includes("firefox/")) {
        return "firefox"
    }
    if (
        normalizedUserAgent.includes("safari/") &&
        normalizedUserAgent.includes("chrome/") === false
    ) {
        return "safari"
    }
    return "unknown"
}

function mapStatusColor(status: TDiagnosticStatus): "danger" | "default" | "success" | "warning" {
    if (status === "error") {
        return "danger"
    }
    if (status === "ok") {
        return "success"
    }
    if (status === "warning") {
        return "warning"
    }
    return "default"
}

interface IDiagnosticsRuntimeSnapshot {
    readonly hasSessionToken: boolean
    readonly networkOnline: boolean
    readonly webGlReady: boolean
    readonly featureFlagsReady: boolean
    readonly featureFlagsPending: boolean
    readonly featureFlagsErrorMessage?: string
    readonly providerConnectedCount: number
    readonly providerDegradedCount: number
    readonly providersPending: boolean
    readonly providersErrorMessage?: string
}

export function runDiagnosticsChecks(
    snapshot: IDiagnosticsRuntimeSnapshot,
): ReadonlyArray<IDiagnosticCheck> {
    const providerStatus: TDiagnosticStatus = (() => {
        if (snapshot.providersPending === true) {
            return "pending"
        }
        if (snapshot.providersErrorMessage !== undefined) {
            return "warning"
        }
        if (snapshot.providerDegradedCount > 0) {
            return "warning"
        }
        if (snapshot.providerConnectedCount > 0) {
            return "ok"
        }
        return "error"
    })()

    const providerDetails = (() => {
        if (snapshot.providersPending === true) {
            return "Provider status is still loading. Re-run diagnostics in a moment."
        }
        if (snapshot.providersErrorMessage !== undefined) {
            return `Provider status unavailable: ${snapshot.providersErrorMessage}`
        }
        if (snapshot.providerDegradedCount > 0) {
            return `Detected degraded providers: ${String(snapshot.providerDegradedCount)}.`
        }
        if (snapshot.providerConnectedCount > 0) {
            return `Provider connectivity healthy for ${String(snapshot.providerConnectedCount)} providers.`
        }
        return "No connected provider detected. Check provider configuration."
    })()

    const featureFlagsStatus: TDiagnosticStatus = (() => {
        if (snapshot.featureFlagsPending === true) {
            return "pending"
        }
        if (snapshot.featureFlagsErrorMessage !== undefined) {
            return "warning"
        }
        return snapshot.featureFlagsReady ? "ok" : "warning"
    })()

    const featureFlagsDetails = (() => {
        if (snapshot.featureFlagsPending === true) {
            return "Feature flags are still loading."
        }
        if (snapshot.featureFlagsErrorMessage !== undefined) {
            return `Feature flags unavailable: ${snapshot.featureFlagsErrorMessage}`
        }
        return snapshot.featureFlagsReady
            ? "Feature flags loaded and evaluated."
            : "Feature flags unavailable; defaults may be applied."
    })()

    return [
        {
            articleHref: "/settings-organization",
            details: snapshot.hasSessionToken
                ? "Session token is present in local storage."
                : "No session token found. Re-authentication may be required.",
            id: "diag-auth",
            label: "Auth/session state",
            status: snapshot.hasSessionToken ? "ok" : "warning",
        },
        {
            articleHref: "/settings-integrations",
            details: snapshot.networkOnline
                ? "Network looks reachable from browser context."
                : "Browser reports offline network state.",
            id: "diag-network",
            label: "Network availability",
            status: snapshot.networkOnline ? "ok" : "error",
        },
        {
            articleHref: "/settings-integrations",
            details: providerDetails,
            id: "diag-provider",
            label: "Provider connectivity",
            status: providerStatus,
        },
        {
            articleHref: "/settings",
            details: featureFlagsDetails,
            id: "diag-flags",
            label: "Feature flags state",
            status: featureFlagsStatus,
        },
        {
            articleHref: "/dashboard/code-city",
            details: snapshot.webGlReady
                ? "WebGL context is available."
                : "WebGL context unavailable, fallback renderer recommended.",
            id: "diag-webgl",
            label: "Browser/WebGL readiness",
            status: snapshot.webGlReady ? "ok" : "warning",
        },
    ]
}

function buildSuggestedActions(
    checks: ReadonlyArray<IDiagnosticCheck>,
): ReadonlyArray<IDiagnosticSuggestedAction> {
    const actions: IDiagnosticSuggestedAction[] = []
    const authCheck = checks.find((check): boolean => check.id === "diag-auth")
    const networkCheck = checks.find((check): boolean => check.id === "diag-network")
    const providerCheck = checks.find((check): boolean => check.id === "diag-provider")
    const webglCheck = checks.find((check): boolean => check.id === "diag-webgl")

    if (authCheck?.status === "warning" || authCheck?.status === "error") {
        actions.push({
            description: "Re-authenticate and restore draft/session state before retrying.",
            id: "action-session-recovery",
            label: "Open session recovery",
            path: "/session-recovery",
        })
    }
    if (networkCheck?.status === "error") {
        actions.push({
            description: "Check connectivity and external source settings for failed requests.",
            id: "action-network-recovery",
            label: "Open integration diagnostics",
            path: "/settings-integrations",
        })
    }
    if (providerCheck?.status === "warning" || providerCheck?.status === "error") {
        actions.push({
            description: "Switch provider fallback and inspect degradation timeline.",
            id: "action-provider-recovery",
            label: "Open degradation console",
            path: "/settings-provider-degradation",
        })
    }
    if (webglCheck?.status === "warning" || webglCheck?.status === "error") {
        actions.push({
            description: "Use safe fallback renderer or validate browser WebGL support.",
            id: "action-webgl-recovery",
            label: "Open CodeCity fallback check",
            path: "/dashboard/code-city",
        })
    }

    if (actions.length === 0) {
        return [
            {
                description: "No blocking issues detected. Continue your workflow.",
                id: "action-healthy",
                label: "Diagnostics are healthy",
            },
        ]
    }

    return actions
}

/**
 * Help & Diagnostics центр для self-service расследования проблем.
 *
 * @returns Экран поиска help-статей, запуск диагностики и support bundle.
 */
export function HelpDiagnosticsPage(): ReactElement {
    const navigate = useNavigate()
    const featureFlags = useFeatureFlagsQuery()
    const externalContext = useExternalContext({
        previewEnabled: false,
    })
    const [search, setSearch] = useState<string>("")
    const [category, setCategory] = useState<"all" | TArticleCategory>("all")
    const [checks, setChecks] = useState<ReadonlyArray<IDiagnosticCheck>>(INITIAL_CHECKS)
    const [supportBundle, setSupportBundle] = useState<string>("")
    const [bundleMessage, setBundleMessage] = useState<string>("")

    const sourceContext = useMemo((): string => {
        if (typeof window === "undefined") {
            return ""
        }
        const params = new URLSearchParams(window.location.search)
        return params.get("from") ?? ""
    }, [])

    const filteredArticles = useMemo((): ReadonlyArray<IHelpArticle> => {
        const normalizedQuery = normalize(search)
        return HELP_ARTICLES.filter((article): boolean => {
            const categoryMatches = category === "all" || article.category === category
            const queryMatches =
                normalizedQuery.length === 0 ||
                normalize(article.title).includes(normalizedQuery) ||
                normalize(article.summary).includes(normalizedQuery)
            return categoryMatches && queryMatches
        })
    }, [category, search])
    const suggestedActions = useMemo((): ReadonlyArray<IDiagnosticSuggestedAction> => {
        return buildSuggestedActions(checks)
    }, [checks])

    const handleRunDiagnostics = (): void => {
        const hasSessionToken =
            typeof window !== "undefined" && window.localStorage.getItem("session-token") !== null
        const networkOnline = typeof navigator !== "undefined" && navigator.onLine === true
        const webGlReady =
            typeof document !== "undefined" &&
            document.createElement("canvas").getContext("webgl") !== null

        const connectedProviderCount =
            externalContext.sourcesQuery.data?.sources.filter((source): boolean => {
                return source.status === "CONNECTED"
            }).length ?? 0
        const degradedProviderCount =
            externalContext.sourcesQuery.data?.sources.filter((source): boolean => {
                return source.status === "DEGRADED" || source.status === "SYNCING"
            }).length ?? 0

        const featureFlagsReady =
            featureFlags.isPending === false &&
            featureFlags.error === null &&
            featureFlags.data !== undefined

        setChecks(
            runDiagnosticsChecks({
                featureFlagsErrorMessage:
                    featureFlags.error === null ? undefined : featureFlags.error.message,
                featureFlagsPending: featureFlags.isPending,
                featureFlagsReady,
                hasSessionToken,
                networkOnline,
                providerConnectedCount: connectedProviderCount,
                providerDegradedCount: degradedProviderCount,
                providersErrorMessage:
                    externalContext.sourcesQuery.error === null
                        ? undefined
                        : externalContext.sourcesQuery.error.message,
                providersPending: externalContext.sourcesQuery.isPending,
                webGlReady,
            }),
        )
    }

    const handleGenerateSupportBundle = (): void => {
        const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "unknown"
        const browserUserAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined
        const payload = {
            checks: checks.map(
                (check): { readonly id: string; readonly status: TDiagnosticStatus } => ({
                    id: check.id,
                    status: check.status,
                }),
            ),
            generatedAt: new Date().toISOString(),
            redactedClient: {
                clientFamily: resolveClientFamily(browserUserAgent),
                language: browserLanguage,
            },
            searchContext: {
                category,
                query: search,
                sourceContext,
            },
            providers: {
                connected:
                    externalContext.sourcesQuery.data?.sources.filter((source): boolean => {
                        return source.status === "CONNECTED"
                    }).length ?? 0,
                degraded:
                    externalContext.sourcesQuery.data?.sources.filter((source): boolean => {
                        return source.status === "DEGRADED" || source.status === "SYNCING"
                    }).length ?? 0,
                total: externalContext.sourcesQuery.data?.total ?? 0,
            },
            featureFlags: {
                loaded: featureFlags.data !== undefined,
                loadError: featureFlags.error === null ? null : featureFlags.error.message,
            },
        }

        setSupportBundle(JSON.stringify(payload, null, 2))
        setBundleMessage("Redacted support bundle is ready to attach to support ticket.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Help & diagnostics center</h1>
            <p className="text-sm text-text-secondary">
                Search help knowledge base, run diagnostics checks, and generate a redacted support
                bundle without losing workflow context.
            </p>

            {sourceContext === "error-fallback" ? (
                <Alert color="warning" title="Opened from error state" variant="flat">
                    You were redirected from a route error. Start diagnostics below to investigate.
                </Alert>
            ) : null}

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Knowledge base search</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                        <label className="flex flex-col gap-1 text-sm text-text-tertiary">
                            Search
                            <input
                                aria-label="Help search"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                placeholder="Find article or issue type"
                                value={search}
                                onChange={(event): void => {
                                    setSearch(event.currentTarget.value)
                                }}
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-text-tertiary">
                            Category
                            <select
                                aria-label="Help category"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                value={category}
                                onChange={(event): void => {
                                    const value = event.currentTarget.value
                                    if (
                                        value === "all" ||
                                        value === "auth" ||
                                        value === "incidents" ||
                                        value === "network" ||
                                        value === "providers" ||
                                        value === "rendering"
                                    ) {
                                        setCategory(value)
                                    }
                                }}
                            >
                                <option value="all">all categories</option>
                                <option value="auth">auth</option>
                                <option value="network">network</option>
                                <option value="providers">providers</option>
                                <option value="incidents">incidents</option>
                                <option value="rendering">rendering</option>
                            </select>
                        </label>
                    </div>
                    {filteredArticles.length === 0 ? (
                        <SystemStateCard
                            ctaLabel="Reset filters"
                            description="No help articles match current query. Reset filters or open diagnostics checks."
                            title="No matching help content"
                            variant="empty"
                            onCtaPress={(): void => {
                                setCategory("all")
                                setSearch("")
                            }}
                        />
                    ) : (
                        <ul aria-label="Help articles list" className="space-y-2">
                            {filteredArticles.map(
                                (article): ReactElement => (
                                    <li
                                        className="rounded-lg border border-border bg-surface px-3 py-2"
                                        key={article.id}
                                    >
                                        <p className="text-sm font-semibold text-foreground">
                                            {article.title}
                                        </p>
                                        <p className="text-xs text-text-secondary">
                                            {article.summary}
                                        </p>
                                        <a
                                            className="mt-1 inline-flex text-xs underline underline-offset-4"
                                            href={article.href}
                                        >
                                            Open article / diagnostics
                                        </a>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Diagnostics checks</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-text-tertiary">
                            Checks: auth/session, network, provider connectivity, feature flags,
                            browser/webgl readiness.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="flat" onPress={handleRunDiagnostics}>
                                Run diagnostics
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={(): void => {
                                    void navigate({
                                        to: "/settings-provider-degradation",
                                    })
                                }}
                            >
                                Open degradation console
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={(): void => {
                                    void navigate({
                                        to: "/scan-error-recovery",
                                    })
                                }}
                            >
                                Open scan recovery
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={(): void => {
                                    void navigate({
                                        to: "/session-recovery",
                                    })
                                }}
                            >
                                Open session recovery
                            </Button>
                            <Button size="sm" variant="flat" onPress={handleGenerateSupportBundle}>
                                Generate support bundle
                            </Button>
                        </div>
                    </div>
                    <ul aria-label="Diagnostics checks list" className="space-y-2">
                        {checks.map(
                            (check): ReactElement => (
                                <li
                                    className="rounded-lg border border-border bg-surface px-3 py-2"
                                    key={check.id}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {check.label}
                                        </p>
                                        <Chip
                                            color={mapStatusColor(check.status)}
                                            size="sm"
                                            variant="flat"
                                        >
                                            {check.status}
                                        </Chip>
                                    </div>
                                    <p className="text-xs text-text-secondary">{check.details}</p>
                                    <a
                                        className="inline-flex text-xs underline underline-offset-4"
                                        href={check.articleHref}
                                    >
                                        Open related guide
                                    </a>
                                </li>
                            ),
                        )}
                    </ul>
                    <div className="rounded-lg border border-border bg-surface px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">Suggested actions</p>
                        <ul aria-label="Diagnostics suggested actions" className="mt-2 space-y-2">
                            {suggestedActions.map(
                                (action): ReactElement => (
                                    <li
                                        className="rounded border border-border bg-surface px-2 py-2"
                                        key={action.id}
                                    >
                                        <p className="text-sm font-semibold text-foreground">
                                            {action.label}
                                        </p>
                                        <p className="text-xs text-text-secondary">
                                            {action.description}
                                        </p>
                                        {action.path !== undefined ? (
                                            <Button
                                                className="mt-2"
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    const actionPath = action.path
                                                    if (actionPath === undefined) {
                                                        return
                                                    }
                                                    void navigate({
                                                        to: actionPath,
                                                    })
                                                }}
                                            >
                                                Open action
                                            </Button>
                                        ) : null}
                                    </li>
                                ),
                            )}
                        </ul>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Support bundle</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Button size="sm" variant="flat" onPress={handleGenerateSupportBundle}>
                        Generate redacted bundle
                    </Button>
                    {bundleMessage.length > 0 ? (
                        <Alert color="primary" title="Bundle ready" variant="flat">
                            {bundleMessage}
                        </Alert>
                    ) : null}
                    {supportBundle.length > 0 ? (
                        <Textarea
                            isReadOnly
                            aria-label="Support bundle payload"
                            value={supportBundle}
                        />
                    ) : null}
                </CardBody>
            </Card>
        </section>
    )
}
