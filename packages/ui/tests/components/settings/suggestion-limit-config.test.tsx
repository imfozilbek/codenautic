import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SuggestionLimitConfig } from "@/components/settings/suggestion-limit-config"
import { renderWithProviders } from "../../utils/render"

describe("SuggestionLimitConfig", (): void => {
    it("нормализует значения в пределах min/max и вызывает onChange", (): void => {
        const onChange = vi.fn<(value: number) => void>()

        renderWithProviders(<SuggestionLimitConfig value={8} onChange={onChange} />)
        const input = screen.getByLabelText("Max suggestions in summary")

        fireEvent.change(input, { target: { value: "50" } })
        fireEvent.change(input, { target: { value: "0" } })
        fireEvent.change(input, { target: { value: "12" } })

        expect(onChange).toHaveBeenNthCalledWith(1, 20)
        expect(onChange).toHaveBeenNthCalledWith(2, 1)
        expect(onChange).toHaveBeenNthCalledWith(3, 12)
    })
})
