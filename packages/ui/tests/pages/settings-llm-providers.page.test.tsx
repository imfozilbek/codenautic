import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsLlmProvidersPage, toNextProviderConfig } from "@/pages/settings-llm-providers.page"
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

    it("сохраняет connected статус при save, даже если testAfterSave выключен", (): void => {
        const previousConfig = {
            Anthropic: {
                id: "llm-anthropic",
                apiKey: "",
                connected: false,
                endpoint: "https://api.anthropic.com",
                model: "claude-3-7-sonnet",
                provider: "Anthropic",
            },
            "Azure OpenAI": {
                id: "llm-azure-openai",
                apiKey: "",
                connected: false,
                endpoint: "https://azure-openai.example.com",
                model: "gpt-4o-mini",
                provider: "Azure OpenAI",
            },
            Mistral: {
                id: "llm-mistral",
                apiKey: "",
                connected: false,
                endpoint: "https://api.mistral.ai",
                model: "mistral-small-latest",
                provider: "Mistral",
            },
            OpenAI: {
                id: "llm-openai",
                apiKey: "sk-connected-provider",
                connected: true,
                endpoint: "https://api.openai.com/v1",
                model: "gpt-4o-mini",
                provider: "OpenAI",
            },
        } as const

        const updatedConfig = toNextProviderConfig(previousConfig, "OpenAI", {
            apiKey: "sk-updated-provider",
            endpoint: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            provider: "OpenAI",
            testAfterSave: false,
        })

        expect(updatedConfig.OpenAI.connected).toBe(true)
    })
})
