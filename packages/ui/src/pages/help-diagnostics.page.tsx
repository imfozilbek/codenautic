import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { useDynamicTranslation } from "@/lib/i18n"
import { getWindowSessionStorage, safeStorageGet } from "@/lib/utils/safe-storage"
import { Alert, Button, Card, CardContent, CardHeader, Chip, TextArea } from "@heroui/react"
import { SystemStateCard } from "@/components/infrastructure/system-state-card"
import { PageShell } from "@/components/layout/page-shell"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { useExternalContext, useFeatureFlagsQuery } from "@/lib/hooks/queries"

type TArticleCategory = "auth" | "incidents" | "network" | "providers" | "rendering"
type TDiagnosticStatus = "error" | "ok" | "pending" | "warning"

interface IHelpArticle {
    /** Идентификатор статьи. */
    readonly id: string
    /** Категория статьи. */
    readonly category: TArticleCategory
    /** Ключ заголовка статьи. */
    readonly titleKey: string
    /** Ключ краткого описания. */
    readonly summaryKey: string
    /** Deep-link в экран или раздел диагностики. */
    readonly href: string
}

interface IDiagnosticCheck {
    /** Идентификатор проверки. */
    readonly id: string
    /** Ключ названия проверки. */
    readonly labelKey: string
    /** Статус проверки. */
    readonly status: TDiagnosticStatus
    /** Ключ или строка подробности результата. */
    readonly detailsKey: string
    /** Параметры интерполяции для detailsKey. */
    readonly detailsParams?: Record<string, string>
    /** Ссылка на релевантную статью. */
    readonly articleHref: string
}

interface IDiagnosticSuggestedAction {
    /** Идентификатор действия. */
    readonly id: string
    /** Ключ заголовка действия. */
    readonly labelKey: string
    /** Ключ описания шага. */
    readonly descriptionKey: string
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
        summaryKey: "system:helpDiagnostics.articles.authSessionRecoverySummary",
        titleKey: "system:helpDiagnostics.articles.authSessionRecovery",
    },
    {
        category: "network",
        href: "/settings-integrations",
        id: "help-network-timeout",
        summaryKey: "system:helpDiagnostics.articles.networkTimeoutDiagnosticsSummary",
        titleKey: "system:helpDiagnostics.articles.networkTimeoutDiagnostics",
    },
    {
        category: "providers",
        href: "/settings-integrations",
        id: "help-provider-outage",
        summaryKey: "system:helpDiagnostics.articles.providerOutagePlaybookSummary",
        titleKey: "system:helpDiagnostics.articles.providerOutagePlaybook",
    },
    {
        category: "incidents",
        href: "/settings-jobs",
        id: "help-scan-failure",
        summaryKey: "system:helpDiagnostics.articles.scanFailureTriageSummary",
        titleKey: "system:helpDiagnostics.articles.scanFailureTriage",
    },
    {
        category: "rendering",
        href: "/dashboard/code-city",
        id: "help-webgl",
        summaryKey: "system:helpDiagnostics.articles.webglReadinessSummary",
        titleKey: "system:helpDiagnostics.articles.webglReadiness",
    },
]

const INITIAL_CHECKS: ReadonlyArray<IDiagnosticCheck> = [
    {
        articleHref: "/settings-organization",
        detailsKey: "system:helpDiagnostics.checks.notRunYet",
        id: "diag-auth",
        labelKey: "system:helpDiagnostics.checks.authSessionLabel",
        status: "pending",
    },
    {
        articleHref: "/settings-integrations",
        detailsKey: "system:helpDiagnostics.checks.notRunYet",
        id: "diag-network",
        labelKey: "system:helpDiagnostics.checks.networkLabel",
        status: "pending",
    },
    {
        articleHref: "/settings-integrations",
        detailsKey: "system:helpDiagnostics.checks.notRunYet",
        id: "diag-provider",
        labelKey: "system:helpDiagnostics.checks.providerLabel",
        status: "pending",
    },
    {
        articleHref: "/settings",
        detailsKey: "system:helpDiagnostics.checks.notRunYet",
        id: "diag-flags",
        labelKey: "system:helpDiagnostics.checks.featureFlagsLabel",
        status: "pending",
    },
    {
        articleHref: "/dashboard/code-city",
        detailsKey: "system:helpDiagnostics.checks.notRunYet",
        id: "diag-webgl",
        labelKey: "system:helpDiagnostics.checks.webglLabel",
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

    const providerDetailsKey = (() => {
        if (snapshot.providersPending === true) {
            return "system:helpDiagnostics.diagnosticDetails.providerLoading"
        }
        if (snapshot.providersErrorMessage !== undefined) {
            return "system:helpDiagnostics.diagnosticDetails.providerUnavailable"
        }
        if (snapshot.providerDegradedCount > 0) {
            return "system:helpDiagnostics.diagnosticDetails.providerDegraded"
        }
        if (snapshot.providerConnectedCount > 0) {
            return "system:helpDiagnostics.diagnosticDetails.providerHealthy"
        }
        return "system:helpDiagnostics.diagnosticDetails.providerNone"
    })()

    const providerDetailsParams: Record<string, string> | undefined = (():
        | Record<string, string>
        | undefined => {
        if (snapshot.providersErrorMessage !== undefined) {
            return { errorMessage: snapshot.providersErrorMessage }
        }
        if (snapshot.providerDegradedCount > 0) {
            return { count: String(snapshot.providerDegradedCount) }
        }
        if (snapshot.providerConnectedCount > 0) {
            return { count: String(snapshot.providerConnectedCount) }
        }
        return undefined
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

    const featureFlagsDetailsKey = (() => {
        if (snapshot.featureFlagsPending === true) {
            return "system:helpDiagnostics.diagnosticDetails.featureFlagsLoading"
        }
        if (snapshot.featureFlagsErrorMessage !== undefined) {
            return "system:helpDiagnostics.diagnosticDetails.featureFlagsUnavailable"
        }
        return snapshot.featureFlagsReady
            ? "system:helpDiagnostics.diagnosticDetails.featureFlagsLoaded"
            : "system:helpDiagnostics.diagnosticDetails.featureFlagsDefaults"
    })()

    const featureFlagsDetailsParams =
        snapshot.featureFlagsErrorMessage !== undefined
            ? { errorMessage: snapshot.featureFlagsErrorMessage }
            : undefined

    return [
        {
            articleHref: "/settings-organization",
            detailsKey: snapshot.hasSessionToken
                ? "system:helpDiagnostics.diagnosticDetails.sessionTokenPresent"
                : "system:helpDiagnostics.diagnosticDetails.sessionTokenMissing",
            id: "diag-auth",
            labelKey: "system:helpDiagnostics.checks.authSessionLabel",
            status: snapshot.hasSessionToken ? "ok" : "warning",
        },
        {
            articleHref: "/settings-integrations",
            detailsKey: snapshot.networkOnline
                ? "system:helpDiagnostics.diagnosticDetails.networkReachable"
                : "system:helpDiagnostics.diagnosticDetails.networkOffline",
            id: "diag-network",
            labelKey: "system:helpDiagnostics.checks.networkLabel",
            status: snapshot.networkOnline ? "ok" : "error",
        },
        {
            articleHref: "/settings-integrations",
            detailsKey: providerDetailsKey,
            detailsParams: providerDetailsParams,
            id: "diag-provider",
            labelKey: "system:helpDiagnostics.checks.providerLabel",
            status: providerStatus,
        },
        {
            articleHref: "/settings",
            detailsKey: featureFlagsDetailsKey,
            detailsParams: featureFlagsDetailsParams,
            id: "diag-flags",
            labelKey: "system:helpDiagnostics.checks.featureFlagsLabel",
            status: featureFlagsStatus,
        },
        {
            articleHref: "/dashboard/code-city",
            detailsKey: snapshot.webGlReady
                ? "system:helpDiagnostics.diagnosticDetails.webglAvailable"
                : "system:helpDiagnostics.diagnosticDetails.webglUnavailable",
            id: "diag-webgl",
            labelKey: "system:helpDiagnostics.checks.webglLabel",
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
            descriptionKey: "system:helpDiagnostics.actions.sessionRecoveryDescription",
            id: "action-session-recovery",
            labelKey: "system:helpDiagnostics.actions.sessionRecoveryLabel",
            path: "/session-recovery",
        })
    }
    if (networkCheck?.status === "error") {
        actions.push({
            descriptionKey: "system:helpDiagnostics.actions.networkRecoveryDescription",
            id: "action-network-recovery",
            labelKey: "system:helpDiagnostics.actions.networkRecoveryLabel",
            path: "/settings-integrations",
        })
    }
    if (providerCheck?.status === "warning" || providerCheck?.status === "error") {
        actions.push({
            descriptionKey: "system:helpDiagnostics.actions.providerRecoveryDescription",
            id: "action-provider-recovery",
            labelKey: "system:helpDiagnostics.actions.providerRecoveryLabel",
            path: "/settings-provider-degradation",
        })
    }
    if (webglCheck?.status === "warning" || webglCheck?.status === "error") {
        actions.push({
            descriptionKey: "system:helpDiagnostics.actions.webglRecoveryDescription",
            id: "action-webgl-recovery",
            labelKey: "system:helpDiagnostics.actions.webglRecoveryLabel",
            path: "/dashboard/code-city",
        })
    }

    if (actions.length === 0) {
        return [
            {
                descriptionKey: "system:helpDiagnostics.actions.healthyDescription",
                id: "action-healthy",
                labelKey: "system:helpDiagnostics.actions.healthyLabel",
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
    const { t } = useTranslation(["system"])
    const { td } = useDynamicTranslation(["system"])
    const navigate = useNavigate()
    const { featureFlagsQuery: featureFlags } = useFeatureFlagsQuery()
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
            const translatedTitle = normalize(td(article.titleKey))
            const translatedSummary = normalize(td(article.summaryKey))
            const queryMatches =
                normalizedQuery.length === 0 ||
                translatedTitle.includes(normalizedQuery) ||
                translatedSummary.includes(normalizedQuery)
            return categoryMatches && queryMatches
        })
    }, [category, search, td])
    const suggestedActions = useMemo((): ReadonlyArray<IDiagnosticSuggestedAction> => {
        return buildSuggestedActions(checks)
    }, [checks])

    const handleRunDiagnostics = (): void => {
        const hasSessionToken =
            safeStorageGet(getWindowSessionStorage(), "codenautic.ui.auth.session") !== undefined
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
        setBundleMessage(t("system:helpDiagnostics.bundleReadyMessage"))
    }

    return (
        <PageShell
            subtitle={t("system:helpDiagnostics.pageSubtitle")}
            title={t("system:helpDiagnostics.pageTitle")}
        >
            {sourceContext === "error-fallback" ? (
                <Alert status="warning">
                    <Alert.Title>{t("system:helpDiagnostics.errorFallbackTitle")}</Alert.Title>
                    <Alert.Description>
                        {t("system:helpDiagnostics.errorFallbackMessage")}
                    </Alert.Description>
                </Alert>
            ) : null}

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("system:helpDiagnostics.knowledgeBaseTitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                        <label className="flex flex-col gap-1 text-sm text-muted">
                            {t("system:helpDiagnostics.searchLabel")}
                            <input
                                aria-label={t("system:helpDiagnostics.searchLabel")}
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                placeholder={t("system:helpDiagnostics.searchPlaceholder")}
                                value={search}
                                onChange={(event): void => {
                                    setSearch(event.currentTarget.value)
                                }}
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-muted">
                            {t("system:helpDiagnostics.categoryLabel")}
                            <select
                                aria-label={t("system:helpDiagnostics.categoryLabel")}
                                className={NATIVE_FORM.select}
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
                                <option value="all">
                                    {t("system:helpDiagnostics.categoryAll")}
                                </option>
                                <option value="auth">
                                    {t("system:helpDiagnostics.categoryAuth")}
                                </option>
                                <option value="network">
                                    {t("system:helpDiagnostics.categoryNetwork")}
                                </option>
                                <option value="providers">
                                    {t("system:helpDiagnostics.categoryProviders")}
                                </option>
                                <option value="incidents">
                                    {t("system:helpDiagnostics.categoryIncidents")}
                                </option>
                                <option value="rendering">
                                    {t("system:helpDiagnostics.categoryRendering")}
                                </option>
                            </select>
                        </label>
                    </div>
                    {filteredArticles.length === 0 ? (
                        <SystemStateCard
                            ctaLabel={t("system:helpDiagnostics.noMatchCta")}
                            description={t("system:helpDiagnostics.noMatchDescription")}
                            title={t("system:helpDiagnostics.noMatchTitle")}
                            variant="empty"
                            onCtaPress={(): void => {
                                setCategory("all")
                                setSearch("")
                            }}
                        />
                    ) : (
                        <ul
                            aria-label={t("system:helpDiagnostics.articlesListLabel")}
                            className="space-y-2"
                        >
                            {filteredArticles.map(
                                (article): ReactElement => (
                                    <li
                                        className="rounded-lg border border-border bg-surface px-3 py-2"
                                        key={article.id}
                                    >
                                        <p className={TYPOGRAPHY.cardTitle}>
                                            {td(article.titleKey)}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {td(article.summaryKey)}
                                        </p>
                                        <a
                                            className="mt-1 inline-flex text-xs underline underline-offset-4"
                                            href={article.href}
                                        >
                                            {t("system:helpDiagnostics.openArticleLink")}
                                        </a>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("system:helpDiagnostics.diagnosticsTitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-muted">
                            {t("system:helpDiagnostics.diagnosticsDescription")}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="secondary" onPress={handleRunDiagnostics}>
                                {t("system:helpDiagnostics.runDiagnostics")}
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={(): void => {
                                    void navigate({
                                        to: "/settings-provider-degradation",
                                    })
                                }}
                            >
                                {t("system:helpDiagnostics.openDegradationConsole")}
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={(): void => {
                                    void navigate({
                                        to: "/scan-error-recovery",
                                    })
                                }}
                            >
                                {t("system:helpDiagnostics.openScanRecovery")}
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={(): void => {
                                    void navigate({
                                        to: "/session-recovery",
                                    })
                                }}
                            >
                                {t("system:helpDiagnostics.openSessionRecovery")}
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={handleGenerateSupportBundle}
                            >
                                {t("system:helpDiagnostics.generateSupportBundle")}
                            </Button>
                        </div>
                    </div>
                    <ul
                        aria-label={t("system:helpDiagnostics.checksListLabel")}
                        className="space-y-2"
                    >
                        {checks.map(
                            (check): ReactElement => (
                                <li
                                    className="rounded-lg border border-border bg-surface px-3 py-2"
                                    key={check.id}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className={TYPOGRAPHY.cardTitle}>{td(check.labelKey)}</p>
                                        <Chip
                                            color={mapStatusColor(check.status)}
                                            size="sm"
                                            variant="soft"
                                        >
                                            {check.status}
                                        </Chip>
                                    </div>
                                    <p className="text-xs text-muted">
                                        {td(check.detailsKey, check.detailsParams)}
                                    </p>
                                    <a
                                        className="inline-flex text-xs underline underline-offset-4"
                                        href={check.articleHref}
                                    >
                                        {t("system:helpDiagnostics.openRelatedGuide")}
                                    </a>
                                </li>
                            ),
                        )}
                    </ul>
                    <div className="rounded-lg border border-border bg-surface px-3 py-2">
                        <p className={TYPOGRAPHY.cardTitle}>
                            {t("system:helpDiagnostics.suggestedActionsTitle")}
                        </p>
                        <ul
                            aria-label={t("system:helpDiagnostics.suggestedActionsListLabel")}
                            className="mt-2 space-y-2"
                        >
                            {suggestedActions.map(
                                (action): ReactElement => (
                                    <li
                                        className="rounded border border-border bg-surface px-2 py-2"
                                        key={action.id}
                                    >
                                        <p className={TYPOGRAPHY.cardTitle}>
                                            {td(action.labelKey)}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {td(action.descriptionKey)}
                                        </p>
                                        {action.path !== undefined ? (
                                            <Button
                                                className="mt-2"
                                                size="sm"
                                                variant="secondary"
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
                                                {t("system:helpDiagnostics.openAction")}
                                            </Button>
                                        ) : null}
                                    </li>
                                ),
                            )}
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("system:helpDiagnostics.supportBundleTitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button size="sm" variant="secondary" onPress={handleGenerateSupportBundle}>
                        {t("system:helpDiagnostics.generateRedactedBundle")}
                    </Button>
                    {bundleMessage.length > 0 ? (
                        <Alert status="accent">
                            <Alert.Title>
                                {t("system:helpDiagnostics.bundleReadyTitle")}
                            </Alert.Title>
                            <Alert.Description>{bundleMessage}</Alert.Description>
                        </Alert>
                    ) : null}
                    {supportBundle.length > 0 ? (
                        <TextArea
                            readOnly
                            aria-label={t("system:helpDiagnostics.supportBundlePayloadLabel")}
                            value={supportBundle}
                        />
                    ) : null}
                </CardContent>
            </Card>
        </PageShell>
    )
}
