import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MOCK_CCR_ROWS } from "@/pages/ccr-data"
import { CcrReviewDetailPage } from "@/pages/ccr-review-detail/ccr-review-detail.page"
import { renderWithProviders } from "../utils/render"

const originalEventSource = globalThis.EventSource

beforeEach((): void => {
    window.localStorage.setItem("codenautic:rbac:role", "admin")
})

afterEach((): void => {
    if (originalEventSource === undefined) {
        delete (globalThis as { EventSource?: typeof EventSource }).EventSource
    } else {
        globalThis.EventSource = originalEventSource
    }
    window.localStorage.removeItem("codenautic:rbac:role")
})

function getMockCcrRow(index: number) {
    const ccr = MOCK_CCR_ROWS[index]
    if (ccr === undefined) {
        throw new Error(`Expected MOCK_CCR_ROWS[${String(index)}] to exist`)
    }

    return ccr
}

describe("ccr review detail page", (): void => {
    it("рендерит карточку CCR и заголовок чата", (): void => {
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByText(ccr.title)).not.toBeNull()
        expect(
            screen.getByRole("heading", { name: new RegExp(`Conversation.*${ccr.id}`) }),
        ).not.toBeNull()
    })

    it("добавляет сообщение в чат по quick action", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(1)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        const explainButton = screen.getByRole("button", { name: "explain this file" })
        await user.click(explainButton)

        expect(screen.getByText(/Please explain the current diff/)).not.toBeNull()
        expect(screen.getByText("You")).not.toBeNull()
    })

    it("рендерит review context mini-map и переключает expanded режим", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(
            screen.getByRole("heading", { name: "CCR context CodeCity mini-map" }),
        ).not.toBeNull()
        expect(
            screen.getByText("Mini-map mode is active. Click expand for detailed context."),
        ).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Expand review context mini-map" }))

        expect(
            screen.getByRole("heading", { name: "CCR context CodeCity map (expanded)" }),
        ).not.toBeNull()
        expect(screen.getByText("Expanded CodeCity context map is active.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Collapse review context mini-map" }))

        expect(
            screen.getByRole("heading", { name: "CCR context CodeCity mini-map" }),
        ).not.toBeNull()
    })

    it("рендерит CCR impact city view с blast radius и neighborhood context", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByRole("heading", { name: "CCR impact CodeCity view" })).not.toBeNull()
        expect(screen.getByText("File neighborhood panel")).not.toBeNull()

        await user.click(
            screen.getByRole("checkbox", { name: "Select impact file src/auth/middleware.ts" }),
        )
        await user.click(screen.getByRole("button", { name: "Apply impact focus" }))

        expect(screen.getByText(/Focused impact:/)).not.toBeNull()
        expect(screen.getByRole("list", { name: "Active file neighborhood list" })).not.toBeNull()
    })

    it("включает review history heatmap и переключает окно активности", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByText("Review history heatmap is disabled.")).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Show review history heatmap" }))

        expect(screen.getByText("Review history heatmap is enabled. Window 30d.")).not.toBeNull()
        await user.selectOptions(screen.getByLabelText("Review history window"), "90d")

        expect(screen.getByText("Review history heatmap is enabled. Window 90d.")).not.toBeNull()
        expect(screen.getByRole("list", { name: "Review history heatmap list" })).not.toBeNull()
    })

    it("показывает file neighborhood panel с dependencies и recent changes", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByText("File neighborhood panel")).not.toBeNull()
        expect(screen.getByRole("list", { name: "Neighborhood dependency list" })).not.toBeNull()
        expect(
            screen.getByRole("list", { name: "Neighborhood recent changes list" }),
        ).not.toBeNull()

        const neighborhoodButtons = screen.getAllByRole("button", {
            name: /Open neighborhood file/,
        })
        const firstNeighborhoodButton = neighborhoodButtons[0]
        if (firstNeighborhoodButton === undefined) {
            throw new Error("Expected at least one neighborhood action button")
        }
        await user.click(firstNeighborhoodButton)

        expect(screen.getByText(/Focused file:\s*src\/auth\//)).not.toBeNull()
    })

    it("рендерит review risk indicator из impact и history сигналов", (): void => {
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByText("Review risk indicator")).not.toBeNull()
        expect(screen.getByLabelText(/Review risk level/)).not.toBeNull()
        expect(screen.getByText(/Risk score:/)).not.toBeNull()
        expect(screen.getByRole("list", { name: "Review risk drivers list" })).not.toBeNull()
    })

    it("показывает restricted decision states для viewer роли", (): void => {
        const ccr = getMockCcrRow(0)
        window.localStorage.setItem("codenautic:rbac:role", "viewer")

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        const approveButton = screen.getByRole("button", { name: "Approve review" })
        expect(approveButton).toBeDisabled()
        expect(screen.getByText(/Role-based restriction/i)).not.toBeNull()
        expect(screen.queryByRole("link", { name: "Finish review" })).toBeNull()
        expect(screen.getByText(/Finish review unavailable/i)).not.toBeNull()
    })

    it("показывает SafeGuard trace панель с причинами фильтрации", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByRole("list", { name: "SafeGuard trace list" })).not.toBeNull()
        expect(screen.getByText(/Applied filters:/i)).not.toBeNull()
        expect(screen.getByText(/Filtered out:/i)).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Open trace for SG-003" }))

        expect(screen.getByText(/Decision:\s*filtered out/i)).not.toBeNull()
        expect(screen.getByText(/Hidden reason:/i)).not.toBeNull()
        expect(screen.getByText(/severity\s*—\s*filtered out/i)).not.toBeNull()
        expect(screen.getByText(/Severity below configured threshold/i)).not.toBeNull()
    })

    it("отправляет reviewer feedback и показывает accepted/rejected статус", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        await user.click(screen.getByRole("button", { name: "Open trace for SG-002" }))
        await user.click(screen.getByRole("button", { name: "Quick action duplicate" }))
        await user.click(screen.getByRole("button", { name: "Accept feedback" }))

        expect(screen.getByText(/Feedback status:/)).not.toBeNull()
        expect(screen.getByText(/Applied outcome:/)).not.toBeNull()
        expect(screen.getByText("Linked to SG-001 history.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Quick action irrelevant" }))
        await user.click(screen.getByRole("button", { name: "Reject feedback" }))

        expect(screen.getByText(/Feedback status:/)).not.toBeNull()
        expect(screen.getByText(/Rejection reason:/)).not.toBeNull()
    })

    it("рендерит SSE viewer при streamSourceUrl", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        class LocalMockEventSource {
            public close: () => void
            public readonly url: string
            private readonly listeners: Record<string, Array<(event: MessageEvent<string>) => void>>

            public constructor(url: string) {
                this.url = url
                this.close = vi.fn()
                this.listeners = {}
            }

            public addEventListener(
                type: string,
                listener: (event: MessageEvent<string>) => void,
            ): void {
                const listeners = this.listeners[type]
                if (listeners === undefined) {
                    this.listeners[type] = [listener]
                    return
                }

                listeners.push(listener)
            }

            public emit(eventType: string, payload: string): void {
                const listeners = this.listeners[eventType]
                if (listeners === undefined) {
                    return
                }

                const event = { data: payload } as MessageEvent<string>
                listeners.forEach((listener): void => {
                    listener(event)
                })
            }
        }

        const createdSources: LocalMockEventSource[] = []
        const EventSourceProxy = class extends LocalMockEventSource {
            public constructor(url: string) {
                super(url)
                createdSources.push(this)
            }
        }

        // @ts-expect-error mock EventSource only for test
        globalThis.EventSource = EventSourceProxy

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} streamSourceUrl="/api/v1/ccr/stream" />)

        const startButton = screen.getByRole("button", { name: "Start" })
        await user.click(startButton)

        const source = createdSources.at(0)
        expect(source).not.toBeUndefined()
        act((): void => {
            source?.emit("message", JSON.stringify({ message: "stream started" }))
        })
    })

    it("рендерит code diff с inline комментариями", (): void => {
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByRole("region", { name: "Code diff viewer" })).not.toBeNull()
        expect(screen.getAllByText("src/auth/middleware.ts").length).toBeGreaterThan(0)
    })

    it("поддерживает вложенный review thread с reply/resolve/feedback", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = getMockCcrRow(0)

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getAllByText("Neo").length).toBeGreaterThan(0)
        expect(screen.getByText("Morpheus")).not.toBeNull()
        expect(screen.getByText("Cypher")).not.toBeNull()

        const likeButton = screen.getByRole("button", { name: /Like comment from Cypher/ })
        await user.click(likeButton)

        const resolveButtons = screen.getAllByRole("button", { name: "Resolve" })
        const firstResolveButton = resolveButtons[0]
        if (firstResolveButton !== undefined) {
            await user.click(firstResolveButton)
        }
        expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0)

        const replyButton = screen.getByRole("button", { name: "Reply to Neo" })
        await user.click(replyButton)

        const replyTextarea = screen.getByLabelText("Reply textarea for Neo")
        await user.type(replyTextarea, "Looks good, let's handle in next refactor.")
        const addReplyButton = screen.getByRole("button", { name: "Add reply" })
        await user.click(addReplyButton)

        expect(screen.getByText("Looks good, let's handle in next refactor.")).not.toBeNull()
    })
})
