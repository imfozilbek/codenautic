import { screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"

import { FormSelectField } from "@/components/forms/form-select-field"
import { renderWithProviders } from "../../utils/render"

interface ITestForm {
    provider: string
}

const TEST_OPTIONS = [
    { label: "OpenAI", value: "openai" },
    { label: "Anthropic", value: "anthropic" },
    { label: "Ollama", value: "ollama", description: "Local model" },
]

function SelectFieldHarness(props: {
    readonly defaultValue?: string
    readonly helperText?: string
}): ReactElement {
    const form = useForm<ITestForm>({
        defaultValues: { provider: props.defaultValue ?? "openai" },
    })

    return (
        <form>
            <FormSelectField<ITestForm, "provider">
                control={form.control}
                label="Provider"
                name="provider"
                options={TEST_OPTIONS}
                helperText={props.helperText}
            />
        </form>
    )
}

describe("FormSelectField", (): void => {
    it("when rendered, then shows label", (): void => {
        renderWithProviders(<SelectFieldHarness />)

        expect(screen.getByText("Provider")).not.toBeNull()
    })

    it("when rendered, then shows select element", (): void => {
        const { container } = renderWithProviders(<SelectFieldHarness />)

        const select = container.querySelector("select")
        expect(select).not.toBeNull()
    })

    it("when helperText is provided, then renders helper text", (): void => {
        renderWithProviders(<SelectFieldHarness helperText="Choose your LLM provider" />)

        expect(screen.getByText("Choose your LLM provider")).not.toBeNull()
    })

    it("when rendered with options, then select contains option items", (): void => {
        const { container } = renderWithProviders(<SelectFieldHarness />)

        const options = container.querySelectorAll("option")
        expect(options.length).toBeGreaterThanOrEqual(3)
    })
})
