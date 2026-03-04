import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ContextPreview } from "@/components/settings/context-preview"
import { renderWithProviders } from "../../utils/render"

describe("ContextPreview", (): void => {
    it("показывает loading и error состояния", (): void => {
        const { rerender } = renderWithProviders(<ContextPreview isLoading sourceName="Jira" />)
        expect(screen.getByText("Loading context preview...")).not.toBeNull()

        rerender(<ContextPreview isError sourceName="Jira" />)
        expect(screen.getByText("Unable to load context preview.")).not.toBeNull()
    })

    it("рендерит preview items и deep-link", (): void => {
        renderWithProviders(
            <ContextPreview
                preview={{
                    sourceId: "jira-source",
                    items: [
                        {
                            id: "item-1",
                            title: "CN-123",
                            excerpt: "Pipeline stuck on review-worker",
                            url: "https://acme.atlassian.net/browse/CN-123",
                        },
                    ],
                    total: 1,
                }}
                sourceName="Jira"
            />,
        )

        expect(screen.getByText("CN-123")).not.toBeNull()
        expect(screen.getByText("Pipeline stuck on review-worker")).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open source item" })).not.toBeNull()
    })
})
