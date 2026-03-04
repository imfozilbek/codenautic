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
            readonly impactedFiles: ReadonlyArray<unknown>
            readonly title: string
            readonly key?: string
        }): React.JSX.Element => {
            return (
                <div>
                    <p>{props.title}</p>
                    <p>{props.defaultMetric}</p>
                    <p>comparison-label:{props.comparisonLabel}</p>
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

vi.mock("@/components/graphs/codecity-treemap", () => ({
    CodeCityTreemap: mockCodeCityTreemap,
}))
vi.mock("@/components/graphs/package-dependency-graph", () => ({
    PackageDependencyGraph: mockPackageDependencyGraph,
}))

beforeEach((): void => {
    mockCodeCityTreemap.mockClear()
    mockPackageDependencyGraph.mockClear()
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

        const firstTreemapCall = mockCodeCityTreemap.mock.calls.at(0)?.[0]
        expect(firstTreemapCall).not.toBeUndefined()
        expect(firstTreemapCall?.defaultMetric).toBe("complexity")
        expect(firstTreemapCall?.title).toBe("platform-team/api-gateway treemap")

        const firstGraphCall = mockPackageDependencyGraph.mock.calls.at(0)?.[0]
        expect(firstGraphCall).not.toBeUndefined()
        expect(firstGraphCall?.title).toBe("Cross-repository package dependencies")
        expect(firstGraphCall?.nodes.length).toBe(3)
        expect(firstGraphCall?.relations.length).toBe(4)
    })

    it("обновляет treemap при смене репозитория и метрики", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<CodeCityDashboardPage />)

        const repositorySelect = screen.getByRole("combobox", { name: "Repository" })
        const metricSelect = screen.getByRole("combobox", { name: "Metric" })

        await user.selectOptions(repositorySelect, "frontend-team/ui-dashboard")
        await user.selectOptions(metricSelect, "coverage")

        const currentTreemapCall = mockCodeCityTreemap.mock.calls.at(-1)?.[0]
        expect(currentTreemapCall).not.toBeUndefined()
        expect(currentTreemapCall?.title).toBe("frontend-team/ui-dashboard treemap")
        expect(currentTreemapCall?.defaultMetric).toBe("coverage")
        expect(currentTreemapCall?.compareFiles.length).toBeGreaterThan(0)
    })
})
