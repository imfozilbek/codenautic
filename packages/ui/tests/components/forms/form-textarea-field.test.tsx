import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"

import { FormTextareaField } from "@/components/forms/form-textarea-field"
import { renderWithProviders } from "../../utils/render"

interface ITestForm {
    description: string
}

function TextareaHarness(props: {
    readonly defaultValue?: string
    readonly helperText?: string
}): ReactElement {
    const form = useForm<ITestForm>({
        defaultValues: { description: props.defaultValue ?? "" },
    })

    return (
        <form>
            <FormTextareaField<ITestForm, "description">
                control={form.control}
                label="Description"
                name="description"
                helperText={props.helperText}
            />
        </form>
    )
}

describe("FormTextareaField", (): void => {
    it("when rendered, then shows label and textarea", (): void => {
        renderWithProviders(<TextareaHarness />)

        expect(screen.getByText("Description")).not.toBeNull()
        expect(screen.getByRole("textbox", { name: "Description" })).not.toBeNull()
    })

    it("when rendered with default value, then textarea contains value", (): void => {
        renderWithProviders(<TextareaHarness defaultValue="Initial text" />)

        const textarea = screen.getByRole("textbox", { name: "Description" })
        expect(textarea.value).toBe("Initial text")
    })

    it("when helperText is provided, then renders helper text", (): void => {
        renderWithProviders(<TextareaHarness helperText="Describe the issue" />)

        expect(screen.getByText("Describe the issue")).not.toBeNull()
    })

    it("when user types, then updates textarea value", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<TextareaHarness />)

        const textarea = screen.getByRole("textbox", { name: "Description" })
        await user.type(textarea, "New content")

        expect((textarea as HTMLTextAreaElement).value).toContain("New content")
    })
})
