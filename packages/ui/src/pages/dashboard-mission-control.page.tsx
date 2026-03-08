import { type ReactElement, Suspense, lazy, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { type IProvenanceContext } from "@/components/infrastructure/data-freshness-panel"
import { DashboardCriticalSignals } from "@/components/dashboard/dashboard-critical-signals"
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
import { AnimatedAlert, AnimatedMount } from "@/lib/motion"
import { Link } from "@tanstack/react-router"

import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import {
    getDashboardMetrics,
    getStatusDistribution,
    getOpsBanner,
    getTeamActivity,
    getFlowMetrics,
    getTokenUsageByModel,
    getTokenUsageTrend,
    getArchitectureHealth,
    WORK_QUEUE_ENTRIES,
    TIMELINE_ENTRIES,
} from "./dashboard-mock-data"

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

    const metrics = useMemo(() => getDashboardMetrics(range), [range])
    const statusDistribution = useMemo(() => getStatusDistribution(range), [range])
    const opsBanner = useMemo(() => getOpsBanner(range), [range])
    const teamActivity = useMemo(() => getTeamActivity(range), [range])
    const flowMetrics = useMemo(() => getFlowMetrics(range), [range])
    const tokenUsageByModel = useMemo(() => getTokenUsageByModel(range), [range])
    const tokenUsageTrend = useMemo(() => getTokenUsageTrend(range), [range])
    const architectureHealth = useMemo(() => getArchitectureHealth(range), [range])
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
                label: "Open CCR backlog",
                value:
                    range === "1d"
                        ? "19 open CCRs in current window."
                        : "41 open CCRs in trend window.",
            },
            {
                impact: "medium" as const,
                label: "Provider degradation",
                value: opsBanner.isDegraded
                    ? "Latency spike and fallback usage increased weighted risk."
                    : "Provider health is stable in current window.",
            },
            {
                impact: "low" as const,
                label: "Review throughput",
                value: "Throughput improved by +5%, partially reducing release risk score.",
            },
        ],
        [opsBanner.isDegraded, range],
    )

    const handleRefresh = (): void => {
        setIsRefreshing(true)
        setLastUpdatedAt(new Date().toISOString())
        setFreshnessActionMessage("Dashboard refresh requested.")
        setTimeout((): void => {
            setIsRefreshing(false)
        }, 450)
    }

    const handleRescan = (): void => {
        setFreshnessActionMessage("Rescan job was queued from mission control.")
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
        setPersonalizationMessage("Workspace personalization saved.")
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
        <section className="space-y-6">
            {/* Header + Scope filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        Dashboard Mission Control
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Scope: {orgScope} / {repositoryScope} / {teamScope}
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

            {/* Zone A: Critical signals — ops + freshness + explainability */}
            <DashboardCriticalSignals
                confidence="0.82"
                dataWindow={`mission-control:${range}`}
                factors={explainabilityFactors}
                freshnessActionMessage={freshnessActionMessage}
                isDegraded={opsBanner.isDegraded}
                isRefreshing={isRefreshing}
                lastUpdatedAt={lastUpdatedAt}
                limitations={[
                    "Score does not include code content, only metadata and workflow signals.",
                    "Cross-repository dependencies may lag by one scan cycle.",
                ]}
                provenance={provenance}
                signalValue={opsBanner.isDegraded ? "elevated" : "moderate"}
                onRefresh={handleRefresh}
                onRescan={handleRescan}
            />

            <ActivationChecklist role={checklistRole} />

            {/* Zone B: KPI metrics — animated on range change */}
            <AnimatedMount motionKey={`metrics-${range}`}>
                <MetricsGrid metrics={metrics} />
            </AnimatedMount>

            {/* Zone C: Primary charts — side by side */}
            <AnimatedMount motionKey={`charts-primary-${range}`}>
                <div className="grid gap-4 lg:grid-cols-2">
                    <FlowMetricsWidget
                        capacityTrendLabel="+6%"
                        flowTrendLabel="+4%"
                        points={flowMetrics}
                    />
                    <TeamActivityWidget points={teamActivity} />
                </div>
            </AnimatedMount>

            {/* Zone D: Secondary charts — side by side, lighter weight */}
            <AnimatedMount motionKey={`charts-secondary-${range}`}>
                <div className="grid gap-4 lg:grid-cols-2">
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

            {/* Zone E: Work queue + timeline */}
            <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent
                    statusDistribution={statusDistribution}
                    timeline={TIMELINE_ENTRIES}
                    workQueue={WORK_QUEUE_ENTRIES}
                />
            </Suspense>

            {/* Zone F: Explore + Signals — minimal weight */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Explore</p>
                    <ul className="space-y-1.5">
                        {renderExploreLinks()}
                    </ul>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Signals</p>
                    <ul className="space-y-1.5 text-sm text-text-secondary">
                        <li>Signals: drift + architecture health warnings.</li>
                        <li>Predictions: release risk elevated in team runtime.</li>
                        <li>Usage: plan for token topup before peak window.</li>
                    </ul>
                </div>
            </div>

            {/* Personalization — collapsible */}
            <div>
                <Button
                    size="sm"
                    variant="flat"
                    onPress={(): void => {
                        setIsPersonalizationOpen((prev): boolean => !prev)
                    }}
                >
                    {isPersonalizationOpen ? "Hide personalization" : "Workspace personalization"}
                </Button>
                <AnimatedAlert isVisible={isPersonalizationOpen}>
                    <Card className="mt-3">
                        <CardHeader>
                            <p className="text-sm font-semibold text-foreground">
                                Workspace personalization
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <label className="flex flex-col gap-1 text-sm text-foreground">
                                Layout preset
                                <select
                                    aria-label="Layout preset"
                                    className="rounded-lg border border-border px-3 py-2 text-sm"
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
                                <p className="text-sm text-foreground">Pinned shortcuts</p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {WORKSPACE_SHORTCUT_OPTIONS.map(
                                        (shortcut): ReactElement => (
                                            <label
                                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                                                key={shortcut}
                                            >
                                                <input
                                                    aria-label={`Pin ${shortcut}`}
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
                                    Save personalization
                                </Button>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    onPress={handleGenerateShareLink}
                                >
                                    Generate share link
                                </Button>
                            </div>

                            <AnimatedAlert isVisible={personalizationMessage.length > 0}>
                                <Alert
                                    color="primary"
                                    title="Workspace personalization"
                                    variant="flat"
                                >
                                    {personalizationMessage}
                                </Alert>
                            </AnimatedAlert>

                            {shareLink.length > 0 ? (
                                <input
                                    readOnly
                                    aria-label="Workspace share link"
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
function renderExploreLinks(): ReadonlyArray<ReactElement> {
    const links = [
        { to: "/reviews", label: "Open CCR" },
        { to: "/issues", label: "Open Issues" },
        { to: "/dashboard/code-city", label: "Open CodeCity" },
        { to: "/dashboard/code-city", label: "Open Graph Explorer" },
        { to: "/dashboard/code-city", label: "Open Causal Analysis" },
        { to: "/dashboard/code-city", label: "Open Impact Planning" },
        { to: "/dashboard/code-city", label: "Open Refactoring Planner" },
        { to: "/dashboard/code-city", label: "Open Knowledge Map" },
        { to: "/reports", label: "Open Reports" },
        { to: "/reports/generate", label: "Generate report" },
        { to: "/settings-code-review", label: "Code review config" },
        { to: "/settings-llm-providers", label: "LLM provider config" },
        { to: "/settings-git-providers", label: "Git provider config" },
    ]

    return links.map(
        (link): ReactElement => (
            <li key={link.to}>
                <Link
                    className="text-sm text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-primary"
                    to={link.to}
                >
                    {link.label}
                </Link>
            </li>
        ),
    )
}
