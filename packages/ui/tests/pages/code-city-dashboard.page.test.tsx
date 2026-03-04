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

        const firstRootCauseCall = mockRootCauseChainViewer.mock.calls.at(0)?.[0]
        expect(firstRootCauseCall).not.toBeUndefined()
        expect(firstRootCauseCall?.issues.length).toBe(0)
    })

    it("обновляет treemap при смене репозитория и метрики", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<CodeCityDashboardPage />)

        await user.click(screen.getByRole("button", { name: "Next tour step" }))
        expect(screen.getByText("Step 2 of 3")).not.toBeNull()
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
    })
})
