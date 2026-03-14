import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    MetricsGrid,
    type IMetricsGridProps,
    type IMetricGridMetric,
} from "@/components/dashboard/metrics-grid"
import { renderWithProviders } from "../../utils/render"

vi.mock("@/lib/motion", () => ({
    DURATION: { normal: 0 },
    EASING: { move: [0, 0, 1, 1] },
    STAGGER_DELAY: 0,
    STAGGER_ITEM_VARIANTS: {},
    StaggerContainer: ({
        children,
        ariaLabel,
        className,
    }: {
        readonly children: React.ReactNode
        readonly ariaLabel?: string
        readonly className?: string
        readonly as?: React.ElementType
    }): React.ReactElement => (
        <div aria-label={ariaLabel} className={className}>
            {children}
        </div>
    ),
    useReducedMotion: (): boolean => true,
    useCountUp: ({ target }: { readonly target: number }): number => target,
    CHART_DATA_TRANSITION: {},
    CHART_DATA_TRANSITION_NONE: {},
}))

vi.mock("motion/react", () => ({
    motion: new Proxy(
        {},
        {
            get: (_target: object, _prop: string): unknown => {
                return ({
                    children,
                    ...rest
                }: {
                    readonly children?: React.ReactNode
                    readonly [key: string]: unknown
                }): React.ReactElement => {
                    return <div {...rest}>{children}</div>
                }
            },
        },
    ),
    AnimatePresence: ({ children }: { readonly children: React.ReactNode }): React.ReactNode =>
        children,
}))

function createMetrics(count: number): ReadonlyArray<IMetricGridMetric> {
    return Array.from({ length: count }, (_, i) => ({
        id: `metric-${String(i)}`,
        label: `Metric ${String(i)}`,
        value: String((i + 1) * 100),
    }))
}

function createProps(overrides: Partial<IMetricsGridProps> = {}): IMetricsGridProps {
    return {
        metrics: overrides.metrics ?? createMetrics(4),
    }
}

describe("MetricsGrid", (): void => {
    it("when rendered with metrics, then displays all metric labels", (): void => {
        const props = createProps()
        renderWithProviders(<MetricsGrid {...props} />)

        expect(screen.queryByText("Metric 0")).not.toBeNull()
        expect(screen.queryByText("Metric 1")).not.toBeNull()
        expect(screen.queryByText("Metric 2")).not.toBeNull()
        expect(screen.queryByText("Metric 3")).not.toBeNull()
    })

    it("when rendered, then has KPI metrics aria label", (): void => {
        const props = createProps()
        renderWithProviders(<MetricsGrid {...props} />)

        expect(screen.queryByLabelText("KPI metrics")).not.toBeNull()
    })

    it("when rendered with one metric, then shows single card", (): void => {
        const props = createProps({ metrics: createMetrics(1) })
        renderWithProviders(<MetricsGrid {...props} />)

        expect(screen.queryByText("Metric 0")).not.toBeNull()
        expect(screen.queryByText("Metric 1")).toBeNull()
    })

    it("when rendered with empty metrics array, then section exists but no cards", (): void => {
        const props = createProps({ metrics: [] })
        renderWithProviders(<MetricsGrid {...props} />)

        expect(screen.queryByLabelText("KPI metrics")).not.toBeNull()
        expect(screen.queryByText(/Metric/)).toBeNull()
    })
})
