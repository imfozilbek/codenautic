import { type ReactElement, Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import { Link } from "@tanstack/react-router"

import { Alert, Button, Card, CardContent, CardHeader, Skeleton } from "@heroui/react"
import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { type IProvenanceContext } from "@/components/infrastructure/data-freshness-panel"
import { DashboardCriticalSignals } from "@/components/dashboard/dashboard-critical-signals"
import { DashboardHeroMetric } from "@/components/dashboard/dashboard-hero-metric"
import { DashboardZone } from "@/components/dashboard/dashboard-zone"
import { resolveDashboardLayoutPreset } from "@/components/dashboard/dashboard-layouts"
import { FlowMetricsWidget } from "@/components/dashboard/flow-metrics-widget"
import { TeamActivityWidget } from "@/components/dashboard/team-activity-widget"
import { ArchitectureHealthWidget } from "@/components/dashboard/architecture-health-widget"
import { TokenUsageDashboardWidget } from "@/components/dashboard/token-usage-dashboard-widget"
import { type TDashboardDateRange } from "@/components/dashboard/dashboard-date-range-filter"
import { MetricsGrid } from "@/components/dashboard/metrics-grid"
import {
    DashboardScopeFilters,
    type TOrgScope,
    type TRepositoryScope,
    type TTeamScope,
} from "@/components/dashboard/dashboard-scope-filters"
import { PageShell } from "@/components/layout/page-shell"
import { useUiRole } from "@/lib/permissions/ui-policy"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { LINK_CLASSES, TYPOGRAPHY } from "@/lib/constants/typography"
import { AnimatePresence, motion } from "motion/react"

import {
    getWindowLocalStorage,
    getWindowSessionStorage,
    safeStorageGetJson,
    safeStorageSet,
    safeStorageSetJson,
} from "@/lib/utils/safe-storage"

/**
 * Inline skeleton placeholder for dashboard loading state.
 *
 * @returns Skeleton layout matching KPI/Work Queue/Timeline zones.
 */
function DashboardLoadingSkeleton(): ReactElement {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Skeleton className="shimmer h-8 w-24 rounded-lg" />
                <Skeleton className="shimmer h-8 w-40 rounded-lg" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map(
                    (_, index): ReactElement => (
                        <Card key={`metric-${String(index)}`}>
                            <CardHeader>
                                <Skeleton className="shimmer h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="mb-2 h-8 w-20" />
                                <Skeleton className="shimmer h-4 w-32" />
                                <Skeleton className="mt-4 h-4 w-16" />
                            </CardContent>
                        </Card>
                    ),
                )}
            </div>
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader>
                        <Skeleton className="shimmer h-4 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Array.from({ length: 4 }).map(
                            (_, index): ReactElement => (
                                <Skeleton
                                    key={`skeleton-${String(index)}`}
                                    className="h-16 w-full rounded-lg"
                                />
                            ),
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="shimmer h-4 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Array.from({ length: 3 }).map(
                            (_, index): ReactElement => (
                                <Skeleton
                                    key={`timeline-${String(index)}`}
                                    className="h-14 w-full rounded-lg"
                                />
                            ),
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

type TMockDataModule = typeof import("./dashboard-mock-data")

const DashboardContent = lazy(async () => {
    const module = await import("@/components/dashboard/dashboard-content")

    return { default: module.DashboardContent }
})

type TWorkspaceLayoutPreset = "balanced" | "focus" | "ops"

interface IWorkspacePersonalization {
    readonly orgScope: TOrgScope
    readonly repositoryScope: TRepositoryScope
    readonly teamScope: TTeamScope
    readonly pinnedShortcuts: ReadonlyArray<string>
    readonly layoutPreset: TWorkspaceLayoutPreset
}

const WORKSPACE_SHORTCUT_OPTIONS = [
    "/reviews",
    "/issues",
    "/dashboard/code-city",
    "/my-work",
] as const
const PERSONALIZATION_STORAGE_KEY = "ui.workspace.personalization.v1"

function readWorkspacePersonalization(): IWorkspacePersonalization {
    const defaultPersonalization: IWorkspacePersonalization = {
        layoutPreset: "balanced",
        orgScope: "all-orgs",
        pinnedShortcuts: ["/reviews", "/my-work"],
        repositoryScope: "all-repos",
        teamScope: "all-teams",
    }

    const parsed = safeStorageGetJson<Partial<IWorkspacePersonalization> | null>(
        getWindowLocalStorage(),
        PERSONALIZATION_STORAGE_KEY,
        null,
    )
    if (parsed === null) {
        return defaultPersonalization
    }

    const orgScope = parsed.orgScope
    const repositoryScope = parsed.repositoryScope
    const teamScope = parsed.teamScope
    const pinnedShortcuts = parsed.pinnedShortcuts
    const layoutPreset = parsed.layoutPreset

    return {
        layoutPreset:
            layoutPreset === "balanced" || layoutPreset === "focus" || layoutPreset === "ops"
                ? layoutPreset
                : "balanced",
        orgScope:
            orgScope === "all-orgs" ||
            orgScope === "platform-team" ||
            orgScope === "frontend-team" ||
            orgScope === "runtime-team"
                ? orgScope
                : "all-orgs",
        pinnedShortcuts: Array.isArray(pinnedShortcuts)
            ? pinnedShortcuts.filter((shortcut): shortcut is string => {
                  return (
                      typeof shortcut === "string" &&
                      WORKSPACE_SHORTCUT_OPTIONS.includes(
                          shortcut as (typeof WORKSPACE_SHORTCUT_OPTIONS)[number],
                      )
                  )
              })
            : ["/reviews", "/my-work"],
        repositoryScope:
            repositoryScope === "all-repos" ||
            repositoryScope === "repo-core" ||
            repositoryScope === "repo-ui" ||
            repositoryScope === "repo-api"
                ? repositoryScope
                : "all-repos",
        teamScope:
            teamScope === "all-teams" ||
            teamScope === "runtime" ||
            teamScope === "frontend" ||
            teamScope === "backend" ||
            teamScope === "data"
                ? teamScope
                : "all-teams",
    }
}

function saveWorkspacePersonalization(payload: IWorkspacePersonalization): void {
    safeStorageSetJson(getWindowLocalStorage(), PERSONALIZATION_STORAGE_KEY, payload)
}

/**
 * Mission control dashboard page with visual zoning, stagger animations,
 * and data transitions on range change.
 *
 * @returns Mission control page.
 */
export function DashboardMissionControlPage(): ReactElement {
    const { t } = useTranslation(["dashboard"])
    const { td } = useDynamicTranslation(["dashboard"])
    const uiRole = useUiRole()
    const checklistRole = uiRole === "admin" ? "admin" : "developer"
    const [personalizationDefaults] = useState(readWorkspacePersonalization)
    const [range, setRange] = useState<TDashboardDateRange>("7d")
    const [orgScope, setOrgScope] = useState<TOrgScope>(personalizationDefaults.orgScope)
    const [repositoryScope, setRepositoryScope] = useState<TRepositoryScope>(
        personalizationDefaults.repositoryScope,
    )
    const [teamScope, setTeamScope] = useState<TTeamScope>(personalizationDefaults.teamScope)
    const [pinnedShortcuts, setPinnedShortcuts] = useState<ReadonlyArray<string>>(
        personalizationDefaults.pinnedShortcuts,
    )
    const [layoutPreset, setLayoutPreset] = useState<TWorkspaceLayoutPreset>(
        personalizationDefaults.layoutPreset,
    )
    const [personalizationMessage, setPersonalizationMessage] = useState<string>("")
    const [shareLink, setShareLink] = useState<string>("")
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("2026-03-04T10:35:00Z")
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const [freshnessActionMessage, setFreshnessActionMessage] = useState<string>("")
    const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false)
    const [isPersonalizationOpen, setIsPersonalizationOpen] = useState<boolean>(true)
    const [mockModule, setMockModule] = useState<TMockDataModule | null>(null)

    useEffect((): void => {
        void import("./dashboard-mock-data").then(setMockModule)
    }, [])

    const metrics = useMemo(
        () => (mockModule !== null ? mockModule.getDashboardMetrics(range) : []),
        [mockModule, range],
    )
    const statusDistribution = useMemo(
        () => (mockModule !== null ? mockModule.getStatusDistribution(range) : []),
        [mockModule, range],
    )
    const opsBanner = useMemo(
        () =>
            mockModule !== null
                ? mockModule.getOpsBanner(range)
                : { isDegraded: false, message: "" },
        [mockModule, range],
    )
    const teamActivity = useMemo(
        () => (mockModule !== null ? mockModule.getTeamActivity(range) : []),
        [mockModule, range],
    )
    const flowMetrics = useMemo(
        () => (mockModule !== null ? mockModule.getFlowMetrics(range) : []),
        [mockModule, range],
    )
    const tokenUsageByModel = useMemo(
        () => (mockModule !== null ? mockModule.getTokenUsageByModel(range) : []),
        [mockModule, range],
    )
    const tokenUsageTrend = useMemo(
        () => (mockModule !== null ? mockModule.getTokenUsageTrend(range) : []),
        [mockModule, range],
    )
    const architectureHealth = useMemo(
        () =>
            mockModule !== null
                ? mockModule.getArchitectureHealth(range)
                : { dddCompliance: 0, healthScore: 0, layerViolations: 0 },
        [mockModule, range],
    )
    const provenance = useMemo(
        (): IProvenanceContext => ({
            branch: "main",
            commit: "19fca3c",
            dataWindow: `mission-control:${range}`,
            diagnosticsHref: "/settings-jobs",
            hasFailures: opsBanner.isDegraded,
            isPartial: range === "90d",
            jobId: `job-ccr-2026-03-04-${range}`,
            repository: "platform-team/control-plane",
            source: "review-worker pipeline",
        }),
        [opsBanner.isDegraded, range],
    )
    const explainabilityFactors = useMemo(
        () => [
            {
                impact: "high" as const,
                label: t("dashboard:missionControl.openCcrBacklog"),
                value:
                    range === "1d"
                        ? "19 open CCRs in current window."
                        : "41 open CCRs in trend window.",
            },
            {
                impact: "medium" as const,
                label: t("dashboard:missionControl.providerDegradation"),
                value: opsBanner.isDegraded
                    ? "Latency spike and fallback usage increased weighted risk."
                    : "Provider health is stable in current window.",
            },
            {
                impact: "low" as const,
                label: t("dashboard:missionControl.reviewThroughput"),
                value: "Throughput improved by +5%, partially reducing release risk score.",
            },
        ],
        [opsBanner.isDegraded, range, t],
    )

    const activePreset = useMemo(() => resolveDashboardLayoutPreset(layoutPreset), [layoutPreset])

    const toggleFilters = useCallback((): void => {
        setIsFiltersOpen((prev): boolean => !prev)
    }, [])

    if (mockModule === null) {
        return <DashboardLoadingSkeleton />
    }

    const handleRefresh = (): void => {
        setIsRefreshing(true)
        setLastUpdatedAt(new Date().toISOString())
        setFreshnessActionMessage(t("dashboard:missionControl.dashboardRefreshRequested"))
        setTimeout((): void => {
            setIsRefreshing(false)
        }, 450)
    }

    const handleRescan = (): void => {
        setFreshnessActionMessage(t("dashboard:missionControl.rescanQueued"))
    }

    const handleToggleShortcut = (shortcut: string): void => {
        setPinnedShortcuts((previous): ReadonlyArray<string> => {
            if (previous.includes(shortcut)) {
                return previous.filter((item): boolean => item !== shortcut)
            }
            return [...previous, shortcut]
        })
    }

    const handleSavePersonalization = (): void => {
        saveWorkspacePersonalization({
            layoutPreset,
            orgScope,
            pinnedShortcuts,
            repositoryScope,
            teamScope,
        })
        setPersonalizationMessage(t("dashboard:missionControl.personalizationSaved"))
    }

    const handleGenerateShareLink = (): void => {
        const viewId = `ws-${Date.now().toString(36)}`
        safeStorageSet(
            getWindowSessionStorage(),
            `codenautic:share:${viewId}`,
            JSON.stringify({
                layoutPreset,
                orgScope,
                pinnedShortcuts,
                repositoryScope,
                teamScope,
            }),
        )
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        setShareLink(`${origin}/?workspaceView=${viewId}`)
    }

    const scopeSubtitle = `${t("dashboard:missionControl.scopeLabel")} ${orgScope} / ${repositoryScope} / ${teamScope}`

    return (
        <PageShell
            headerActions={
                <div className="sm:min-w-[420px]">
                    <button
                        className="flex items-center gap-1 text-sm text-muted sm:hidden"
                        type="button"
                        onClick={toggleFilters}
                    >
                        {t("dashboard:missionControl.filters", { defaultValue: "Фильтры" })}{" "}
                        {isFiltersOpen ? "\u25B2" : "\u25BC"}
                    </button>
                    <div className={`${isFiltersOpen ? "block" : "hidden"} sm:block`}>
                        <DashboardScopeFilters
                            dateRange={range}
                            onDateRangeChange={setRange}
                            onOrgScopeChange={setOrgScope}
                            onRepositoryScopeChange={setRepositoryScope}
                            onTeamScopeChange={setTeamScope}
                            orgScope={orgScope}
                            repositoryScope={repositoryScope}
                            teamScope={teamScope}
                        />
                    </div>
                </div>
            }
            layout="spacious"
            subtitle={scopeSubtitle}
            title={t("dashboard:missionControl.pageTitle")}
        >
            {/* Zone A: Critical signals — always visible */}
            <DashboardCriticalSignals
                confidence="0.82"
                dataWindow={`mission-control:${range}`}
                factors={explainabilityFactors}
                freshnessActionMessage={freshnessActionMessage}
                isDegraded={opsBanner.isDegraded}
                isRefreshing={isRefreshing}
                lastUpdatedAt={lastUpdatedAt}
                limitations={[
                    t("dashboard:missionControl.scoreNotIncludeCode"),
                    t("dashboard:missionControl.crossRepoDependencies"),
                ]}
                provenance={provenance}
                signalValue={opsBanner.isDegraded ? "elevated" : "moderate"}
                onRefresh={handleRefresh}
                onRescan={handleRescan}
            />

            {/* Zone A': Hero metric + KPI grid — always visible */}
            <AnimatePresence mode="wait">
                <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0, y: 4 }}
                    key={`hero-metrics-${range}`}
                    transition={{ duration: 0.15, ease: [0.0, 0.0, 0.2, 1.0] }}
                >
                    <div className="grid gap-4 lg:gap-6 lg:grid-cols-[auto_1fr]">
                        <DashboardHeroMetric
                            color="var(--accent)"
                            label={t("dashboard:missionControl.releaseHealth")}
                            subtitle={td("dashboard:missionControl.violations", {
                                count: String(architectureHealth.layerViolations),
                            })}
                            value={architectureHealth.healthScore}
                        />
                        <MetricsGrid metrics={metrics} />
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Zone B: Primary charts — collapsible */}
            <DashboardZone
                isVisible={activePreset.showZoneB}
                priority="primary"
                title={t("dashboard:missionControl.primaryCharts")}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0, y: 4 }}
                        key={`charts-primary-${range}`}
                        transition={{ duration: 0.15, ease: [0.0, 0.0, 0.2, 1.0] }}
                    >
                        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                            <FlowMetricsWidget
                                capacityTrendLabel="+6%"
                                flowTrendLabel="+4%"
                                points={flowMetrics}
                            />
                            <TeamActivityWidget points={teamActivity} />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </DashboardZone>

            {/* Zone C: Operations — work queue + timeline */}
            <DashboardZone
                isVisible={activePreset.showZoneC}
                priority="primary"
                title={t("dashboard:missionControl.operations")}
            >
                <Suspense fallback={<DashboardLoadingSkeleton />}>
                    <DashboardContent
                        statusDistribution={statusDistribution}
                        timeline={mockModule.TIMELINE_ENTRIES}
                        workQueue={mockModule.WORK_QUEUE_ENTRIES}
                    />
                </Suspense>
            </DashboardZone>

            {/* Zone D: Analytics — secondary charts */}
            <DashboardZone
                isVisible={activePreset.showZoneD}
                title={t("dashboard:missionControl.analytics")}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0, y: 4 }}
                        key={`charts-secondary-${range}`}
                        transition={{ duration: 0.15, ease: [0.0, 0.0, 0.2, 1.0] }}
                    >
                        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                            <TokenUsageDashboardWidget
                                byModel={tokenUsageByModel}
                                costTrend={tokenUsageTrend}
                            />
                            <ArchitectureHealthWidget
                                dddCompliance={architectureHealth.dddCompliance}
                                healthScore={architectureHealth.healthScore}
                                layerViolations={architectureHealth.layerViolations}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </DashboardZone>

            {/* Zone E: Explore + Signals */}
            <DashboardZone
                isVisible={activePreset.showZoneE}
                priority="tertiary"
                title={t("dashboard:missionControl.explore")}
            >
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("dashboard:missionControl.explore")}
                        </p>
                        <ul className="space-y-1.5">{renderExploreLinks(td)}</ul>
                    </div>
                    <div className="space-y-2">
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("dashboard:missionControl.signals")}
                        </p>
                        <ul className="space-y-1.5 text-sm text-muted">
                            <li>{t("dashboard:missionControl.signalsDrift")}</li>
                            <li>{t("dashboard:missionControl.signalsPredictions")}</li>
                            <li>{t("dashboard:missionControl.signalsUsage")}</li>
                        </ul>
                    </div>
                </div>
            </DashboardZone>

            <ActivationChecklist role={checklistRole} />

            {/* Personalization — collapsible */}
            <div>
                <Button
                    size="sm"
                    variant="secondary"
                    onPress={(): void => {
                        setIsPersonalizationOpen((prev): boolean => !prev)
                    }}
                >
                    {isPersonalizationOpen
                        ? t("dashboard:missionControl.hidePersonalization")
                        : t("dashboard:missionControl.workspacePersonalization")}
                </Button>
                <AnimatePresence>
                    {isPersonalizationOpen ? (
                        <motion.div
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            initial={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] }}
                        >
                            <Card className="mt-3">
                                <CardHeader>
                                    <p className={TYPOGRAPHY.cardTitle}>
                                        {t("dashboard:missionControl.workspacePersonalization")}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <label className={`flex flex-col gap-1 ${TYPOGRAPHY.body}`}>
                                        {t("dashboard:missionControl.layoutPreset")}
                                        <select
                                            aria-label={t(
                                                "dashboard:missionControl.layoutPresetAriaLabel",
                                            )}
                                            className={NATIVE_FORM.select}
                                            value={layoutPreset}
                                            onChange={(event): void => {
                                                const nextPreset = event.currentTarget.value
                                                if (
                                                    nextPreset === "balanced" ||
                                                    nextPreset === "focus" ||
                                                    nextPreset === "ops"
                                                ) {
                                                    setLayoutPreset(nextPreset)
                                                }
                                            }}
                                        >
                                            <option value="balanced">balanced</option>
                                            <option value="focus">focus</option>
                                            <option value="ops">ops</option>
                                        </select>
                                    </label>

                                    <div className="space-y-1">
                                        <p className={TYPOGRAPHY.body}>
                                            {t("dashboard:missionControl.pinnedShortcuts")}
                                        </p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {WORKSPACE_SHORTCUT_OPTIONS.map(
                                                (shortcut): ReactElement => (
                                                    <label
                                                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                                                        key={shortcut}
                                                    >
                                                        <input
                                                            aria-label={td(
                                                                "dashboard:missionControl.pinAriaLabel",
                                                                { shortcut },
                                                            )}
                                                            checked={pinnedShortcuts.includes(
                                                                shortcut,
                                                            )}
                                                            type="checkbox"
                                                            onChange={(): void => {
                                                                handleToggleShortcut(shortcut)
                                                            }}
                                                        />
                                                        {shortcut}
                                                    </label>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onPress={handleSavePersonalization}
                                        >
                                            {t("dashboard:missionControl.savePersonalization")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onPress={handleGenerateShareLink}
                                        >
                                            {t("dashboard:missionControl.generateShareLink")}
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {personalizationMessage.length > 0 ? (
                                            <motion.div
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                initial={{ opacity: 0, height: 0 }}
                                                transition={{
                                                    duration: 0.25,
                                                    ease: [0.0, 0.0, 0.2, 1.0],
                                                }}
                                            >
                                                <Alert status="accent">
                                                    <Alert.Title>
                                                        {t(
                                                            "dashboard:missionControl.workspacePersonalization",
                                                        )}
                                                    </Alert.Title>
                                                    <Alert.Description>
                                                        {personalizationMessage}
                                                    </Alert.Description>
                                                </Alert>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>

                                    {shareLink.length > 0 ? (
                                        <input
                                            readOnly
                                            aria-label={t(
                                                "dashboard:missionControl.shareLinkAriaLabel",
                                            )}
                                            className="w-full rounded-lg border border-border px-3 py-2 text-xs"
                                            value={shareLink}
                                        />
                                    ) : null}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </PageShell>
    )
}

/**
 * Renders explore quick-links as a flat list without Card wrapper.
 *
 * @returns Explore links JSX.
 */
function renderExploreLinks(t: (key: string) => string): ReadonlyArray<ReactElement> {
    const links = [
        { to: "/reviews", labelKey: "dashboard:missionControl.exploreOpenCcr" },
        { to: "/issues", labelKey: "dashboard:missionControl.exploreOpenIssues" },
        { to: "/dashboard/code-city", labelKey: "dashboard:missionControl.exploreOpenCodeCity" },
        {
            to: "/dashboard/code-city",
            labelKey: "dashboard:missionControl.exploreOpenGraphExplorer",
        },
        {
            to: "/dashboard/code-city",
            labelKey: "dashboard:missionControl.exploreOpenCausalAnalysis",
        },
        {
            to: "/dashboard/code-city",
            labelKey: "dashboard:missionControl.exploreOpenImpactPlanning",
        },
        {
            to: "/dashboard/code-city",
            labelKey: "dashboard:missionControl.exploreOpenRefactoringPlanner",
        },
        {
            to: "/dashboard/code-city",
            labelKey: "dashboard:missionControl.exploreOpenKnowledgeMap",
        },
        { to: "/reports", labelKey: "dashboard:missionControl.exploreOpenReports" },
        { to: "/reports/generate", labelKey: "dashboard:missionControl.exploreGenerateReport" },
        {
            to: "/settings-code-review",
            labelKey: "dashboard:missionControl.exploreCodeReviewConfig",
        },
        {
            to: "/settings-llm-providers",
            labelKey: "dashboard:missionControl.exploreLlmProviderConfig",
        },
        {
            to: "/settings-git-providers",
            labelKey: "dashboard:missionControl.exploreGitProviderConfig",
        },
    ] as const

    return links.map(
        (link): ReactElement => (
            <li key={link.labelKey}>
                <Link
                    className={`${LINK_CLASSES} ${TYPOGRAPHY.body} transition-colors duration-150 hover:text-accent`}
                    to={link.to}
                >
                    {t(link.labelKey)}
                </Link>
            </li>
        ),
    )
}
