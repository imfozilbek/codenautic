import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"

import { FormSwitchField } from "@/components/forms/form-switch-field"
import { renderWithProviders } from "../../utils/render"

interface ITestForm {
    notifications: boolean
}

function SwitchHarness(props: { readonly defaultValue?: boolean }): ReactElement {
    const form = useForm<ITestForm>({
        defaultValues: { notifications: props.defaultValue ?? false },
    })

    return (
        <form>
            <FormSwitchField<ITestForm, "notifications">
                control={form.control}
                label="Notifications"
                name="notifications"
            />
        </form>
    )
}

describe("FormSwitchField", (): void => {
    it("when rendered, then shows switch with label", (): void => {
        renderWithProviders(<SwitchHarness />)

        expect(screen.getByRole("switch", { name: "Notifications" })).not.toBeNull()
        expect(screen.getByText("Notifications")).not.toBeNull()
    })

    it("when default value is false, then switch is off", (): void => {
        renderWithProviders(<SwitchHarness defaultValue={false} />)

        const switchEl = screen.getByRole("switch", { name: "Notifications" })
        expect(switchEl).not.toBeChecked()
    })

    it("when default value is true, then switch is on", (): void => {
        renderWithProviders(<SwitchHarness defaultValue />)

        const switchEl = screen.getByRole("switch", { name: "Notifications" })
        expect(switchEl).toBeChecked()
    })

    it("when clicked, then toggles state", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SwitchHarness />)

        const switchEl = screen.getByRole("switch", { name: "Notifications" })
        expect(switchEl).not.toBeChecked()

        await user.click(switchEl)
        expect(switchEl).toBeChecked()
    })
})
