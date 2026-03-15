import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    DashboardContent,
    type IDashboardContentProps,
    type IWorkQueueItem,
} from "@/components/dashboard/dashboard-content"
import type { IActivityTimelineEntry } from "@/components/dashboard/activity-timeline"
import type { IStatusDistributionPoint } from "@/components/dashboard/status-distribution-chart"
import { renderWithProviders } from "../../utils/render"

vi.mock("@/lib/motion", () => ({
    DURATION: { normal: 0 },
    EASING: { move: [0, 0, 1, 1] },
    STAGGER_DELAY: 0,
    STAGGER_ITEM_VARIANTS: {},
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

vi.mock("react-countup", () => ({
    default: ({ end }: { readonly end: number }): React.ReactElement => (
        <span>{String(end)}</span>
    ),
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

const TIMELINE: ReadonlyArray<IActivityTimelineEntry> = [
    {
        description: "Repository core scan finished.",
        details: "3 files updated.",
        group: "Today",
        id: "today-1",
        time: "16:10",
        title: "Scan finished",
    },
]

const STATUS_DIST: ReadonlyArray<IStatusDistributionPoint> = [
    { status: "merged", count: 12, color: "#22c55e" },
    { status: "open", count: 5, color: "#3b82f6" },
]

function createWorkQueue(
    items: ReadonlyArray<Partial<IWorkQueueItem>> = [],
): ReadonlyArray<IWorkQueueItem> {
    return items.map((item, i) => ({
        id: item.id ?? `item-${String(i)}`,
        title: item.title ?? `Task ${String(i)}`,
        route: (item.route ?? "/") as IWorkQueueItem["route"],
        description: item.description ?? `Description ${String(i)}`,
    }))
}

function createProps(overrides: Partial<IDashboardContentProps> = {}): IDashboardContentProps {
    return {
        workQueue:
            overrides.workQueue ??
            createWorkQueue([{ id: "ccr-1", title: "Review #1", description: "Pending review" }]),
        timeline: overrides.timeline ?? TIMELINE,
        statusDistribution: overrides.statusDistribution ?? STATUS_DIST,
    }
}

describe("DashboardContent", (): void => {
    it("when rendered with work queue items, then displays item titles", (): void => {
        const props = createProps()
        renderWithProviders(<DashboardContent {...props} />)

        expect(screen.queryByText("Review #1")).not.toBeNull()
        expect(screen.queryByText("Pending review")).not.toBeNull()
    })

    it("when work queue is empty, then shows empty state", (): void => {
        const props = createProps({ workQueue: [] })
        renderWithProviders(<DashboardContent {...props} />)

        expect(screen.queryByText("Queue is empty")).not.toBeNull()
        expect(screen.queryByText("No items in the work queue right now.")).not.toBeNull()
    })

    it("when work queue has critical item, then shows ops notice alert", (): void => {
        const props = createProps({
            workQueue: createWorkQueue([
                { id: "critical-provider", title: "Provider down", description: "Check provider" },
            ]),
        })
        renderWithProviders(<DashboardContent {...props} />)

        expect(screen.queryByText("Ops notice")).not.toBeNull()
    })

    it("when work queue has no critical items, then does not show ops notice", (): void => {
        const props = createProps({
            workQueue: createWorkQueue([
                { id: "ccr-123", title: "Normal item", description: "Routine" },
            ]),
        })
        renderWithProviders(<DashboardContent {...props} />)

        expect(screen.queryByText("Ops notice")).toBeNull()
    })

    it("when rendered, then shows signals and work queue heading", (): void => {
        const props = createProps()
        renderWithProviders(<DashboardContent {...props} />)

        expect(screen.queryByText("Signals & Work Queue")).not.toBeNull()
    })
})
