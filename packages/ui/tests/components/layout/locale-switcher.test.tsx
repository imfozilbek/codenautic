import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import i18next from "i18next"
import { afterEach, describe, expect, it } from "vitest"

import { LocaleSwitcher } from "@/components/layout/locale-switcher"
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/i18n"
import { renderWithProviders } from "../../utils/render"

describe("LocaleSwitcher", (): void => {
    afterEach(async (): Promise<void> => {
        localStorage.setItem(LOCALE_STORAGE_KEY, "en")
        await i18next.changeLanguage("en")
    })

    it("when rendered, then shows РУ and EN buttons", (): void => {
        renderWithProviders(<LocaleSwitcher />)

        expect(screen.getByText("РУ")).not.toBeNull()
        expect(screen.getByText("EN")).not.toBeNull()
    })

    it("when rendered, then has radiogroup role", (): void => {
        renderWithProviders(<LocaleSwitcher />)

        expect(screen.getByRole("radiogroup")).not.toBeNull()
    })

    it("when test locale is en, then EN button is selected", (): void => {
        renderWithProviders(<LocaleSwitcher />)

        const enButton = screen.getByText("EN").closest("button")

        expect(enButton?.getAttribute("aria-pressed")).toBe("true")
    })

    it("when РУ button is clicked, then changes locale to ru", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<LocaleSwitcher />)

        await user.click(screen.getByText("РУ"))

        const resolved = i18next.resolvedLanguage ?? i18next.language

        expect(resolved).toBe("ru")
    })

    it("when locale changes, then aria-pressed updates", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<LocaleSwitcher />)

        await user.click(screen.getByText("РУ"))

        const ruButton = screen.getByText("РУ").closest("button")
        const enButton = screen.getByText("EN").closest("button")

        expect(ruButton?.getAttribute("aria-pressed")).toBe("true")
        expect(enButton?.getAttribute("aria-pressed")).toBe("false")
    })

    it("when rendered with className, then applies className to wrapper", (): void => {
        const { container } = renderWithProviders(<LocaleSwitcher className="test-class" />)

        const wrapper = container.firstElementChild

        expect(wrapper?.classList.contains("test-class")).toBe(true)
    })

    it("when rendered, then has accessible aria-labels on buttons", (): void => {
        renderWithProviders(<LocaleSwitcher />)

        expect(screen.getByLabelText("Русский язык")).not.toBeNull()
        expect(screen.getByLabelText("English language")).not.toBeNull()
    })
})
