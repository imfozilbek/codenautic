import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    CodeCityTreemap,
    buildCodeCityTreemapData,
    type ICodeCityTreemapFileDescriptor,
    type ICodeCityTreemapImpactedFileDescriptor,
    type ICodeCityTreemapTemporalCouplingDescriptor,
} from "@/components/graphs/codecity-treemap"

interface ICodeCityTreemapNodeData {
    readonly color?: string
    readonly children?: ReadonlyArray<{
        readonly color?: string
        readonly id?: string
        readonly issueCount?: number
        readonly impactType?: string
        readonly coverage?: number
        readonly complexity?: number
        readonly lastReviewAt?: string
        readonly name?: string
        readonly path?: string
        readonly value?: number
        readonly issueHeatmapColor?: string
    }>
    readonly name?: string
}

interface ICodeCityTreemapContentPayload {
    readonly children?: ReadonlyArray<{
        readonly color?: string
        readonly id?: string
        readonly complexity?: number
        readonly coverage?: number
        readonly comparisonDelta?: number
        readonly issueCount?: number
        readonly lastReviewAt?: string
        readonly name?: string
        readonly path?: string
        readonly value?: number
    }>
    readonly fill?: string
    readonly height: number
    readonly payload?: {
        readonly name?: string
        readonly children?: ReadonlyArray<unknown>
        readonly value?: number
        readonly comparisonDelta?: number
        readonly issueCount?: number
        readonly issueHeatmapColor?: string
        readonly color?: string
        readonly complexity?: number
        readonly coverage?: number
        readonly lastReviewAt?: string
        readonly path?: string
        readonly id?: string
    }
    readonly width: number
    readonly x: number
    readonly y: number
}

const { mockResponsiveContainer, mockTreemap } = vi.hoisted(() => ({
    mockTreemap: vi.fn(
        (props: {
            readonly content?: (contentProps: ICodeCityTreemapContentPayload) => React.JSX.Element
            readonly data: ReadonlyArray<ICodeCityTreemapNodeData>
            readonly onClick?: (
                node?: Readonly<{
                    readonly children?: ReadonlyArray<unknown>
                    readonly color?: string
                    readonly name?: string
                    readonly issueCount?: number
                    readonly issueHeatmapColor?: string
                }>,
            ) => void
        }): React.JSX.Element => {
            const renderNode = (
                node: ICodeCityTreemapNodeData,
                key: string,
            ): ReadonlyArray<React.JSX.Element> => {
                const children = node.children ?? []
                const content = props.content?.({
                    children,
                    fill: node.color,
                    height: 60,
                    payload: node,
                    width: 120,
                    x: 0,
                    y: 0,
                })
                const nestedNodes = children.flatMap(
                    (child, childIndex): ReadonlyArray<React.JSX.Element> => {
                        return renderNode(
                            child as ICodeCityTreemapNodeData,
                            `${key}-child-${String(childIndex)}`,
                        )
                    },
                )

                return content === undefined
                    ? nestedNodes
                    : [
                          <span key={key}>
                              {content}
                          </span>,
                          ...nestedNodes,
                      ]
            }

            const renderedNodes = props.data.flatMap(
                (item, index): ReadonlyArray<React.JSX.Element> => {
                    return renderNode(item, `package-${String(index)}`)
                },
            )
            return (
                <div>
                    <span data-testid="treemap-packages">{props.data.length}</span>
                    {renderedNodes}
                </div>
            )
        },
    ),
    mockResponsiveContainer: vi.fn(
        ({ children }: { readonly children: React.JSX.Element | null }): React.JSX.Element => {
            return <div>{children}</div>
        },
    ),
}))

vi.mock("recharts", () => ({
    ResponsiveContainer: mockResponsiveContainer,
    Treemap: mockTreemap,
}))

describe("codecity treemap graph", (): void => {
    const sampleFiles: ReadonlyArray<ICodeCityTreemapFileDescriptor> = [
        {
            id: "src/api/auth.ts",
            issueCount: 2,
            bugIntroductions: { "7d": 1, "30d": 2, "90d": 4 },
            complexity: 45,
            coverage: 88,
            lastReviewAt: "2026-02-01T10:00:00.000Z",
            loc: 80,
            path: "src/api/auth.ts",
        },
        {
            id: "src/api/session.ts",
            issueCount: 0,
            bugIntroductions: { "7d": 0, "30d": 1, "90d": 3 },
            complexity: 30,
            coverage: 76,
            path: "src/api/session.ts",
        },
        {
            id: "src/ui/index.ts",
            issueCount: 1,
            bugIntroductions: { "7d": 2, "30d": 5, "90d": 7 },
            complexity: 10,
            coverage: 55,
            size: 40,
            path: "src/ui/index.ts",
        },
    ]
    const sampleComparedFiles: ReadonlyArray<ICodeCityTreemapFileDescriptor> = [
        {
            id: "src/api/auth.ts",
            loc: 80,
            path: "src/api/auth.ts",
        },
        {
            id: "src/api/session.ts",
            loc: 35,
            path: "src/api/session.ts",
        },
        {
            id: "src/legacy/removed.ts",
            loc: 45,
            path: "src/legacy/removed.ts",
        },
    ]
    const sampleImpactedFiles: ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor> = [
        { fileId: "src/api/auth.ts", impactType: "changed" },
        { fileId: "src/ui/index.ts", impactType: "ripple" },
    ]
    const sampleTemporalCouplings: ReadonlyArray<ICodeCityTreemapTemporalCouplingDescriptor> = [
        {
            sourceFileId: "src/api/auth.ts",
            targetFileId: "src/api/session.ts",
            strength: 0.83,
        },
        {
            sourceFileId: "src/api/session.ts",
            targetFileId: "src/ui/index.ts",
            strength: 0.46,
        },
    ]

    it("формирует иерархию package->files и считает LOC", (): void => {
        const graph = buildCodeCityTreemapData(sampleFiles)

        expect(graph.totalFiles).toBe(3)
        expect(graph.totalLoc).toBe(150)
        expect(graph.packages).toHaveLength(2)

        const apiPackage = graph.packages.find((entry) => entry.name === "src/api")
        expect(apiPackage).not.toBeUndefined()
        expect(apiPackage?.children).toHaveLength(2)
        expect(apiPackage?.value).toBe(110)
        expect(graph.impactSummary.changed).toBe(0)
        expect(graph.impactSummary.ripple).toBe(0)
        expect(graph.issueSummary.totalIssues).toBe(3)
        expect(graph.issueSummary.filesWithIssues).toBe(2)
        expect(graph.issueSummary.maxIssuesPerFile).toBe(2)
        expect(graph.bugHeatSummary.totalBugIntroductions).toBe(8)
        expect(graph.bugHeatSummary.filesWithBugIntroductions).toBe(3)
        expect(graph.bugHeatSummary.maxBugIntroductions).toBe(5)
        expect(graph.packages[0]?.children[0]?.issueCount).toBe(2)
        expect(graph.packages[0]?.children[0]?.issueHeatmapColor).toBeDefined()
        expect(graph.packages[0]?.children[0]?.bugHeatColor).toBeDefined()
    })

    it("формирует метрики цвета для выбранной шкалы", (): void => {
        const colorByComplexity = buildCodeCityTreemapData(sampleFiles, "complexity")
        const colorByCoverage = buildCodeCityTreemapData(
            sampleFiles.map(
                (file): ICodeCityTreemapFileDescriptor => ({
                    ...file,
                    coverage: file.id === "src/ui/index.ts" ? 10 : 95,
                }),
            ),
            "coverage",
        )

        expect(colorByComplexity.metric).toBe("complexity")
        expect(colorByCoverage.metric).toBe("coverage")
        expect(colorByComplexity.packages[0]?.children[0]?.metricValue).toBe(45)
        expect(colorByCoverage.packages[0]?.children[0]?.metricValue).toBe(95)
    })

    it("передаёт уровни CCR-импакта в treemap данные", (): void => {
        const impactData = buildCodeCityTreemapData(
            sampleFiles,
            "complexity",
            sampleImpactedFiles,
        )
        const apiPackage = impactData.packages.find((entry) => entry.name === "src/api")
        const uiPackage = impactData.packages.find((entry) => entry.name === "src/ui")

        expect(apiPackage?.children[0]?.impactType).toBe("changed")
        expect(uiPackage?.children[0]?.impactType).toBe("ripple")
        expect(impactData.impactSummary.changed).toBe(1)
        expect(impactData.impactSummary.ripple).toBe(1)
        expect(impactData.impactSummary.impacted).toBe(0)
    })
    it("формирует temporal comparison delta и сводку", (): void => {
        const comparisonData = buildCodeCityTreemapData(
            sampleFiles,
            "complexity",
            [],
            sampleComparedFiles,
        )
        const apiPackage = comparisonData.packages.find(
            (entry) => entry.name === "src/api",
        )
        const uiPackage = comparisonData.packages.find((entry) => entry.name === "src/ui")

        expect(apiPackage?.children[0]?.comparisonDelta).toBe(0)
        expect(apiPackage?.children[1]?.comparisonDelta).toBe(-5)
        expect(uiPackage?.children[0]?.comparisonDelta).toBe(40)
        expect(comparisonData.comparisonSummary.addedFiles).toBe(1)
        expect(comparisonData.comparisonSummary.changedFiles).toBe(1)
        expect(comparisonData.comparisonSummary.comparedFiles).toBe(3)
        expect(comparisonData.comparisonSummary.removedFiles).toBe(1)
        expect(comparisonData.comparisonSummary.currentLoc).toBe(150)
        expect(comparisonData.comparisonSummary.comparedLoc).toBe(160)
        expect(comparisonData.comparisonSummary.locDelta).toBe(-10)
        expect(comparisonData.comparisonSummary.hasComparisonData).toBe(true)
    })

    it("рендерит treemap и отображает summary", (): void => {
        mockTreemap.mockClear()
        mockResponsiveContainer.mockClear()

        render(
            <CodeCityTreemap
                files={sampleFiles}
                title="CodeCity treemap"
            />,
        )

        expect(screen.getByText("CodeCity treemap")).not.toBeNull()
        expect(screen.getByText("Packages: 2, Files: 3, LOC: 150")).not.toBeNull()
        expect(screen.getByText("Hover a file for quick metrics and quick link.")).not.toBeNull()
        expect(screen.getByTestId("treemap-packages")).not.toBeNull()
        expect(screen.getByText("Color metric: Complexity")).not.toBeNull()
        expect(screen.getByText("Low")).not.toBeNull()
        expect(screen.getByText("High")).not.toBeNull()
        expect(screen.getByLabelText("Issue heatmap legend")).not.toBeNull()
        expect(screen.getByText("Issues: 3 in 2 files")).not.toBeNull()
        expect(screen.getByText("Max issues: 2")).not.toBeNull()
        expect(mockTreemap).toHaveBeenCalledTimes(1)
    })

    it("показывает bug heat overlay и фильтр диапазона", (): void => {
        render(
            <CodeCityTreemap
                files={sampleFiles}
                title="CodeCity treemap"
            />,
        )

        const bugHeatLegend = screen.getByLabelText("Bug heat overlay legend")
        expect(bugHeatLegend).toHaveTextContent("Bug heat overlay (30d)")
        expect(bugHeatLegend).toHaveTextContent("Max bugs: 5")
        expect(bugHeatLegend).toHaveTextContent("Bug introductions: 8 in 3 files")

        const bugHeatRangeSelector = screen.getByLabelText("Bug heat range")
        fireEvent.change(bugHeatRangeSelector, { target: { value: "7d" } })

        expect(screen.getByLabelText("Bug heat overlay legend")).toHaveTextContent(
            "Bug heat overlay (7d)",
        )
        expect(screen.getByLabelText("Bug heat overlay legend")).toHaveTextContent(
            "Bug introductions: 3 in 2 files",
        )
    })

    it("показывает temporal coupling overlay и позволяет его выключить", (): void => {
        render(
            <CodeCityTreemap
                files={sampleFiles}
                temporalCouplings={sampleTemporalCouplings}
                title="CodeCity treemap"
            />,
        )

        expect(screen.getByLabelText("Temporal coupling controls")).not.toBeNull()
        expect(screen.getByText("Temporal couplings: 2 links")).not.toBeNull()
        expect(screen.getByLabelText("Temporal coupling overlay lines")).not.toBeNull()
        expect(screen.getAllByTestId("temporal-coupling-line")).toHaveLength(2)

        const hideOverlayButton = screen.getByRole("button", {
            name: "Hide temporal coupling overlay",
        })
        fireEvent.click(hideOverlayButton)

        expect(screen.queryByLabelText("Temporal coupling overlay lines")).toBeNull()
        expect(
            screen.getByRole("button", { name: "Show temporal coupling overlay" }),
        ).not.toBeNull()
    })

    it("подсвечивает файл на treemap после выбора из side panel", (): void => {
        render(
            <CodeCityTreemap
                files={sampleFiles}
                highlightedFileId="src/api/auth.ts"
                title="CodeCity treemap"
            />,
        )

        expect(screen.getAllByTestId("highlighted-treemap-file")).toHaveLength(1)
    })

    it("показывает comparison summary в header при переданном baseline", (): void => {
        render(
            <CodeCityTreemap
                compareFiles={sampleComparedFiles}
                files={sampleFiles}
                title="CodeCity treemap"
            />,
        )

        const comparisonSummary = screen.getByLabelText("Comparison summary")
        expect(comparisonSummary).toHaveTextContent("Compared with previous snapshot")
        expect(comparisonSummary).toHaveTextContent("LOC 150 vs 160")
        expect(comparisonSummary).toHaveTextContent("Δ-10")
        expect(comparisonSummary).toHaveTextContent("added 1")
        expect(comparisonSummary).toHaveTextContent("removed 1")
        expect(comparisonSummary).toHaveTextContent("changed 1")
    })

    it("поддерживает drill-down и возврат по пакетам", (): void => {
        mockTreemap.mockClear()

        render(
            <CodeCityTreemap
                files={sampleFiles}
                title="CodeCity treemap"
            />,
        )

        expect(screen.getByText("Packages: 2, Files: 3, LOC: 150")).not.toBeNull()
        expect(screen.getByText("All packages")).not.toBeNull()

        const packageButton = screen.getByRole("button", { name: "Open package src/api" })
        fireEvent.click(packageButton)

        expect(screen.getByText("Packages: 1, Files: 2, LOC: 110")).not.toBeNull()
        expect(screen.getByText("All packages / src/api")).not.toBeNull()
        expect(screen.getAllByRole("button", { name: "Back" })).toHaveLength(1)

        const backButton = screen.getByRole("button", { name: "Back" })
        fireEvent.click(backButton)

        expect(screen.getByText("Packages: 2, Files: 3, LOC: 150")).not.toBeNull()
    })

    it("передаёт color + impact в payload и позволяет менять метрику", (): void => {
        mockTreemap.mockClear()

        render(
            <CodeCityTreemap
                files={sampleFiles}
                impactedFiles={sampleImpactedFiles}
                title="CodeCity treemap"
            />,
        )

        expect(screen.getByTestId("treemap-packages")).not.toBeNull()
        const firstCallPackages = mockTreemap.mock.calls[0]?.[0]?.data
        expect(firstCallPackages?.[0]?.children?.[0]?.impactType).toBe("changed")
        expect(firstCallPackages?.[1]?.children?.[0]?.impactType).toBe("ripple")
        expect(screen.getByLabelText("Impact legend")).not.toBeNull()
        expect(screen.getByText("Changed")).not.toBeNull()
        expect(screen.getByText("Impacted")).not.toBeNull()
        expect(screen.getByText("Ripple")).not.toBeNull()

        const selector = screen.getByLabelText("Metric")
        fireEvent.change(selector, { target: { value: "churn" } })

        expect(screen.getByText("Color metric: Churn")).not.toBeNull()
        const secondCallPackages = mockTreemap.mock.calls[1]?.[0]?.data
        expect(secondCallPackages?.[0]?.children?.[0]?.color).not.toBe(
            firstCallPackages?.[0]?.children?.[0]?.color,
        )
    })

    it("показывает hover tooltip с метриками и quick link", (): void => {
        const fileLink = vi.fn(
            (payload: { fileId: string; fileName: string; path: string }): string => {
                return `/files/${payload.fileId}`
            },
        )

        render(
            <CodeCityTreemap
                fileLink={fileLink}
                files={sampleFiles}
                title="CodeCity treemap"
            />,
        )

        expect(screen.getByText("Hover a file for quick metrics and quick link.")).not.toBeNull()

        const fileCell = screen.getByLabelText("File auth.ts")
        fireEvent.mouseEnter(fileCell)

        const tooltip = screen.getByLabelText("Code city file tooltip")
        expect(tooltip).toHaveTextContent("File details for auth.ts")
        expect(tooltip).toHaveTextContent("File: auth.ts")
        expect(tooltip).toHaveTextContent("Path: src/api/auth.ts")
        expect(tooltip).toHaveTextContent("LOC: 80")
        expect(tooltip).toHaveTextContent("Complexity: 45")
        expect(tooltip).toHaveTextContent("Coverage: 88%")
        expect(tooltip).toHaveTextContent("Issue count: 2")
        expect(screen.getByRole("link", { name: "Open file" })).toHaveAttribute(
            "href",
            "/files/src/api/auth.ts",
        )
        expect(fileLink).toHaveBeenCalledTimes(1)

        fireEvent.mouseLeave(fileCell)
        expect(screen.getByText("Hover a file for quick metrics and quick link.")).not.toBeNull()
    })

    it("показывает LOC delta в tooltip для temporal comparison", (): void => {
        render(
            <CodeCityTreemap
                compareFiles={sampleComparedFiles}
                files={sampleFiles}
                title="CodeCity treemap"
            />,
        )

        const fileCell = screen.getByLabelText("File auth.ts")
        fireEvent.mouseEnter(fileCell)
        expect(screen.getByLabelText("Code city file tooltip")).toHaveTextContent("LOC delta: 0")
    })

    it("показывает пустое состояние для пустого набора файлов", (): void => {
        mockTreemap.mockClear()

        render(<CodeCityTreemap title="Empty treemap" files={[]} />)

        expect(screen.getByText("Empty treemap")).not.toBeNull()
        expect(screen.getByText("No file data for CodeCity treemap yet.")).not.toBeNull()
        expect(screen.queryByTestId("treemap-packages")).toBeNull()
        expect(mockTreemap).toHaveBeenCalledTimes(0)
    })
})
