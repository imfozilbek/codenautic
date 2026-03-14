import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    DashboardCriticalSignals,
    type IDashboardCriticalSignalsProps,
} from "@/components/dashboard/dashboard-critical-signals"
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
    AnimatedAlert: ({
        children,
        isVisible,
    }: {
        readonly children: React.ReactNode
        readonly isVisible: boolean
    }): React.ReactElement | null => (isVisible ? <div>{children}</div> : null),
    AnimatedMount: ({ children }: { readonly children: React.ReactNode }): React.ReactElement => (
        <div>{children}</div>
    ),
    CHART_DATA_TRANSITION: {},
    CHART_DATA_TRANSITION_NONE: {},
    FADE_VARIANTS: {},
    PAGE_TRANSITION_VARIANTS: {},
    SCALE_FADE_VARIANTS: {},
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

function createProps(
    overrides: Partial<IDashboardCriticalSignalsProps> = {},
): IDashboardCriticalSignalsProps {
    return {
        isDegraded: overrides.isDegraded ?? false,
        isRefreshing: overrides.isRefreshing ?? false,
        lastUpdatedAt: overrides.lastUpdatedAt ?? new Date().toISOString(),
        provenance: overrides.provenance ?? {
            source: "pipeline",
            jobId: "job-1",
            repository: "platform/core",
            branch: "main",
            commit: "abc123",
            dataWindow: "last 30 days",
            isPartial: false,
            hasFailures: false,
            diagnosticsHref: "/diagnostics/job-1",
        },
        freshnessActionMessage: overrides.freshnessActionMessage ?? "",
        onRefresh: overrides.onRefresh ?? vi.fn(),
        onRescan: overrides.onRescan ?? vi.fn(),
        confidence: overrides.confidence ?? "87%",
        dataWindow: overrides.dataWindow ?? "last 90 days",
        factors: overrides.factors ?? [
            { impact: "high" as const, label: "Complexity", value: "avg 14.2" },
        ],
        limitations: overrides.limitations ?? ["Data limited to last 90 days"],
        signalValue: overrides.signalValue ?? "78",
    }
}

describe("DashboardCriticalSignals", (): void => {
    it("when isDegraded is true, then shows ops notice warning", (): void => {
        const props = createProps({ isDegraded: true })
        renderWithProviders(<DashboardCriticalSignals {...props} />)

        expect(screen.queryByText("Ops notice")).not.toBeNull()
        expect(screen.queryByText(/Provider health degraded/)).not.toBeNull()
    })

    it("when isDegraded is false, then does not show ops notice", (): void => {
        const props = createProps({ isDegraded: false })
        renderWithProviders(<DashboardCriticalSignals {...props} />)

        expect(screen.queryByText("Ops notice")).toBeNull()
    })

    it("when freshnessActionMessage is provided, then shows freshness action alert", (): void => {
        const props = createProps({
            freshnessActionMessage: "Data refresh completed successfully.",
        })
        renderWithProviders(<DashboardCriticalSignals {...props} />)

        expect(screen.queryByText("Data refresh completed successfully.")).not.toBeNull()
    })

    it("when freshnessActionMessage is empty, then does not show freshness alert", (): void => {
        const props = createProps({ freshnessActionMessage: "" })
        renderWithProviders(<DashboardCriticalSignals {...props} />)

        expect(screen.queryByText("Freshness action")).toBeNull()
    })

    it("when rendered, then shows explainability panel with confidence", (): void => {
        const props = createProps()
        renderWithProviders(<DashboardCriticalSignals {...props} />)

        expect(screen.queryByText("Explainability for release risk")).not.toBeNull()
    })

    it("when rendered, then shows data freshness panel", (): void => {
        const props = createProps()
        renderWithProviders(<DashboardCriticalSignals {...props} />)

        expect(screen.queryByText("Dashboard data freshness")).not.toBeNull()
    })
})
