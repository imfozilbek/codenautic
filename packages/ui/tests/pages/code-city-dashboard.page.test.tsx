import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CodeCityDashboardPage } from "@/pages/code-city-dashboard.page"
import { renderWithProviders } from "../utils/render"

const { mockCodeCityTreemap } = vi.hoisted(() => ({
    mockCodeCityTreemap: vi.fn(
        (props: {
            readonly comparisonLabel: string
            readonly compareFiles: ReadonlyArray<unknown>
            readonly defaultMetric: "complexity" | "coverage" | "churn"
            readonly fileLink: (file: { readonly fileId: string; readonly path: string }) => string
            readonly fileColorById?: Readonly<Record<string, string>>
            readonly packageColorByName?: Readonly<Record<string, string>>
            readonly files: ReadonlyArray<unknown>
            readonly highlightedFileId?: string
            readonly impactedFiles: ReadonlyArray<unknown>
            readonly temporalCouplings: ReadonlyArray<unknown>
            readonly title: string
            readonly key?: string
        }): React.JSX.Element => {
            return (
                <div>
                    <p>{props.title}</p>
                    <p>{props.defaultMetric}</p>
                    <p>comparison-label:{props.comparisonLabel}</p>
                    <p>temporal-couplings:{props.temporalCouplings.length}</p>
                    <p>impacted-files:{props.impactedFiles.length}</p>
                    <p>ownership-colors:{Object.keys(props.fileColorById ?? {}).length}</p>
                    <p>bus-factor-colors:{Object.keys(props.packageColorByName ?? {}).length}</p>
                    <p>highlighted-file:{props.highlightedFileId ?? "none"}</p>
                </div>
            )
        },
    ),
}))
const { mockPackageDependencyGraph } = vi.hoisted(() => ({
    mockPackageDependencyGraph: vi.fn(
        (props: {
            readonly height: string
            readonly nodes: ReadonlyArray<{
                readonly id: string
                readonly layer: string
                readonly name: string
            }>
            readonly relations: ReadonlyArray<{
                readonly source: string
                readonly target: string
                readonly relationType?: string
            }>
            readonly title?: string
            readonly showControls?: boolean
            readonly showMiniMap?: boolean
        }): React.JSX.Element => {
            return (
                <div>
                    <p>{props.title}</p>
                    <p>nodes:{props.nodes.length}</p>
                    <p>edges:{props.relations.length}</p>
                    <p>show-controls:{props.showControls === true ? "true" : "false"}</p>
                    <p>show-minimap:{props.showMiniMap === true ? "true" : "false"}</p>
                </div>
            )
        },
    ),
}))
const { mockCodeCity3DScene } = vi.hoisted(() => ({
    mockCodeCity3DScene: vi.fn(
        (props: {
            readonly title: string
            readonly causalCouplings: ReadonlyArray<unknown>
            readonly files: ReadonlyArray<unknown>
            readonly impactedFiles: ReadonlyArray<unknown>
            readonly navigationChainFileIds: ReadonlyArray<string>
            readonly navigationActiveFileId?: string
            readonly navigationLabel?: string
            readonly height?: number
        }): React.JSX.Element => {
            return (
                <div>
                    <p>{props.title}</p>
                    <p>3d-files:{props.files.length}</p>
                    <p>3d-impacted:{props.impactedFiles.length}</p>
                    <p>3d-couplings:{props.causalCouplings.length}</p>
                    <p>3d-nav-chain:{props.navigationChainFileIds.length}</p>
                    <p>3d-nav-active:{props.navigationActiveFileId ?? "none"}</p>
                    <p>3d-nav-label:{props.navigationLabel ?? "none"}</p>
                </div>
            )
        },
    ),
}))
const { mockChurnComplexityScatter } = vi.hoisted(() => ({
    mockChurnComplexityScatter: vi.fn(
        (props: {
            readonly files: ReadonlyArray<{ readonly id: string }>
            readonly selectedFileId?: string
            readonly onFileSelect?: (fileId: string) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <button
                        onClick={(): void => {
                            const firstFile = props.files.at(0)
                            if (firstFile !== undefined) {
                                props.onFileSelect?.(firstFile.id)
                            }
                        }}
                        type="button"
                    >
                        select scatter file
                    </button>
                    <p>scatter-selected:{props.selectedFileId ?? "none"}</p>
                </div>
            )
        },
    ),
}))
const { mockHealthTrendChart } = vi.hoisted(() => ({
    mockHealthTrendChart: vi.fn(
        (props: { readonly points: ReadonlyArray<unknown> }): React.JSX.Element => {
            return <p>health-points:{props.points.length}</p>
        },
    ),
}))
const { mockProjectOverviewPanel } = vi.hoisted(() => ({
    mockProjectOverviewPanel: vi.fn(
        (props: {
            readonly files: ReadonlyArray<unknown>
            readonly repositoryId: string
            readonly repositoryLabel: string
        }): React.JSX.Element => {
            return (
                <div>
                    <p>overview-repository:{props.repositoryId}</p>
                    <p>overview-label:{props.repositoryLabel}</p>
                    <p>overview-files:{props.files.length}</p>
                </div>
            )
        },
    ),
}))
const { mockExploreModeSidebar } = vi.hoisted(() => ({
    mockExploreModeSidebar: vi.fn(
        (props: {
            readonly paths: ReadonlyArray<unknown>
            readonly onNavigatePath: (path: {
                readonly id: string
                readonly title: string
                readonly role: string
                readonly description: string
                readonly fileChainIds: ReadonlyArray<string>
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>explore-paths:{props.paths.length}</p>
                    <button
                        onClick={(): void => {
                            props.onNavigatePath({
                                description: "Mock exploration path",
                                fileChainIds: [
                                    "src/pages/ccr-management.page.tsx",
                                    "src/components/graphs/codecity-treemap.tsx",
                                ],
                                id: "explore-1",
                                role: "backend",
                                title: "Mock backend path",
                            })
                        }}
                        type="button"
                    >
                        trigger explore navigate
                    </button>
                </div>
            )
        },
    ),
}))
const { mockHotAreaHighlights } = vi.hoisted(() => ({
    mockHotAreaHighlights: vi.fn(
        (props: {
            readonly highlights: ReadonlyArray<unknown>
            readonly onFocusHotArea?: (highlight: {
                readonly fileId: string
                readonly label: string
                readonly description: string
                readonly severity: "critical" | "high" | "medium"
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>hot-areas:{props.highlights.length}</p>
                    <button
                        onClick={(): void => {
                            props.onFocusHotArea?.({
                                description: "Mock hotspot detail",
                                fileId: "src/pages/ccr-management.page.tsx",
                                label: "src/pages/ccr-management.page.tsx",
                                severity: "critical",
                            })
                        }}
                        type="button"
                    >
                        trigger hot area focus
                    </button>
                </div>
            )
        },
    ),
}))
const { mockOnboardingProgressTracker } = vi.hoisted(() => ({
    mockOnboardingProgressTracker: vi.fn(
        (props: {
            readonly modules: ReadonlyArray<{
                readonly id: string
                readonly title: string
                readonly description: string
                readonly isComplete: boolean
            }>
        }): React.JSX.Element => {
            const completedCount = props.modules.filter((module): boolean => module.isComplete).length
            return (
                <div>
                    <p>onboarding-modules:{props.modules.length}</p>
                    <p>onboarding-completed:{completedCount}</p>
                </div>
            )
        },
    ),
}))
const { mockTourCustomizer } = vi.hoisted(() => ({
    mockTourCustomizer: vi.fn(
        (props: {
            readonly isAdmin: boolean
            readonly steps: ReadonlyArray<{
                readonly id: string
                readonly title: string
                readonly description: string
            }>
            readonly onStepsChange: (steps: ReadonlyArray<{
                readonly id: string
                readonly title: string
                readonly description: string
            }>) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>tour-customizer-steps:{props.steps.length}</p>
                    <p>tour-customizer-admin:{props.isAdmin ? "yes" : "no"}</p>
                    <button
                        onClick={(): void => {
                            props.onStepsChange([
                                ...props.steps,
                                {
                                    description: "Custom stop injected by test",
                                    id: "custom-stop",
                                    title: "Custom stop",
                                },
                            ])
                        }}
                        type="button"
                    >
                        apply custom tour
                    </button>
                </div>
            )
        },
    ),
}))
const { mockRefactoringDashboard } = vi.hoisted(() => ({
    mockRefactoringDashboard: vi.fn(
        (props: {
            readonly targets: ReadonlyArray<{
                readonly fileId: string
                readonly title: string
                readonly module: string
                readonly roiScore: number
                readonly riskScore: number
                readonly effortScore: number
            }>
            readonly onSelectTarget?: (target: {
                readonly fileId: string
                readonly title: string
                readonly module: string
                readonly roiScore: number
                readonly riskScore: number
                readonly effortScore: number
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>refactor-targets:{props.targets.length}</p>
                    <button
                        onClick={(): void => {
                            const firstTarget = props.targets.at(0)
                            if (firstTarget !== undefined) {
                                props.onSelectTarget?.(firstTarget)
                            }
                        }}
                        type="button"
                    >
                        inspect refactor target
                    </button>
                </div>
            )
        },
    ),
}))
const { mockROICalculatorWidget } = vi.hoisted(() => ({
    mockROICalculatorWidget: vi.fn(
        (props: {
            readonly targets: ReadonlyArray<{
                readonly fileId: string
                readonly title: string
                readonly module: string
                readonly roiScore: number
                readonly riskScore: number
                readonly effortScore: number
            }>
            readonly onApplyScenario?: (fileIds: ReadonlyArray<string>) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>roi-targets:{props.targets.length}</p>
                    <button
                        onClick={(): void => {
                            const firstTarget = props.targets.at(0)
                            const secondTarget = props.targets.at(1)
                            if (firstTarget === undefined || secondTarget === undefined) {
                                return
                            }
                            props.onApplyScenario?.([firstTarget.fileId, secondTarget.fileId])
                        }}
                        type="button"
                    >
                        apply roi scenario
                    </button>
                </div>
            )
        },
    ),
}))
const { mockCityRefactoringOverlay } = vi.hoisted(() => ({
    mockCityRefactoringOverlay: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<{
                readonly fileId: string
                readonly label: string
                readonly priority: "critical" | "high" | "medium"
                readonly details: string
            }>
            readonly onSelectEntry?: (entry: {
                readonly fileId: string
                readonly label: string
                readonly priority: "critical" | "high" | "medium"
                readonly details: string
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>refactor-overlay-entries:{props.entries.length}</p>
                    <button
                        onClick={(): void => {
                            const firstEntry = props.entries.at(0)
                            if (firstEntry !== undefined) {
                                props.onSelectEntry?.(firstEntry)
                            }
                        }}
                        type="button"
                    >
                        inspect refactor overlay
                    </button>
                </div>
            )
        },
    ),
}))
const { mockSimulationPanel } = vi.hoisted(() => ({
    mockSimulationPanel: vi.fn(
        (props: {
            readonly targets: ReadonlyArray<{
                readonly fileId: string
                readonly title: string
                readonly module: string
                readonly roiScore: number
                readonly riskScore: number
                readonly effortScore: number
            }>
            readonly onPreviewScenario?: (scenario: {
                readonly mode: "before" | "after"
                readonly fileIds: ReadonlyArray<string>
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>simulation-targets:{props.targets.length}</p>
                    <button
                        onClick={(): void => {
                            const firstTarget = props.targets.at(0)
                            const secondTarget = props.targets.at(1)
                            if (firstTarget === undefined || secondTarget === undefined) {
                                return
                            }
                            props.onPreviewScenario?.({
                                fileIds: [firstTarget.fileId, secondTarget.fileId],
                                mode: "after",
                            })
                        }}
                        type="button"
                    >
                        preview refactor simulation
                    </button>
                </div>
            )
        },
    ),
}))
const { mockRefactoringTimeline } = vi.hoisted(() => ({
    mockRefactoringTimeline: vi.fn(
        (props: {
            readonly tasks: ReadonlyArray<{
                readonly id: string
                readonly fileId: string
                readonly title: string
                readonly startWeek: number
                readonly durationWeeks: number
                readonly dependencies: ReadonlyArray<string>
            }>
            readonly onSelectTask?: (task: {
                readonly id: string
                readonly fileId: string
                readonly title: string
                readonly startWeek: number
                readonly durationWeeks: number
                readonly dependencies: ReadonlyArray<string>
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>timeline-tasks:{props.tasks.length}</p>
                    <button
                        onClick={(): void => {
                            const firstTask = props.tasks.at(0)
                            if (firstTask !== undefined) {
                                props.onSelectTask?.(firstTask)
                            }
                        }}
                        type="button"
                    >
                        inspect timeline task
                    </button>
                </div>
            )
        },
    ),
}))
const { mockRefactoringExportDialog } = vi.hoisted(() => ({
    mockRefactoringExportDialog: vi.fn(
        (props: {
            readonly targets: ReadonlyArray<{
                readonly fileId: string
                readonly title: string
                readonly module: string
                readonly roiScore: number
                readonly riskScore: number
                readonly effortScore: number
            }>
            readonly onExport?: (payload: {
                readonly destination: "github" | "jira"
                readonly templateTitle: string
                readonly templateBody: string
                readonly fileIds: ReadonlyArray<string>
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>export-targets:{props.targets.length}</p>
                    <button
                        onClick={(): void => {
                            const firstTarget = props.targets.at(0)
                            const secondTarget = props.targets.at(1)
                            if (firstTarget === undefined || secondTarget === undefined) {
                                return
                            }
                            props.onExport?.({
                                destination: "jira",
                                fileIds: [firstTarget.fileId, secondTarget.fileId],
                                templateBody: "Body template",
                                templateTitle: "Title template",
                            })
                        }}
                        type="button"
                    >
                        export refactor plan
                    </button>
                </div>
            )
        },
    ),
}))
const { mockImpactAnalysisPanel } = vi.hoisted(() => ({
    mockImpactAnalysisPanel: vi.fn(
        (props: {
            readonly seeds: ReadonlyArray<{
                readonly id: string
                readonly fileId: string
                readonly label: string
                readonly affectedFiles: ReadonlyArray<string>
                readonly affectedTests: ReadonlyArray<string>
                readonly affectedConsumers: ReadonlyArray<string>
                readonly riskScore: number
            }>
            readonly onApplyImpact?: (selection: {
                readonly fileId: string
                readonly label: string
                readonly riskScore: number
                readonly affectedFiles: ReadonlyArray<string>
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>impact-seeds:{props.seeds.length}</p>
                    <button
                        onClick={(): void => {
                            const firstSeed = props.seeds.at(0)
                            if (firstSeed === undefined) {
                                return
                            }
                            props.onApplyImpact?.({
                                affectedFiles: firstSeed.affectedFiles,
                                fileId: firstSeed.fileId,
                                label: firstSeed.label,
                                riskScore: firstSeed.riskScore,
                            })
                        }}
                        type="button"
                    >
                        apply impact analysis
                    </button>
                </div>
            )
        },
    ),
}))
const { mockCityImpactOverlay } = vi.hoisted(() => ({
    mockCityImpactOverlay: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<{
                readonly fileId: string
                readonly label: string
                readonly intensity: number
                readonly details: string
            }>
            readonly onSelectEntry?: (entry: {
                readonly fileId: string
                readonly label: string
                readonly intensity: number
                readonly details: string
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>city-impact-entries:{props.entries.length}</p>
                    <button
                        onClick={(): void => {
                            const firstEntry = props.entries.at(0)
                            if (firstEntry !== undefined) {
                                props.onSelectEntry?.(firstEntry)
                            }
                        }}
                        type="button"
                    >
                        inspect city impact overlay
                    </button>
                </div>
            )
        },
    ),
}))
const { mockCityBusFactorOverlay } = vi.hoisted(() => ({
    mockCityBusFactorOverlay: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<{
                readonly districtId: string
                readonly districtLabel: string
                readonly busFactor: number
                readonly fileCount: number
                readonly fileIds: ReadonlyArray<string>
                readonly primaryFileId: string
            }>
            readonly activeDistrictId?: string
            readonly onSelectEntry?: (entry: {
                readonly districtId: string
                readonly districtLabel: string
                readonly busFactor: number
                readonly fileCount: number
                readonly fileIds: ReadonlyArray<string>
                readonly primaryFileId: string
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>bus-factor-entries:{props.entries.length}</p>
                    <p>bus-factor-active:{props.activeDistrictId ?? "none"}</p>
                    <button
                        onClick={(): void => {
                            const firstEntry = props.entries.at(0)
                            if (firstEntry !== undefined) {
                                props.onSelectEntry?.(firstEntry)
                            }
                        }}
                        type="button"
                    >
                        inspect bus factor district
                    </button>
                </div>
            )
        },
    ),
}))
const { mockKnowledgeSiloPanel } = vi.hoisted(() => ({
    mockKnowledgeSiloPanel: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<{
                readonly siloId: string
                readonly siloLabel: string
                readonly riskScore: number
                readonly contributorCount: number
                readonly fileCount: number
                readonly fileIds: ReadonlyArray<string>
                readonly primaryFileId: string
            }>
            readonly activeSiloId?: string
            readonly onSelectEntry?: (entry: {
                readonly siloId: string
                readonly siloLabel: string
                readonly riskScore: number
                readonly contributorCount: number
                readonly fileCount: number
                readonly fileIds: ReadonlyArray<string>
                readonly primaryFileId: string
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>knowledge-silo-entries:{props.entries.length}</p>
                    <p>knowledge-silo-active:{props.activeSiloId ?? "none"}</p>
                    <button
                        onClick={(): void => {
                            const firstEntry = props.entries.at(0)
                            if (firstEntry !== undefined) {
                                props.onSelectEntry?.(firstEntry)
                            }
                        }}
                        type="button"
                    >
                        inspect knowledge silo
                    </button>
                </div>
            )
        },
    ),
}))
const { mockCityOwnershipOverlay } = vi.hoisted(() => ({
    mockCityOwnershipOverlay: vi.fn(
        (props: {
            readonly owners: ReadonlyArray<{
                readonly ownerId: string
                readonly ownerName: string
                readonly color: string
                readonly fileIds: ReadonlyArray<string>
                readonly primaryFileId: string
            }>
            readonly isEnabled: boolean
            readonly activeOwnerId?: string
            readonly onToggleEnabled?: (nextEnabled: boolean) => void
            readonly onSelectOwner?: (owner: {
                readonly ownerId: string
                readonly ownerName: string
                readonly color: string
                readonly fileIds: ReadonlyArray<string>
                readonly primaryFileId: string
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>ownership-owners:{props.owners.length}</p>
                    <p>ownership-enabled:{props.isEnabled ? "yes" : "no"}</p>
                    <p>ownership-active:{props.activeOwnerId ?? "none"}</p>
                    <button
                        onClick={(): void => {
                            props.onToggleEnabled?.(props.isEnabled === false)
                        }}
                        type="button"
                    >
                        toggle ownership colors
                    </button>
                    <button
                        onClick={(): void => {
                            const firstOwner = props.owners.at(0)
                            if (firstOwner !== undefined) {
                                props.onSelectOwner?.(firstOwner)
                            }
                        }}
                        type="button"
                    >
                        focus ownership owner
                    </button>
                </div>
            )
        },
    ),
}))
const { mockChangeRiskGauge } = vi.hoisted(() => ({
    mockChangeRiskGauge: vi.fn(
        (props: {
            readonly currentScore: number
            readonly historicalPoints: ReadonlyArray<{
                readonly label: string
                readonly score: number
            }>
            readonly onSelectHistoricalPoint?: (point: {
                readonly label: string
                readonly score: number
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>risk-current:{props.currentScore}</p>
                    <p>risk-history:{props.historicalPoints.length}</p>
                    <button
                        onClick={(): void => {
                            const firstPoint = props.historicalPoints.at(0)
                            if (firstPoint !== undefined) {
                                props.onSelectHistoricalPoint?.(firstPoint)
                            }
                        }}
                        type="button"
                    >
                        inspect change risk point
                    </button>
                </div>
            )
        },
    ),
}))
const { mockImpactGraphView } = vi.hoisted(() => ({
    mockImpactGraphView: vi.fn(
        (props: {
            readonly nodes: ReadonlyArray<{
                readonly id: string
                readonly label: string
                readonly depth: number
                readonly impactScore: number
            }>
            readonly edges: ReadonlyArray<{
                readonly id: string
                readonly sourceId: string
                readonly targetId: string
            }>
            readonly onFocusNode?: (node: {
                readonly id: string
                readonly label: string
                readonly depth: number
                readonly impactScore: number
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>impact-graph-nodes:{props.nodes.length}</p>
                    <p>impact-graph-edges:{props.edges.length}</p>
                    <button
                        onClick={(): void => {
                            const firstNode = props.nodes.at(0)
                            if (firstNode !== undefined) {
                                props.onFocusNode?.(firstNode)
                            }
                        }}
                        type="button"
                    >
                        inspect impact graph node
                    </button>
                </div>
            )
        },
    ),
}))
const { mockWhatIfPanel } = vi.hoisted(() => ({
    mockWhatIfPanel: vi.fn(
        (props: {
            readonly options: ReadonlyArray<{
                readonly id: string
                readonly fileId: string
                readonly label: string
                readonly impactScore: number
                readonly affectedCount: number
            }>
            readonly onRunScenario?: (selection: {
                readonly fileIds: ReadonlyArray<string>
                readonly aggregatedScore: number
                readonly totalAffectedCount: number
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>what-if-options:{props.options.length}</p>
                    <button
                        onClick={(): void => {
                            const firstOption = props.options.at(0)
                            const secondOption = props.options.at(1)
                            if (firstOption === undefined || secondOption === undefined) {
                                return
                            }
                            props.onRunScenario?.({
                                aggregatedScore: Math.round(
                                    (firstOption.impactScore + secondOption.impactScore) / 2,
                                ),
                                fileIds: [firstOption.fileId, secondOption.fileId],
                                totalAffectedCount:
                                    firstOption.affectedCount + secondOption.affectedCount,
                            })
                        }}
                        type="button"
                    >
                        run what-if scenario
                    </button>
                </div>
            )
        },
    ),
}))
const { mockRootCauseChainViewer } = vi.hoisted(() => ({
    mockRootCauseChainViewer: vi.fn(
        (props: {
            readonly issues: ReadonlyArray<unknown>
            readonly onChainFocusChange?: (payload: {
                readonly issueId: string
                readonly issueTitle: string
                readonly chainFileIds: ReadonlyArray<string>
                readonly activeFileId?: string
                readonly activeNodeId?: string
            }) => void
        }): React.JSX.Element => {
            return (
                <div>
                    <p>root-cause-issues:{props.issues.length}</p>
                    <button
                        onClick={(): void => {
                            props.onChainFocusChange?.({
                                activeFileId: "src/components/graphs/codecity-treemap.tsx",
                                activeNodeId: "node-1",
                                chainFileIds: [
                                    "src/pages/ccr-management.page.tsx",
                                    "src/components/graphs/codecity-treemap.tsx",
                                ],
                                issueId: "issue-1",
                                issueTitle: "Mock issue chain",
                            })
                        }}
                        type="button"
                    >
                        trigger root cause focus
                    </button>
                </div>
            )
        },
    ),
}))

vi.mock("@/components/graphs/codecity-treemap", () => ({
    CodeCityTreemap: mockCodeCityTreemap,
}))
vi.mock("@/components/graphs/package-dependency-graph", () => ({
    PackageDependencyGraph: mockPackageDependencyGraph,
}))
vi.mock("@/components/graphs/codecity-3d-scene", () => ({
    CodeCity3DScene: mockCodeCity3DScene,
}))
vi.mock("@/components/graphs/churn-complexity-scatter", () => ({
    ChurnComplexityScatter: mockChurnComplexityScatter,
}))
vi.mock("@/components/graphs/health-trend-chart", () => ({
    HealthTrendChart: mockHealthTrendChart,
}))
vi.mock("@/components/graphs/project-overview-panel", () => ({
    ProjectOverviewPanel: mockProjectOverviewPanel,
}))
vi.mock("@/components/graphs/explore-mode-sidebar", () => ({
    ExploreModeSidebar: mockExploreModeSidebar,
}))
vi.mock("@/components/graphs/hot-area-highlights", () => ({
    HotAreaHighlights: mockHotAreaHighlights,
}))
vi.mock("@/components/graphs/onboarding-progress-tracker", () => ({
    OnboardingProgressTracker: mockOnboardingProgressTracker,
}))
vi.mock("@/components/graphs/tour-customizer", () => ({
    TourCustomizer: mockTourCustomizer,
}))
vi.mock("@/components/graphs/refactoring-dashboard", () => ({
    RefactoringDashboard: mockRefactoringDashboard,
}))
vi.mock("@/components/graphs/roi-calculator-widget", () => ({
    ROICalculatorWidget: mockROICalculatorWidget,
}))
vi.mock("@/components/graphs/city-refactoring-overlay", () => ({
    CityRefactoringOverlay: mockCityRefactoringOverlay,
}))
vi.mock("@/components/graphs/simulation-panel", () => ({
    SimulationPanel: mockSimulationPanel,
}))
vi.mock("@/components/graphs/refactoring-timeline", () => ({
    RefactoringTimeline: mockRefactoringTimeline,
}))
vi.mock("@/components/graphs/refactoring-export-dialog", () => ({
    RefactoringExportDialog: mockRefactoringExportDialog,
}))
vi.mock("@/components/graphs/impact-analysis-panel", () => ({
    ImpactAnalysisPanel: mockImpactAnalysisPanel,
}))
vi.mock("@/components/graphs/city-impact-overlay", () => ({
    CityImpactOverlay: mockCityImpactOverlay,
}))
vi.mock("@/components/graphs/city-bus-factor-overlay", () => ({
    CityBusFactorOverlay: mockCityBusFactorOverlay,
}))
vi.mock("@/components/graphs/knowledge-silo-panel", () => ({
    KnowledgeSiloPanel: mockKnowledgeSiloPanel,
}))
vi.mock("@/components/graphs/city-ownership-overlay", () => ({
    CityOwnershipOverlay: mockCityOwnershipOverlay,
}))
vi.mock("@/components/graphs/change-risk-gauge", () => ({
    ChangeRiskGauge: mockChangeRiskGauge,
}))
vi.mock("@/components/graphs/impact-graph-view", () => ({
    ImpactGraphView: mockImpactGraphView,
}))
vi.mock("@/components/graphs/what-if-panel", () => ({
    WhatIfPanel: mockWhatIfPanel,
}))
vi.mock("@/components/graphs/root-cause-chain-viewer", () => ({
    RootCauseChainViewer: mockRootCauseChainViewer,
}))

beforeEach((): void => {
    mockCodeCityTreemap.mockClear()
    mockPackageDependencyGraph.mockClear()
    mockCodeCity3DScene.mockClear()
    mockChurnComplexityScatter.mockClear()
    mockHealthTrendChart.mockClear()
    mockProjectOverviewPanel.mockClear()
    mockExploreModeSidebar.mockClear()
    mockHotAreaHighlights.mockClear()
    mockOnboardingProgressTracker.mockClear()
    mockTourCustomizer.mockClear()
    mockRefactoringDashboard.mockClear()
    mockROICalculatorWidget.mockClear()
    mockCityRefactoringOverlay.mockClear()
    mockSimulationPanel.mockClear()
    mockRefactoringTimeline.mockClear()
    mockRefactoringExportDialog.mockClear()
    mockImpactAnalysisPanel.mockClear()
    mockCityImpactOverlay.mockClear()
    mockCityBusFactorOverlay.mockClear()
    mockKnowledgeSiloPanel.mockClear()
    mockCityOwnershipOverlay.mockClear()
    mockChangeRiskGauge.mockClear()
    mockImpactGraphView.mockClear()
    mockWhatIfPanel.mockClear()
    mockRootCauseChainViewer.mockClear()
})

describe("CodeCityDashboardPage", (): void => {
    it("рендерит базовый dashboard с переключателями фильтров", (): void => {
        renderWithProviders(<CodeCityDashboardPage />)

        expect(screen.getByText("CodeCity dashboard")).not.toBeNull()
        expect(screen.getByLabelText("Repository")).not.toBeNull()
        expect(screen.getByLabelText("Metric")).not.toBeNull()
        expect(screen.getByRole("option", { name: "platform-team/api-gateway" }))
            .not.toBeNull()
        expect(screen.getByRole("option", { name: "frontend-team/ui-dashboard" }))
            .not.toBeNull()
        expect(screen.getByRole("option", { name: "backend-core/payment-worker" }))
            .not.toBeNull()
        expect(screen.getByText("Active overlay: Impact map")).not.toBeNull()
        expect(screen.getByText("Guided tour")).not.toBeNull()
        expect(screen.getByText("Step 1 of 3")).not.toBeNull()

        const firstTreemapCall = mockCodeCityTreemap.mock.calls.at(0)?.[0]
        expect(firstTreemapCall).not.toBeUndefined()
        expect(firstTreemapCall?.defaultMetric).toBe("complexity")
        expect(firstTreemapCall?.title).toBe("platform-team/api-gateway treemap")
        expect(firstTreemapCall?.temporalCouplings.length).toBe(0)
        expect(firstTreemapCall?.impactedFiles.length).toBeGreaterThan(0)
        expect(Object.keys(firstTreemapCall?.fileColorById ?? {})).not.toHaveLength(0)
        expect(Object.keys(firstTreemapCall?.packageColorByName ?? {})).not.toHaveLength(0)
        const firstTreemapFile = firstTreemapCall?.files.at(0) as
            | {
                readonly bugIntroductions?: Readonly<Record<string, number>>
            }
            | undefined
        expect(firstTreemapFile?.bugIntroductions?.["30d"]).toBeGreaterThan(0)

        const firstGraphCall = mockPackageDependencyGraph.mock.calls.at(0)?.[0]
        expect(firstGraphCall).not.toBeUndefined()
        expect(firstGraphCall?.title).toBe("Cross-repository package dependencies")
        expect(firstGraphCall?.nodes.length).toBe(3)
        expect(firstGraphCall?.relations.length).toBe(4)

        const first3DCall = mockCodeCity3DScene.mock.calls.at(0)?.[0]
        expect(first3DCall).not.toBeUndefined()
        expect(first3DCall?.title).toBe("platform-team/api-gateway 3D scene")
        expect(first3DCall?.files.length).toBeGreaterThan(0)
        expect(first3DCall?.impactedFiles.length).toBeGreaterThan(0)
        expect(first3DCall?.causalCouplings.length).toBe(0)
        expect(first3DCall?.navigationChainFileIds.length).toBe(0)
        expect(first3DCall?.navigationActiveFileId).toBeUndefined()
        const first3DFile = first3DCall?.files.at(0) as
            | {
                readonly complexity?: number
                readonly coverage?: number
                readonly id: string
                readonly loc?: number
                readonly path: string
            }
            | undefined
        expect(first3DFile?.id.length).toBeGreaterThan(0)
        expect(first3DFile?.path.length).toBeGreaterThan(0)
        expect(first3DFile?.loc).toBeGreaterThan(0)
        expect(first3DFile?.complexity).toBeGreaterThan(0)
        expect(first3DFile?.coverage).toBeGreaterThan(0)
        const first3DImpactedFile = first3DCall?.impactedFiles.at(0) as
            | {
                readonly fileId: string
                readonly impactType: "changed" | "impacted" | "ripple"
            }
            | undefined
        expect(first3DImpactedFile?.fileId.length).toBeGreaterThan(0)

        const firstScatterCall = mockChurnComplexityScatter.mock.calls.at(0)?.[0]
        expect(firstScatterCall).not.toBeUndefined()
        expect(firstScatterCall?.selectedFileId).toBeUndefined()

        const firstHealthTrendCall = mockHealthTrendChart.mock.calls.at(0)?.[0]
        expect(firstHealthTrendCall).not.toBeUndefined()
        expect(firstHealthTrendCall?.points.length).toBeGreaterThan(0)

        const firstOverviewCall = mockProjectOverviewPanel.mock.calls.at(0)?.[0]
        expect(firstOverviewCall).not.toBeUndefined()
        expect(firstOverviewCall?.repositoryId).toBe("platform-team/api-gateway")
        expect(firstOverviewCall?.repositoryLabel).toBe("platform-team/api-gateway")
        expect(firstOverviewCall?.files.length).toBeGreaterThan(0)

        const firstExploreCall = mockExploreModeSidebar.mock.calls.at(0)?.[0]
        expect(firstExploreCall).not.toBeUndefined()
        expect(firstExploreCall?.paths.length).toBeGreaterThan(0)

        const firstHotAreaCall = mockHotAreaHighlights.mock.calls.at(0)?.[0]
        expect(firstHotAreaCall).not.toBeUndefined()
        expect(firstHotAreaCall?.highlights.length).toBeGreaterThan(0)

        const firstOnboardingCall = mockOnboardingProgressTracker.mock.calls.at(0)?.[0]
        expect(firstOnboardingCall).not.toBeUndefined()
        expect(firstOnboardingCall?.modules.length).toBeGreaterThan(0)
        const initialCompletedModules = firstOnboardingCall?.modules.filter(
            (module: { readonly isComplete: boolean }): boolean => module.isComplete,
        ).length
        expect(initialCompletedModules).toBe(1)

        const firstRootCauseCall = mockRootCauseChainViewer.mock.calls.at(0)?.[0]
        expect(firstRootCauseCall).not.toBeUndefined()
        expect(firstRootCauseCall?.issues.length).toBe(0)

        const firstTourCustomizerCall = mockTourCustomizer.mock.calls.at(0)?.[0]
        expect(firstTourCustomizerCall).not.toBeUndefined()
        expect(firstTourCustomizerCall?.isAdmin).toBe(true)
        expect(firstTourCustomizerCall?.steps.length).toBe(3)

        const firstRefactoringCall = mockRefactoringDashboard.mock.calls.at(0)?.[0]
        expect(firstRefactoringCall).not.toBeUndefined()
        expect(firstRefactoringCall?.targets.length).toBeGreaterThan(0)

        const firstRoiCalculatorCall = mockROICalculatorWidget.mock.calls.at(0)?.[0]
        expect(firstRoiCalculatorCall).not.toBeUndefined()
        expect(firstRoiCalculatorCall?.targets.length).toBeGreaterThan(0)

        const firstOverlayCall = mockCityRefactoringOverlay.mock.calls.at(0)?.[0]
        expect(firstOverlayCall).not.toBeUndefined()
        expect(firstOverlayCall?.entries.length).toBeGreaterThan(0)

        const firstSimulationCall = mockSimulationPanel.mock.calls.at(0)?.[0]
        expect(firstSimulationCall).not.toBeUndefined()
        expect(firstSimulationCall?.targets.length).toBeGreaterThan(0)

        const firstTimelineCall = mockRefactoringTimeline.mock.calls.at(0)?.[0]
        expect(firstTimelineCall).not.toBeUndefined()
        expect(firstTimelineCall?.tasks.length).toBeGreaterThan(0)

        const firstExportCall = mockRefactoringExportDialog.mock.calls.at(0)?.[0]
        expect(firstExportCall).not.toBeUndefined()
        expect(firstExportCall?.targets.length).toBeGreaterThan(0)

        const firstImpactCall = mockImpactAnalysisPanel.mock.calls.at(0)?.[0]
        expect(firstImpactCall).not.toBeUndefined()
        expect(firstImpactCall?.seeds.length).toBeGreaterThan(0)

        const firstCityImpactCall = mockCityImpactOverlay.mock.calls.at(0)?.[0]
        expect(firstCityImpactCall).not.toBeUndefined()
        expect(firstCityImpactCall?.entries.length).toBeGreaterThan(0)

        const firstBusFactorCall = mockCityBusFactorOverlay.mock.calls.at(0)?.[0]
        expect(firstBusFactorCall).not.toBeUndefined()
        expect(firstBusFactorCall?.entries.length).toBeGreaterThan(0)

        const firstKnowledgeSiloCall = mockKnowledgeSiloPanel.mock.calls.at(0)?.[0]
        expect(firstKnowledgeSiloCall).not.toBeUndefined()
        expect(firstKnowledgeSiloCall?.entries.length).toBeGreaterThan(0)

        const firstOwnershipCall = mockCityOwnershipOverlay.mock.calls.at(0)?.[0]
        expect(firstOwnershipCall).not.toBeUndefined()
        expect(firstOwnershipCall?.owners.length).toBeGreaterThan(0)
        expect(firstOwnershipCall?.isEnabled).toBe(true)

        const firstRiskGaugeCall = mockChangeRiskGauge.mock.calls.at(0)?.[0]
        expect(firstRiskGaugeCall).not.toBeUndefined()
        expect(firstRiskGaugeCall?.historicalPoints.length).toBeGreaterThan(0)

        const firstImpactGraphCall = mockImpactGraphView.mock.calls.at(0)?.[0]
        expect(firstImpactGraphCall).not.toBeUndefined()
        expect(firstImpactGraphCall?.nodes.length).toBeGreaterThan(0)
        expect(firstImpactGraphCall?.edges.length).toBeGreaterThan(0)

        const firstWhatIfCall = mockWhatIfPanel.mock.calls.at(0)?.[0]
        expect(firstWhatIfCall).not.toBeUndefined()
        expect(firstWhatIfCall?.options.length).toBeGreaterThan(0)
    })

    it("обновляет treemap при смене репозитория и метрики", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<CodeCityDashboardPage />)

        await user.click(screen.getByRole("button", { name: "apply custom tour" }))
        expect(screen.getByText("Step 1 of 4")).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Next tour step" }))
        expect(screen.getByText("Step 2 of 4")).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Skip guided tour" }))
        expect(screen.queryByText("Guided tour")).toBeNull()
        await user.click(screen.getByRole("button", { name: "trigger explore navigate" }))

        const exploreNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(exploreNavigation3DCall).not.toBeUndefined()
        expect(exploreNavigation3DCall?.navigationChainFileIds.length).toBeGreaterThan(0)
        expect(exploreNavigation3DCall?.navigationActiveFileId).toBe(
            "src/pages/ccr-management.page.tsx",
        )
        expect(exploreNavigation3DCall?.navigationLabel).toBe("Mock backend path")
        await user.click(screen.getByRole("button", { name: "trigger hot area focus" }))

        const hotAreaNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(hotAreaNavigation3DCall).not.toBeUndefined()
        expect(hotAreaNavigation3DCall?.navigationActiveFileId).toBe(
            "src/pages/ccr-management.page.tsx",
        )
        expect(hotAreaNavigation3DCall?.navigationLabel).toContain("Hot area:")

        await user.click(screen.getByRole("button", { name: "inspect refactor target" }))
        const refactorNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(refactorNavigation3DCall).not.toBeUndefined()
        expect(refactorNavigation3DCall?.navigationLabel).toContain("Refactor target:")

        await user.click(screen.getByRole("button", { name: "apply roi scenario" }))
        const roiNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(roiNavigation3DCall).not.toBeUndefined()
        expect(roiNavigation3DCall?.navigationLabel).toBe("ROI scenario")
        expect(roiNavigation3DCall?.navigationChainFileIds.length).toBeGreaterThan(1)

        await user.click(screen.getByRole("button", { name: "inspect refactor overlay" }))
        const overlayNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(overlayNavigation3DCall).not.toBeUndefined()
        expect(overlayNavigation3DCall?.navigationLabel).toContain("Refactor overlay:")

        await user.click(screen.getByRole("button", { name: "preview refactor simulation" }))
        const simulationNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(simulationNavigation3DCall).not.toBeUndefined()
        expect(simulationNavigation3DCall?.navigationLabel).toBe("Simulation after refactoring")
        expect(simulationNavigation3DCall?.navigationChainFileIds.length).toBeGreaterThan(1)

        await user.click(screen.getByRole("button", { name: "inspect timeline task" }))
        const timelineNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(timelineNavigation3DCall).not.toBeUndefined()
        expect(timelineNavigation3DCall?.navigationLabel).toContain("Refactoring timeline:")

        await user.click(screen.getByRole("button", { name: "export refactor plan" }))
        const exportNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(exportNavigation3DCall).not.toBeUndefined()
        expect(exportNavigation3DCall?.navigationLabel).toBe("Export plan: jira")
        expect(exportNavigation3DCall?.navigationChainFileIds.length).toBeGreaterThan(1)

        await user.click(screen.getByRole("button", { name: "apply impact analysis" }))
        const impactNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(impactNavigation3DCall).not.toBeUndefined()
        expect(impactNavigation3DCall?.navigationLabel).toContain("Impact analysis:")

        await user.click(screen.getByRole("button", { name: "inspect city impact overlay" }))
        const cityImpactNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(cityImpactNavigation3DCall).not.toBeUndefined()
        expect(cityImpactNavigation3DCall?.navigationLabel).toContain("Impact overlay:")

        await user.click(screen.getByRole("button", { name: "inspect change risk point" }))
        const riskNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(riskNavigation3DCall).not.toBeUndefined()
        expect(riskNavigation3DCall?.navigationLabel).toContain("Risk gauge:")

        await user.click(screen.getByRole("button", { name: "inspect impact graph node" }))
        const graphNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(graphNavigation3DCall).not.toBeUndefined()
        expect(graphNavigation3DCall?.navigationLabel).toContain("Impact graph:")

        await user.click(screen.getByRole("button", { name: "run what-if scenario" }))
        const whatIfNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(whatIfNavigation3DCall).not.toBeUndefined()
        expect(whatIfNavigation3DCall?.navigationLabel).toContain("What-if:")
        expect(whatIfNavigation3DCall?.navigationChainFileIds.length).toBeGreaterThan(1)

        await user.click(screen.getByRole("button", { name: "inspect bus factor district" }))
        const busFactorTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(busFactorTreemapCall).not.toBeUndefined()
        expect(busFactorTreemapCall?.highlightedFileId).toBe("src/api/auth.ts")
        expect(Object.keys(busFactorTreemapCall?.packageColorByName ?? {})).not.toHaveLength(0)
        const busFactor3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(busFactor3DCall).not.toBeUndefined()
        expect(busFactor3DCall?.navigationLabel).toContain("Bus factor:")

        await user.click(screen.getByRole("button", { name: "inspect knowledge silo" }))
        const knowledgeSiloTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(knowledgeSiloTreemapCall).not.toBeUndefined()
        expect(knowledgeSiloTreemapCall?.highlightedFileId).toBe("src/api/auth.ts")
        const knowledgeSilo3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(knowledgeSilo3DCall).not.toBeUndefined()
        expect(knowledgeSilo3DCall?.navigationLabel).toContain("Knowledge silo:")

        await user.click(screen.getByRole("button", { name: "toggle ownership colors" }))
        const ownershipDisabledTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(ownershipDisabledTreemapCall).not.toBeUndefined()
        expect(Object.keys(ownershipDisabledTreemapCall?.fileColorById ?? {})).toHaveLength(0)
        const ownershipDisabledOverlayCall = mockCityOwnershipOverlay.mock.calls.at(-1)?.[0]
        expect(ownershipDisabledOverlayCall).not.toBeUndefined()
        expect(ownershipDisabledOverlayCall?.isEnabled).toBe(false)

        await user.click(screen.getByRole("button", { name: "focus ownership owner" }))
        const ownershipFocusedTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(ownershipFocusedTreemapCall).not.toBeUndefined()
        expect(ownershipFocusedTreemapCall?.highlightedFileId).toBe("src/api/auth.ts")
        expect(Object.keys(ownershipFocusedTreemapCall?.fileColorById ?? {})).not.toHaveLength(0)
        const ownershipFocused3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(ownershipFocused3DCall).not.toBeUndefined()
        expect(ownershipFocused3DCall?.navigationLabel).toContain("Ownership:")

        const repositorySelect = screen.getByRole("combobox", { name: "Repository" })
        const metricSelect = screen.getByRole("combobox", { name: "Metric" })

        await user.selectOptions(repositorySelect, "frontend-team/ui-dashboard")
        await user.selectOptions(metricSelect, "coverage")

        const currentTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(currentTreemapCall).not.toBeUndefined()
        expect(currentTreemapCall?.title).toBe("frontend-team/ui-dashboard treemap")
        expect(currentTreemapCall?.defaultMetric).toBe("coverage")
        expect(currentTreemapCall?.compareFiles.length).toBeGreaterThan(0)
        expect(currentTreemapCall?.temporalCouplings.length).toBe(0)
        expect(currentTreemapCall?.impactedFiles.length).toBeGreaterThan(0)
        const currentTreemapFile = currentTreemapCall?.files.at(0) as
            | {
                readonly bugIntroductions?: Readonly<Record<string, number>>
            }
            | undefined
        expect(currentTreemapFile?.bugIntroductions?.["30d"]).toBeGreaterThan(0)

        const current3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(current3DCall).not.toBeUndefined()
        expect(current3DCall?.title).toBe("frontend-team/ui-dashboard 3D scene")
        expect(current3DCall?.impactedFiles.length).toBeGreaterThan(0)
        expect(current3DCall?.causalCouplings.length).toBe(0)
        expect(current3DCall?.navigationChainFileIds.length).toBe(0)

        const currentOverviewCall = mockProjectOverviewPanel.mock.calls.at(-1)?.[0]
        expect(currentOverviewCall).not.toBeUndefined()
        expect(currentOverviewCall?.repositoryId).toBe("frontend-team/ui-dashboard")
        expect(currentOverviewCall?.repositoryLabel).toBe("frontend-team/ui-dashboard")

        const overlaySelect = screen.getByRole("combobox", { name: "Causal overlay" })
        await user.selectOptions(overlaySelect, "root-cause")

        const rootCauseOverlayCall = mockRootCauseChainViewer.mock.calls.at(-1)?.[0]
        expect(rootCauseOverlayCall).not.toBeUndefined()
        expect(rootCauseOverlayCall?.issues.length).toBeGreaterThan(0)

        const rootCauseTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(rootCauseTreemapCall).not.toBeUndefined()
        expect(rootCauseTreemapCall?.impactedFiles.length).toBe(0)
        expect(rootCauseTreemapCall?.temporalCouplings.length).toBe(0)
        const rootCause3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(rootCause3DCall).not.toBeUndefined()
        expect(rootCause3DCall?.causalCouplings.length).toBe(0)
        expect(rootCause3DCall?.navigationChainFileIds.length).toBe(0)

        await user.click(screen.getByRole("button", { name: "trigger root cause focus" }))

        const chainNavigation3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(chainNavigation3DCall).not.toBeUndefined()
        expect(chainNavigation3DCall?.navigationChainFileIds.length).toBeGreaterThan(0)
        expect(chainNavigation3DCall?.navigationActiveFileId).toBe(
            "src/components/graphs/codecity-treemap.tsx",
        )
        expect(chainNavigation3DCall?.navigationLabel).toBe("Mock issue chain")

        await user.selectOptions(overlaySelect, "temporal-coupling")

        const temporalOverlayCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(temporalOverlayCall).not.toBeUndefined()
        expect(temporalOverlayCall?.impactedFiles.length).toBe(0)
        expect(temporalOverlayCall?.temporalCouplings.length).toBeGreaterThan(0)
        const temporal3DCall = mockCodeCity3DScene.mock.calls.at(-1)?.[0]
        expect(temporal3DCall).not.toBeUndefined()
        expect(temporal3DCall?.impactedFiles.length).toBe(0)
        expect(temporal3DCall?.causalCouplings.length).toBeGreaterThan(0)

        const temporalRootCauseCall = mockRootCauseChainViewer.mock.calls.at(-1)?.[0]
        expect(temporalRootCauseCall).not.toBeUndefined()
        expect(temporalRootCauseCall?.issues.length).toBe(0)

        await user.click(screen.getByRole("button", { name: "select scatter file" }))

        const highlightedTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(highlightedTreemapCall).not.toBeUndefined()
        expect(highlightedTreemapCall?.highlightedFileId).toBe(
            "src/pages/ccr-management.page.tsx",
        )

        const progressedOnboardingCall = mockOnboardingProgressTracker.mock.calls.at(-1)?.[0]
        expect(progressedOnboardingCall).not.toBeUndefined()
        const completedModulesAfterFlow = progressedOnboardingCall?.modules.filter(
            (module: { readonly isComplete: boolean }): boolean => module.isComplete,
        ).length
        expect(completedModulesAfterFlow).toBeGreaterThanOrEqual(3)
    })
})
