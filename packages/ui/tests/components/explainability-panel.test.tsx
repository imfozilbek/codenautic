import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ExplainabilityPanel } from "@/components/infrastructure/explainability-panel"
import { renderWithProviders } from "../utils/render"

function createDefaultProps(): {
    readonly title: string
    readonly signalLabel: string
    readonly signalValue: string
    readonly threshold: string
    readonly confidence: string
    readonly dataWindow: string
    readonly limitations: ReadonlyArray<string>
    readonly factors: ReadonlyArray<{
        readonly label: string
        readonly impact: "high" | "low" | "medium"
        readonly value: string
    }>
} {
    return {
        confidence: "87%",
        dataWindow: "last 90 days",
        factors: [
            { impact: "high", label: "Cyclomatic complexity", value: "avg 14.2" },
            { impact: "medium", label: "Churn frequency", value: "3.4 changes/week" },
            { impact: "low", label: "Test coverage", value: "72%" },
        ],
        limitations: ["Data limited to last 90 days", "External dependencies not tracked"],
        signalLabel: "Risk score",
        signalValue: "78",
        threshold: ">70",
        title: "Module risk assessment",
    }
}

describe("ExplainabilityPanel", (): void => {
    it("when rendered, then shows title and signal summary", (): void => {
        const props = createDefaultProps()
        renderWithProviders(<ExplainabilityPanel {...props} />)

        expect(screen.getByText("Module risk assessment")).not.toBeNull()
        expect(screen.getByText("Risk score: 78 · threshold >70 · confidence 87%")).not.toBeNull()
    })

    it("when 'Why this score?' is clicked, then opens drawer with factors", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<ExplainabilityPanel {...props} />)

        await user.click(screen.getByRole("button", { name: "Why this score?" }))

        expect(screen.getByText("Explainability")).not.toBeNull()
        expect(screen.getByText("Cyclomatic complexity")).not.toBeNull()
        expect(screen.getByText("high impact")).not.toBeNull()
        expect(screen.getByText("avg 14.2")).not.toBeNull()
        expect(screen.getByText("Churn frequency")).not.toBeNull()
        expect(screen.getByText("medium impact")).not.toBeNull()
        expect(screen.getByText("Test coverage")).not.toBeNull()
        expect(screen.getByText("low impact")).not.toBeNull()
    })

    it("when drawer is open, then shows limitations list", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<ExplainabilityPanel {...props} />)

        await user.click(screen.getByRole("button", { name: "Why this score?" }))

        expect(screen.getByText("Data limited to last 90 days")).not.toBeNull()
        expect(screen.getByText("External dependencies not tracked")).not.toBeNull()
    })

    it("when export snippet button is clicked, then renders snippet textarea", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<ExplainabilityPanel {...props} />)

        await user.click(screen.getByRole("button", { name: "Why this score?" }))
        await user.click(screen.getByRole("button", { name: "Export explanation snippet" }))

        const textarea = screen.getByLabelText("Explainability export snippet")
        expect(textarea).not.toBeNull()
        expect((textarea as HTMLTextAreaElement).value).toContain("Risk score=78")
        expect((textarea as HTMLTextAreaElement).value).toContain("threshold=>70")
    })
})
