import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsLlmProvidersPage } from "@/pages/settings-llm-providers.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsLlmProvidersPage", (): void => {
    it("рендерит провайдеры и действия для проверки подключения", (): void => {
        renderWithProviders(<SettingsLlmProvidersPage />)

        expect(screen.getByRole("heading", { level: 1, name: "LLM Providers" })).not.toBeNull()
        expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0)
        expect(screen.getAllByText("Anthropic").length).toBeGreaterThan(0)
        expect(screen.getAllByText("Mistral").length).toBeGreaterThan(0)
        expect(screen.getAllByText("Azure OpenAI").length).toBeGreaterThan(0)
        expect(screen.getAllByRole("button", { name: "Validate via pipeline" }).length).toBe(4)
    })

    it("позволяет сохранить конфигурацию для провайдера", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsLlmProvidersPage />)

        const apiKeyField = screen.getAllByLabelText("API key / token")[0]
        if (apiKeyField === undefined) {
            throw new Error("API key input is not found")
        }

        const saveButton = screen.getAllByRole("button", {
            name: "Save LLM configuration",
        })[0]
        if (saveButton === undefined) {
            throw new Error("Save button is not found")
        }

        await user.type(apiKeyField, "sk-test-1234567890")
        await user.click(saveButton)

        expect((apiKeyField as HTMLInputElement).value).toBe("sk-test-1234567890")
    })
})
