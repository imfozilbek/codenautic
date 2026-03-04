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
            <ContextSourceCard
                onRefresh={onRefresh}
                onToggleEnabled={onToggle}
                source={SOURCE}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Disable" }))
        await user.click(screen.getByRole("button", { name: "Refresh" }))

        expect(onToggle).toHaveBeenCalledWith("jira-source", false)
        expect(onRefresh).toHaveBeenCalledWith("jira-source")
    })
})
