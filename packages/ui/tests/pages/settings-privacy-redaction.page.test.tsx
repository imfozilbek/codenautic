import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsPrivacyRedactionPage } from "@/pages/settings-privacy-redaction.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsPrivacyRedactionPage", (): void => {
    it("блокирует небезопасный экспорт и подтверждает safe export после redaction", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Privacy-safe export" }),
        ).not.toBeNull()
        expect(screen.getByText("Sensitive fragments detected")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Confirm safe export" }))
        await waitFor(() => {
            expect(screen.getByText(/Export blocked/)).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Apply redaction suggestions" }))
        await waitFor(() => {
            expect(screen.getByRole("textbox", { name: "Privacy redacted preview" })).not.toBeNull()
        })
        expect(screen.getByDisplayValue(/REDACTED_TOKEN/)).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Confirm safe export" }))
        await waitFor(() => {
            expect(screen.getByText(/Safe export confirmed/)).not.toBeNull()
        })
    })

    it("требует повторного redaction после изменения source text", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        await user.click(screen.getByRole("button", { name: "Apply redaction suggestions" }))
        await waitFor(() => {
            expect(screen.getByDisplayValue(/REDACTED_TOKEN/)).not.toBeNull()
        })

        const sourceTextarea = screen.getByRole("textbox", { name: "Privacy source text" })
        await user.clear(sourceTextarea)
        await user.type(sourceTextarea, "token=updated1234567890")

        await user.click(screen.getByRole("button", { name: "Confirm safe export" }))
        await waitFor(() => {
            expect(screen.getByText(/Export blocked/)).not.toBeNull()
        })
    })

    it("показывает 'No sensitive fragments' и разрешает экспорт без redaction для безопасного текста", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        const sourceTextarea = screen.getByRole("textbox", { name: "Privacy source text" })
        await user.clear(sourceTextarea)
        await user.type(sourceTextarea, "just a normal log message")

        await waitFor(() => {
            expect(screen.getByText("No sensitive fragments")).not.toBeNull()
        })
        expect(screen.getByText("Current payload is safe for export.")).not.toBeNull()
        expect(screen.getByText("No hits. You can export directly.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Confirm safe export" }))
        await waitFor(() => {
            expect(screen.getByText(/Safe export confirmed/)).not.toBeNull()
        })
    })

    it("обнаруживает api_key в тексте", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        const sourceTextarea = screen.getByRole("textbox", { name: "Privacy source text" })
        await user.clear(sourceTextarea)
        await user.type(sourceTextarea, "api_key=abc12345678")

        await waitFor(() => {
            expect(screen.getByText("Sensitive fragments detected")).not.toBeNull()
        })

        const hitsList = screen.getByRole("list", { name: "Sensitive hits list" })
        expect(within(hitsList).getByText("api_key")).not.toBeNull()
        expect(within(hitsList).getByText("api_key=abc12345678")).not.toBeNull()
    })

    it("обнаруживает secret в тексте", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        const sourceTextarea = screen.getByRole("textbox", { name: "Privacy source text" })
        await user.clear(sourceTextarea)
        await user.type(sourceTextarea, "secret=mypassword123")

        await waitFor(() => {
            expect(screen.getByText("Sensitive fragments detected")).not.toBeNull()
        })

        const hitsList = screen.getByRole("list", { name: "Sensitive hits list" })
        expect(within(hitsList).getByText("secret")).not.toBeNull()
        expect(within(hitsList).getByText("secret=mypassword123")).not.toBeNull()
    })

    it("обнаруживает email в тексте", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        const sourceTextarea = screen.getByRole("textbox", { name: "Privacy source text" })
        await user.clear(sourceTextarea)
        await user.type(sourceTextarea, "contact user@example.com for help")

        await waitFor(() => {
            expect(screen.getByText("Sensitive fragments detected")).not.toBeNull()
        })
        expect(screen.getByText("email")).not.toBeNull()
        expect(screen.getByText("user@example.com")).not.toBeNull()
    })

    it("копирует source в redacted и показывает info при apply redaction без чувствительных данных", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        const sourceTextarea = screen.getByRole("textbox", { name: "Privacy source text" })
        await user.clear(sourceTextarea)
        await user.type(sourceTextarea, "safe text only")

        await waitFor(() => {
            expect(screen.getByText("No sensitive fragments")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Apply redaction suggestions" }))

        await waitFor(() => {
            const redactedPreview = screen.getByRole("textbox", {
                name: "Privacy redacted preview",
            })
            expect(redactedPreview).not.toBeNull()
            expect(redactedPreview).toHaveValue("safe text only")
        })
    })

    it("обнаруживает все 4 типа чувствительных данных одновременно", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsPrivacyRedactionPage />)

        const sourceTextarea = screen.getByRole("textbox", { name: "Privacy source text" })
        await user.clear(sourceTextarea)
        await user.type(
            sourceTextarea,
            "token=longtoken1234567890 api_key=keyvalue12345 secret=pass123456 admin@test.com",
        )

        await waitFor(() => {
            expect(screen.getByText("Sensitive fragments detected")).not.toBeNull()
        })

        const hitsList = screen.getByRole("list", { name: "Sensitive hits list" })
        expect(hitsList).not.toBeNull()

        expect(screen.getByText("token")).not.toBeNull()
        expect(screen.getByText("api_key")).not.toBeNull()
        expect(screen.getByText("secret")).not.toBeNull()
        expect(screen.getByText("email")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Apply redaction suggestions" }))
        await waitFor(() => {
            expect(screen.getByDisplayValue(/REDACTED_TOKEN/)).not.toBeNull()
            expect(screen.getByDisplayValue(/REDACTED_API_KEY/)).not.toBeNull()
            expect(screen.getByDisplayValue(/REDACTED_SECRET/)).not.toBeNull()
            expect(screen.getByDisplayValue(/REDACTED_EMAIL/)).not.toBeNull()
        })
    })
})
