import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    AlertConfigDialog,
    type IAlertConfigDialogModule,
} from "@/components/graphs/alert-config-dialog"
import { renderWithProviders } from "../../utils/render"

const MOCK_MODULES: ReadonlyArray<IAlertConfigDialogModule> = [
    { moduleId: "mod-api", label: "API", enabledByDefault: true },
    { moduleId: "mod-worker", label: "Worker", enabledByDefault: false },
    { moduleId: "mod-cache", label: "Cache", enabledByDefault: true },
]

describe("AlertConfigDialog", (): void => {
    it("when rendered with modules, then displays title and module labels", (): void => {
        renderWithProviders(<AlertConfigDialog modules={MOCK_MODULES} />)

        expect(screen.getByText("Alert config dialog")).not.toBeNull()
        expect(screen.getByText("API")).not.toBeNull()
        expect(screen.getByText("Worker")).not.toBeNull()
        expect(screen.getByText("Cache")).not.toBeNull()
    })

    it("when enabledByDefault is true, then module checkbox is checked initially", (): void => {
        renderWithProviders(<AlertConfigDialog modules={MOCK_MODULES} />)

        const apiCheckbox = screen.getByLabelText("API")
        expect((apiCheckbox as HTMLInputElement).checked).toBe(true)

        const workerCheckbox = screen.getByLabelText("Worker")
        expect((workerCheckbox as HTMLInputElement).checked).toBe(false)
    })

    it("when save button is clicked, then calls onSave with current configuration", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSave = vi.fn()

        renderWithProviders(<AlertConfigDialog modules={MOCK_MODULES} onSave={onSave} />)

        const saveButton = screen.getByRole("button", {
            name: "Save prediction alert configuration",
        })
        await user.click(saveButton)

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                confidenceThreshold: 75,
                issueIncreaseThreshold: 3,
                channels: ["slack", "email"],
                frequency: "daily",
            }),
        )
    })

    it("when channel checkbox is toggled, then updates channels selection", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSave = vi.fn()

        renderWithProviders(<AlertConfigDialog modules={MOCK_MODULES} onSave={onSave} />)

        const webhookCheckbox = screen.getByLabelText("webhook")
        await user.click(webhookCheckbox)

        const saveButton = screen.getByRole("button", {
            name: "Save prediction alert configuration",
        })
        await user.click(saveButton)

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                channels: expect.arrayContaining([
                    "slack",
                    "email",
                    "webhook",
                ]) as ReadonlyArray<string>,
            }),
        )
    })

    it("when defaultValue is provided, then initializes with those values", (): void => {
        renderWithProviders(
            <AlertConfigDialog
                modules={MOCK_MODULES}
                defaultValue={{
                    confidenceThreshold: 90,
                    issueIncreaseThreshold: 5,
                    channels: ["webhook"],
                    frequency: "weekly",
                    moduleIds: ["mod-worker"],
                }}
            />,
        )

        const confidenceInput = screen.getByRole("spinbutton", {
            name: "Alert confidence threshold",
        })
        expect((confidenceInput as HTMLInputElement).value).toBe("90")
    })
})
