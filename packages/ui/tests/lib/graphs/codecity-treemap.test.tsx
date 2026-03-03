import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    CodeCityTreemap,
    buildCodeCityTreemapData,
    type ICodeCityTreemapFileDescriptor,
    type ICodeCityTreemapImpactedFileDescriptor,
} from "@/components/graphs/codecity-treemap"

interface ICodeCityTreemapNodeData {
    readonly children?: ReadonlyArray<{
        readonly color?: string
        readonly id?: string
        readonly impactType?: string
        readonly issueCount?: number
        readonly issueHeatmapColor?: string
    }>
    readonly name?: string
}

const mockTreemap = vi.fn((props: { readonly data: ReadonlyArray<ICodeCityTreemapNodeData> }): JSX.Element => {
    return (
        <div>
            <span data-testid="treemap-packages">{props.data.length}</span>
        </div>
    )
})

const mockResponsiveContainer = vi.fn(
    ({ children }: { readonly children: JSX.Element | null }): JSX.Element => {
        return <div>{children}</div>
    },
)

vi.mock("recharts", () => ({
    ResponsiveContainer: mockResponsiveContainer,
    Treemap: mockTreemap,
}))

describe("codecity treemap graph", (): void => {
    const sampleFiles: ReadonlyArray<ICodeCityTreemapFileDescriptor> = [
        { id: "src/api/auth.ts", issueCount: 2, loc: 80, path: "src/api/auth.ts" },
        {
            id: "src/api/session.ts",
            issueCount: 0,
            complexity: 30,
            path: "src/api/session.ts",
        },
        { id: "src/ui/index.ts", issueCount: 1, size: 40, path: "src/ui/index.ts" },
    ]
    const sampleImpactedFiles: ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor> = [
        { fileId: "src/api/auth.ts", impactType: "changed" },
        { fileId: "src/ui/index.ts", impactType: "ripple" },
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
        expect(graph.packages[0]?.children[0]?.issueCount).toBe(2)
        expect(graph.packages[0]?.children[0]?.issueHeatmapColor).toBeDefined()
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
        expect(colorByComplexity.packages[0]?.children[0]?.metricValue).toBe(30)
        expect(colorByCoverage.packages[0]?.children[0]?.metricValue).toBe(95)
        expect(colorByComplexity.packages[0]?.children[0]?.color).not.toBe(
            colorByCoverage.packages[0]?.children[0]?.color,
        )
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
        expect(screen.getByTestId("treemap-packages")).not.toBeNull()
        expect(screen.getByText("Color metric: Complexity")).not.toBeNull()
        expect(screen.getByText("Low")).not.toBeNull()
        expect(screen.getByText("High")).not.toBeNull()
        expect(screen.getByLabelText("Issue heatmap legend")).not.toBeNull()
        expect(screen.getByText("Issues: 3 in 2 files")).not.toBeNull()
        expect(screen.getByText("Max issues: 2")).not.toBeNull()
        expect(mockTreemap).toHaveBeenCalledTimes(1)
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

    it("показывает пустое состояние для пустого набора файлов", (): void => {
        mockTreemap.mockClear()

        render(<CodeCityTreemap title="Empty treemap" files={[]} />)

        expect(screen.getByText("Empty treemap")).not.toBeNull()
        expect(screen.getByText("No file data for CodeCity treemap yet.")).not.toBeNull()
        expect(screen.queryByTestId("treemap-packages")).toBeNull()
        expect(mockTreemap).toHaveBeenCalledTimes(0)
    })
})
