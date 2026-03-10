import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ContextSourceCard } from "@/components/settings/context-source-card"
import {
    EXTERNAL_CONTEXT_SOURCE_TYPE,
    EXTERNAL_CONTEXT_STATUS,
    type IExternalContextSource,
} from "@/lib/api/endpoints/external-context.endpoint"
import { renderWithProviders } from "../../utils/render"

const SOURCE: IExternalContextSource = {
    id: "jira-source",
    name: "Jira issues",
    type: EXTERNAL_CONTEXT_SOURCE_TYPE.jira,
    status: EXTERNAL_CONTEXT_STATUS.connected,
    enabled: true,
    itemCount: 42,
    lastSyncedAt: "2026-03-05T07:00:00Z",
}

describe("ContextSourceCard", (): void => {
    it("рендерит source-метаданные и статус", (): void => {
        renderWithProviders(<ContextSourceCard source={SOURCE} />)

        expect(screen.getByText("Jira issues")).not.toBeNull()
        expect(screen.getByText("JIRA")).not.toBeNull()
        expect(screen.getByText("Connected")).not.toBeNull()
        expect(screen.getByText(/Items: 42/)).not.toBeNull()
    })

    it("вызывает toggle и refresh callbacks", async (): Promise<void> => {
        const user = userEvent.setup()
        const onToggle = vi.fn((_sourceId: string, _nextEnabled: boolean): void => {})
        const onRefresh = vi.fn((_sourceId: string): void => {})

        renderWithProviders(
            <ContextSourceCard onRefresh={onRefresh} onToggleEnabled={onToggle} source={SOURCE} />,
        )

        await user.click(screen.getByRole("button", { name: "Disable" }))
        await user.click(screen.getByRole("button", { name: "Refresh" }))

        expect(onToggle).toHaveBeenCalledWith("jira-source", false)
        expect(onRefresh).toHaveBeenCalledWith("jira-source")
    })

    it("when status is DEGRADED, then renders Degraded chip", (): void => {
        renderWithProviders(
            <ContextSourceCard source={{ ...SOURCE, status: EXTERNAL_CONTEXT_STATUS.degraded }} />,
        )

        expect(screen.getByText("Degraded")).toBeDefined()
    })

    it("when status is SYNCING, then renders Syncing chip", (): void => {
        renderWithProviders(
            <ContextSourceCard source={{ ...SOURCE, status: EXTERNAL_CONTEXT_STATUS.syncing }} />,
        )

        expect(screen.getByText("Syncing")).toBeDefined()
    })

    it("when status is DISCONNECTED, then renders Disconnected chip", (): void => {
        renderWithProviders(
            <ContextSourceCard
                source={{ ...SOURCE, status: EXTERNAL_CONTEXT_STATUS.disconnected }}
            />,
        )

        expect(screen.getByText("Disconnected")).toBeDefined()
    })

    it("when source is disabled, then shows Enable button", (): void => {
        renderWithProviders(
            <ContextSourceCard onToggleEnabled={vi.fn()} source={{ ...SOURCE, enabled: false }} />,
        )

        expect(screen.getByRole("button", { name: "Enable" })).toBeDefined()
    })

    it("when selected, then applies border style", (): void => {
        const { container } = renderWithProviders(
            <ContextSourceCard selected={true} source={SOURCE} />,
        )

        const card = container.querySelector(".border-primary-300")
        expect(card).not.toBeNull()
    })

    it("when onSelect provided, then clicking card calls onSelect", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(<ContextSourceCard onSelect={onSelect} source={SOURCE} />)

        await user.click(screen.getByText("Jira issues"))

        expect(onSelect).toHaveBeenCalledWith("jira-source")
    })

    it("when lastSyncedAt is undefined, then shows n/a", (): void => {
        renderWithProviders(<ContextSourceCard source={{ ...SOURCE, lastSyncedAt: undefined }} />)

        expect(screen.getByText(/Last sync: n\/a/)).toBeDefined()
    })

    it("when isLoading, then buttons are disabled", (): void => {
        renderWithProviders(
            <ContextSourceCard
                isLoading={true}
                onRefresh={vi.fn()}
                onToggleEnabled={vi.fn()}
                source={SOURCE}
            />,
        )

        const disableBtn = screen.getByRole("button", { name: "Disable" })
        const refreshBtn = screen.getByRole("button", { name: "Refresh" })
        expect(disableBtn.matches(":disabled")).toBe(true)
        expect(refreshBtn.matches(":disabled")).toBe(true)
    })

    it("when no onToggleEnabled, then toggle button is disabled", (): void => {
        renderWithProviders(<ContextSourceCard source={SOURCE} />)

        const btn = screen.getByRole("button", { name: "Disable" })
        expect(btn.matches(":disabled")).toBe(true)
    })
})
