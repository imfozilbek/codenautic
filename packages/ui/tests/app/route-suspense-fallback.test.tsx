import {render, screen} from "@testing-library/react"
import {describe, expect, it} from "vitest"

import {RouteSuspenseFallback} from "@/app/route-suspense-fallback"

describe("RouteSuspenseFallback", (): void => {
    it("рендерит заголовок приложения и текст загрузки", (): void => {
        render(<RouteSuspenseFallback />)

        const title = screen.getByRole("heading", {name: "CodeNautic Runtime"})
        expect(title.textContent).toBe("CodeNautic Runtime")

        const loadingText = screen.getByText("Проверяем доступность API...")
        expect(loadingText.textContent).toBe("Проверяем доступность API...")
    })
})
