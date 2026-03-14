import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { FormEvent, ReactElement } from "react"
import { useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"

import { FormNumberField } from "@/components/forms/form-number-field"
import { renderWithProviders } from "../../utils/render"

interface ITestForm {
    limit: number | undefined
}

function NumberFieldHarness(props: {
    readonly defaultValue?: number
    readonly onSubmit?: (values: ITestForm) => void
    readonly rules?: object
}): ReactElement {
    const form = useForm<ITestForm>({
        defaultValues: { limit: props.defaultValue ?? 1 },
    })

    const submitForm = (event: FormEvent<HTMLFormElement>): void => {
        void form.handleSubmit((values): void => {
            props.onSubmit?.(values)
        })(event)
    }

    return (
        <form onSubmit={submitForm}>
            <FormNumberField<ITestForm, "limit">
                control={form.control}
                label="Limit"
                name="limit"
                rules={props.rules}
            />
            <button type="submit">Submit</button>
        </form>
    )
}

describe("FormNumberField", (): void => {
    it("when rendered, then shows label and number input", (): void => {
        renderWithProviders(<NumberFieldHarness />)

        expect(screen.getByText("Limit")).not.toBeNull()
        expect(screen.getByRole("spinbutton", { name: "Limit" })).not.toBeNull()
    })

    it("when rendered with default value, then displays value", (): void => {
        renderWithProviders(<NumberFieldHarness defaultValue={42} />)

        const input = screen.getByRole("spinbutton", { name: "Limit" })
        expect((input as HTMLInputElement).value).toBe("42")
    })

    it("when user clears and types a number, then updates the value", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<NumberFieldHarness defaultValue={0} />)

        const input = screen.getByRole("spinbutton", { name: "Limit" })
        await user.clear(input)
        await user.type(input, "10")

        expect((input as HTMLInputElement).value).toBe("10")
    })

    it("when input type is number, then renders with type number", (): void => {
        renderWithProviders(<NumberFieldHarness />)

        const input = screen.getByRole("spinbutton", { name: "Limit" })
        expect((input as HTMLInputElement).type).toBe("number")
    })
})
