import { type ReactElement, Suspense, lazy, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardBody, CardHeader, StyledLink } from "@/components/ui"
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
import { useUiRole } from "@/lib/permissions/ui-policy"
import { NATIVE_FORM, PAGE_LAYOUT } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { AnimatedAlert, AnimatedMount } from "@/lib/motion"

import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"

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
    if (typeof window === "undefined") {
        return {
            layoutPreset: "balanced",
            orgScope: "all-orgs",
            pinnedShortcuts: ["/reviews", "/my-work"],
            repositoryScope: "all-repos",
            teamScope: "all-teams",
        }
    }

    const raw = window.localStorage.getItem(PERSONALIZATION_STORAGE_KEY)
    if (raw === null) {
        return {
            layoutPreset: "balanced",
            orgScope: "all-orgs",
            pinnedShortcuts: ["/reviews", "/my-work"],
            repositoryScope: "all-repos",
            teamScope: "all-teams",
        }
    }

    try {
        const parsed = JSON.parse(raw) as Partial<IWorkspacePersonalization>
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
    } catch {
        return {
            layoutPreset: "balanced",
            orgScope: "all-orgs",
            pinnedShortcuts: ["/reviews", "/my-work"],
            repositoryScope: "all-repos",
            teamScope: "all-teams",
        }
    }
}

function saveWorkspacePersonalization(payload: IWorkspacePersonalization): void {
    if (typeof window === "undefined") {
        return
    }

    window.localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(payload))
}

/**
 * Mission control dashboard page with visual zoning, stagger animations,
 * and data transitions on range change.
 *
 * @returns Mission control page.
 */
export function DashboardMissionControlPage(): ReactElement {
    const { t } = useTranslation(["dashboard"])
    const uiRole = useUiRole()
    const checklistRole = uiRole === "admin" ? "admin" : "developer"
    const personalizationDefaults = readWorkspacePersonalization()
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

    if (mockModule === null) {
        return <DashboardSkeleton />
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
        const viewPayload = encodeURIComponent(
            JSON.stringify({
                layoutPreset,
                orgScope,
                pinnedShortcuts,
                repositoryScope,
                teamScope,
            }),
        )
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        setShareLink(`${origin}/?workspaceView=${viewPayload}`)
    }

    return (
        <section className={`${PAGE_LAYOUT.spacious} mx-auto max-w-[1400px]`}>
            {/* Header + Scope filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className={TYPOGRAPHY.pageTitle}>{t("dashboard:missionControl.pageTitle")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("dashboard:missionControl.scopeLabel")} {orgScope} / {repositoryScope} / {teamScope}
                    </p>
                </div>
                <div className="sm:min-w-[420px]">
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

            <ActivationChecklist role={checklistRole} />

            {/* Zone A': Hero metric + KPI grid — always visible */}
            <AnimatedMount motionKey={`hero-metrics-${range}`}>
                <div className="grid gap-4 lg:gap-6 lg:grid-cols-[auto_1fr]">
                    <DashboardHeroMetric
                        color="var(--primary)"
                        label={t("dashboard:missionControl.releaseHealth")}
                        subtitle={(t as unknown as (key: string, options: Record<string, string>) => string)("dashboard:missionControl.violations", { count: String(architectureHealth.layerViolations) })}
                        value={architectureHealth.healthScore}
                    />
                    <MetricsGrid metrics={metrics} />
                </div>
            </AnimatedMount>

            {/* Zone B: Primary charts — collapsible */}
            <DashboardZone isVisible={activePreset.showZoneB} priority="primary" title={t("dashboard:missionControl.primaryCharts")}>
                <AnimatedMount motionKey={`charts-primary-${range}`}>
                    <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                        <FlowMetricsWidget
                            capacityTrendLabel="+6%"
                            flowTrendLabel="+4%"
                            points={flowMetrics}
                        />
                        <TeamActivityWidget points={teamActivity} />
                    </div>
                </AnimatedMount>
            </DashboardZone>

            {/* Zone C: Operations — work queue + timeline */}
            <DashboardZone isVisible={activePreset.showZoneC} priority="primary" title={t("dashboard:missionControl.operations")}>
                <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardContent
                        statusDistribution={statusDistribution}
                        timeline={mockModule.TIMELINE_ENTRIES}
                        workQueue={mockModule.WORK_QUEUE_ENTRIES}
                    />
                </Suspense>
            </DashboardZone>

            {/* Zone D: Analytics — secondary charts */}
            <DashboardZone isVisible={activePreset.showZoneD} title={t("dashboard:missionControl.analytics")}>
                <AnimatedMount motionKey={`charts-secondary-${range}`}>
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
                </AnimatedMount>
            </DashboardZone>

            {/* Zone E: Explore + Signals */}
            <DashboardZone isVisible={activePreset.showZoneE} priority="tertiary" title={t("dashboard:missionControl.explore")}>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <p className={TYPOGRAPHY.sectionTitle}>{t("dashboard:missionControl.explore")}</p>
                        <ul className="space-y-1.5">{renderExploreLinks(t as unknown as (key: string) => string)}</ul>
                    </div>
                    <div className="space-y-2">
                        <p className={TYPOGRAPHY.sectionTitle}>{t("dashboard:missionControl.signals")}</p>
                        <ul className="space-y-1.5 text-sm text-text-secondary">
                            <li>{t("dashboard:missionControl.signalsDrift")}</li>
                            <li>{t("dashboard:missionControl.signalsPredictions")}</li>
                            <li>{t("dashboard:missionControl.signalsUsage")}</li>
                        </ul>
                    </div>
                </div>
            </DashboardZone>

            {/* Personalization — collapsible */}
            <div>
                <Button
                    size="sm"
                    variant="flat"
                    onPress={(): void => {
                        setIsPersonalizationOpen((prev): boolean => !prev)
                    }}
                >
                    {isPersonalizationOpen ? t("dashboard:missionControl.hidePersonalization") : t("dashboard:missionControl.workspacePersonalization")}
                </Button>
                <AnimatedAlert isVisible={isPersonalizationOpen}>
                    <Card className="mt-3">
                        <CardHeader>
                            <p className={TYPOGRAPHY.cardTitle}>
                                {t("dashboard:missionControl.workspacePersonalization")}
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <label className={`flex flex-col gap-1 ${TYPOGRAPHY.body}`}>
                                {t("dashboard:missionControl.layoutPreset")}
                                <select
                                    aria-label={t("dashboard:missionControl.layoutPresetAriaLabel")}
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
                                <p className={TYPOGRAPHY.body}>{t("dashboard:missionControl.pinnedShortcuts")}</p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {WORKSPACE_SHORTCUT_OPTIONS.map(
                                        (shortcut): ReactElement => (
                                            <label
                                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                                                key={shortcut}
                                            >
                                                <input
                                                    aria-label={(t as unknown as (key: string, options: Record<string, string>) => string)("dashboard:missionControl.pinAriaLabel", { shortcut })}
                                                    checked={pinnedShortcuts.includes(shortcut)}
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
                                    variant="flat"
                                    onPress={handleSavePersonalization}
                                >
                                    {t("dashboard:missionControl.savePersonalization")}
                                </Button>
                                <Button size="sm" variant="flat" onPress={handleGenerateShareLink}>
                                    {t("dashboard:missionControl.generateShareLink")}
                                </Button>
                            </div>

                            <AnimatedAlert isVisible={personalizationMessage.length > 0}>
                                <Alert
                                    color="primary"
                                    title={t("dashboard:missionControl.workspacePersonalization")}
                                    variant="flat"
                                >
                                    {personalizationMessage}
                                </Alert>
                            </AnimatedAlert>

                            {shareLink.length > 0 ? (
                                <input
                                    readOnly
                                    aria-label={t("dashboard:missionControl.shareLinkAriaLabel")}
                                    className="w-full rounded-lg border border-border px-3 py-2 text-xs"
                                    value={shareLink}
                                />
                            ) : null}
                        </CardBody>
                    </Card>
                </AnimatedAlert>
            </div>
        </section>
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
        { to: "/dashboard/code-city", labelKey: "dashboard:missionControl.exploreOpenGraphExplorer" },
        { to: "/dashboard/code-city", labelKey: "dashboard:missionControl.exploreOpenCausalAnalysis" },
        { to: "/dashboard/code-city", labelKey: "dashboard:missionControl.exploreOpenImpactPlanning" },
        { to: "/dashboard/code-city", labelKey: "dashboard:missionControl.exploreOpenRefactoringPlanner" },
        { to: "/dashboard/code-city", labelKey: "dashboard:missionControl.exploreOpenKnowledgeMap" },
        { to: "/reports", labelKey: "dashboard:missionControl.exploreOpenReports" },
        { to: "/reports/generate", labelKey: "dashboard:missionControl.exploreGenerateReport" },
        { to: "/settings-code-review", labelKey: "dashboard:missionControl.exploreCodeReviewConfig" },
        { to: "/settings-llm-providers", labelKey: "dashboard:missionControl.exploreLlmProviderConfig" },
        { to: "/settings-git-providers", labelKey: "dashboard:missionControl.exploreGitProviderConfig" },
    ] as const

    return links.map(
        (link): ReactElement => (
            <li key={link.labelKey}>
                <StyledLink
                    className={`${TYPOGRAPHY.body} transition-colors duration-150 hover:text-primary`}
                    to={link.to}
                >
                    {t(link.labelKey)}
                </StyledLink>
            </li>
        ),
    )
}
