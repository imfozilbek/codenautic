import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ArchitectureHealthWidget } from "@/components/dashboard/architecture-health-widget"
import { renderWithProviders } from "../../utils/render"

vi.mock("recharts", () => ({
    PolarAngleAxis: (): React.ReactElement => <div data-testid="polar-angle-axis" />,
    PolarGrid: (): React.ReactElement => <div data-testid="polar-grid" />,
    PolarRadiusAxis: (): React.ReactElement => <div data-testid="polar-radius-axis" />,
    Radar: (): React.ReactElement => <div data-testid="radar" />,
    RadarChart: ({ children }: { readonly children?: React.ReactNode }): React.ReactElement => (
        <div data-testid="radar-chart">{children}</div>
    ),
    ResponsiveContainer: ({
        children,
    }: {
        readonly children?: React.ReactNode
    }): React.ReactElement => <div data-testid="responsive-container">{children}</div>,
}))

vi.mock("@/lib/motion", () => ({
    CHART_DATA_TRANSITION: {},
    CHART_DATA_TRANSITION_NONE: {},
    DURATION: { normal: 0 },
    EASING: { move: [0, 0, 1, 1] },
    useReducedMotion: (): boolean => true,
}))

describe("ArchitectureHealthWidget", (): void => {
    it("when rendered, then shows title", (): void => {
        renderWithProviders(
            <ArchitectureHealthWidget healthScore={85} layerViolations={3} dddCompliance={92} />,
        )

        expect(screen.getByText("Architecture health")).not.toBeNull()
    })

    it("when rendered with scores, then shows health, violations and DDD chips", (): void => {
        renderWithProviders(
            <ArchitectureHealthWidget healthScore={85} layerViolations={3} dddCompliance={92} />,
        )

        expect(screen.getByText("Health 85")).not.toBeNull()
        expect(screen.getByText("Violations 3")).not.toBeNull()
        expect(screen.getByText("DDD 92%")).not.toBeNull()
    })

    it("when layerViolations exceeds 5, then violations chip container has pulse animation class", (): void => {
        renderWithProviders(
            <ArchitectureHealthWidget healthScore={50} layerViolations={10} dddCompliance={60} />,
        )

        const violationsText = screen.getByText("Violations 10")
        const chipWrapper = violationsText.parentElement
        expect(chipWrapper).not.toBeNull()
        expect(chipWrapper?.className).toContain("badge-pulse")
    })

    it("when layerViolations is 5 or less, then violations chip container does not have pulse class", (): void => {
        renderWithProviders(
            <ArchitectureHealthWidget healthScore={90} layerViolations={2} dddCompliance={95} />,
        )

        const violationsText = screen.getByText("Violations 2")
        const chipWrapper = violationsText.parentElement
        expect(chipWrapper).not.toBeNull()
        expect(chipWrapper?.className).not.toContain("badge-pulse")
    })
})
