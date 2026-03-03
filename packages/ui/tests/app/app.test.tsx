import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { App } from "@/app/app"

describe("App bootstrap", (): void => {
    it("поднимает router и рендерит главную страницу", async (): Promise<void> => {
        render(<App />)

        const pageTitle = await screen.findByRole("heading", { name: "CodeNautic Runtime" })
        expect(pageTitle.textContent).toBe("CodeNautic Runtime")

        const healthLabel = await screen.findByText("Состояние API")
        expect(healthLabel.textContent).toBe("Состояние API")
    })
})
