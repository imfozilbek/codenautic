import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsJobsPage } from "@/pages/settings-jobs.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsJobsPage", (): void => {
    it("показывает jobs monitor, recovery actions и audit trail", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Operations jobs monitor" }),
        ).not.toBeNull()
        expect(screen.getByText("Failed/Stuck: 2")).not.toBeNull()
        expect(screen.getByText("JOB-4102 · scan")).not.toBeNull()

        const retryButtons = screen.getAllByRole("button", { name: "Retry" })
        const retryButton = retryButtons.find((button): boolean => {
            return button.getAttribute("disabled") === null
        })
        if (retryButton === undefined) {
            throw new Error("Enabled Retry button not found")
        }
        await user.click(retryButton)
        await waitFor(() => {
            expect(screen.getByText("Retry queued with updated attempt counter.")).not.toBeNull()
        })

        const cancelButtons = screen.getAllByRole("button", { name: "Cancel" })
        const firstCancelButton = cancelButtons[0]
        if (firstCancelButton !== undefined) {
            await user.click(firstCancelButton)
        }
        await waitFor(() => {
            expect(
                screen.getByText("Job cancelled by operator from monitor center."),
            ).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Open JOB-4103 details" }))
        expect(screen.getByText("Latest error trace")).not.toBeNull()
        expect(screen.getByText(/Analytics aggregation failed/)).not.toBeNull()

        const requeueButtons = screen.getAllByRole("button", { name: "Requeue" })
        const firstRequeueButton = requeueButtons[0]
        if (firstRequeueButton !== undefined) {
            await user.click(firstRequeueButton)
        }
        await waitFor(() => {
            expect(screen.getByText("Job moved back to queue for safe recovery.")).not.toBeNull()
        })
    })

    it("показывает timezone-aware schedule preview с absolute и relative временем", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        expect(screen.getByText("Timezone + schedule preview")).not.toBeNull()
        expect(screen.getByText(/Schedule is evaluated on server timezone/)).not.toBeNull()

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Organization timezone override" }),
            "America/New_York",
        )
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule frequency" }),
            "weekly",
        )

        const previewItems = screen.getAllByRole("listitem")
        expect(previewItems.length).toBeGreaterThan(4)

        await user.click(screen.getByRole("button", { name: "Save schedule" }))
        expect(screen.getByText(/Saved rescan runs weekly/)).not.toBeNull()
    })

    it("отображает live summary с total, active queue и failed/stuck", async (): Promise<void> => {
        renderWithProviders(<SettingsJobsPage />)

        expect(screen.getByText("Total: 4")).not.toBeNull()
        expect(screen.getByText("Active queue: 2")).not.toBeNull()
        expect(screen.getByText("Failed/Stuck: 2")).not.toBeNull()
    })

    it("выбор job без ошибок показывает healthy diagnostics", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.click(screen.getByRole("button", { name: "Open JOB-4101 details" }))
        expect(screen.getByText("No blocking error for selected job")).not.toBeNull()
        expect(screen.getByText("Diagnostics are healthy for this operation.")).not.toBeNull()
    })

    it("выбор job с errorDetails показывает error trace", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.click(screen.getByRole("button", { name: "Open JOB-4102 details" }))
        expect(screen.getByText("Latest error trace")).not.toBeNull()
        expect(screen.getByText(/Queue connection timeout/)).not.toBeNull()
    })

    it("retry disabled для running job", async (): Promise<void> => {
        renderWithProviders(<SettingsJobsPage />)

        const jobsList = screen.getByRole("list", { name: "Operations jobs list" })
        const runningJob = within(jobsList).getByText("JOB-4101 · review").closest("li")
        if (runningJob === null) {
            throw new Error("Running job row not found")
        }

        expect(within(runningJob).getByRole("button", { name: "Retry" })).toBeDisabled()
    })

    it("cancel disabled для failed/stuck jobs", async (): Promise<void> => {
        renderWithProviders(<SettingsJobsPage />)

        const jobsList = screen.getByRole("list", { name: "Operations jobs list" })
        const stuckJob = within(jobsList).getByText("JOB-4102 · scan").closest("li")
        if (stuckJob === null) {
            throw new Error("Stuck job row not found")
        }

        expect(within(stuckJob).getByRole("button", { name: "Cancel" })).toBeDisabled()
    })

    it("requeue disabled для running и queued jobs", async (): Promise<void> => {
        renderWithProviders(<SettingsJobsPage />)

        const jobsList = screen.getByRole("list", { name: "Operations jobs list" })
        const runningJob = within(jobsList).getByText("JOB-4101 · review").closest("li")
        if (runningJob === null) {
            throw new Error("Running job row not found")
        }

        expect(within(runningJob).getByRole("button", { name: "Requeue" })).toBeDisabled()

        const queuedJob = within(jobsList).getByText("JOB-4104 · review").closest("li")
        if (queuedJob === null) {
            throw new Error("Queued job row not found")
        }

        expect(within(queuedJob).getByRole("button", { name: "Requeue" })).toBeDisabled()
    })

    it("cancel running job меняет статус на canceled", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        const jobsList = screen.getByRole("list", { name: "Operations jobs list" })
        const runningJob = within(jobsList).getByText("JOB-4101 · review").closest("li")
        if (runningJob === null) {
            throw new Error("Running job row not found")
        }

        await user.click(within(runningJob).getByRole("button", { name: "Cancel" }))
        await waitFor((): void => {
            expect(within(runningJob).getByText("canceled")).not.toBeNull()
        })
    })

    it("retry stuck job меняет статус на queued и увеличивает retry count", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        const jobsList = screen.getByRole("list", { name: "Operations jobs list" })
        const stuckJob = within(jobsList).getByText("JOB-4102 · scan").closest("li")
        if (stuckJob === null) {
            throw new Error("Stuck job row not found")
        }

        expect(within(stuckJob).getByText(/retries 2\/3/)).not.toBeNull()

        await user.click(within(stuckJob).getByRole("button", { name: "Retry" }))
        await waitFor((): void => {
            expect(within(stuckJob).getByText("queued")).not.toBeNull()
            expect(within(stuckJob).getByText(/retries 3\/3/)).not.toBeNull()
        })
    })

    it("requeue failed job меняет статус на queued", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        const jobsList = screen.getByRole("list", { name: "Operations jobs list" })
        const failedJob = within(jobsList).getByText("JOB-4103 · analytics").closest("li")
        if (failedJob === null) {
            throw new Error("Failed job row not found")
        }

        await user.click(within(failedJob).getByRole("button", { name: "Requeue" }))
        await waitFor((): void => {
            expect(within(failedJob).getByText("queued")).not.toBeNull()
        })
    })

    it("schedule target переключает между rescan и report", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        expect(screen.getByText(/rescan runs every 6h/)).not.toBeNull()

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule target" }),
            "report",
        )
        expect(screen.getByText(/report runs weekly/)).not.toBeNull()
    })

    it("user timezone переключается и отражается в effective timezone", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "User timezone" }),
            "Europe/Berlin",
        )

        await user.click(screen.getByRole("button", { name: "Save schedule" }))
        expect(screen.getByText(/timezone Europe\/Berlin/)).not.toBeNull()
    })

    it("org timezone override inherit-user использует user timezone", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Organization timezone override" }),
            "inherit-user",
        )

        await user.click(screen.getByRole("button", { name: "Save schedule" }))
        expect(screen.getByText(/timezone Asia\/Tashkent/)).not.toBeNull()
    })

    it("org timezone override с конкретным значением замещает user timezone", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Organization timezone override" }),
            "UTC",
        )

        await user.click(screen.getByRole("button", { name: "Save schedule" }))
        expect(screen.getByText(/timezone UTC/)).not.toBeNull()
    })

    it("schedule frequency hourly показывает interval hours select", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        expect(screen.getByRole("combobox", { name: "Interval hours" })).not.toBeNull()
        expect(screen.queryByRole("combobox", { name: "Schedule weekday" })).toBeNull()

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Interval hours" }),
            "12",
        )

        expect(screen.getByText(/rescan runs every 12h/)).not.toBeNull()
    })

    it("schedule frequency weekly показывает weekday select вместо interval", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule frequency" }),
            "weekly",
        )

        expect(screen.getByRole("combobox", { name: "Schedule weekday" })).not.toBeNull()
        expect(screen.queryByRole("combobox", { name: "Interval hours" })).toBeNull()
    })

    it("schedule hour и minute selects обновляют описание расписания", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule frequency" }),
            "weekly",
        )
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule hour" }),
            "14",
        )
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule minute" }),
            "30",
        )

        expect(screen.getByText(/rescan runs weekly on Monday at 14:30/)).not.toBeNull()
    })

    it("показывает initial audit entry из seed данных", async (): Promise<void> => {
        renderWithProviders(<SettingsJobsPage />)

        const auditList = screen.getByRole("list", { name: "Jobs audit trail list" })
        expect(within(auditList).getByText(/JOB-4055 · retry · Nika Saryeva/)).not.toBeNull()
        expect(
            within(auditList).getByText("Retry accepted by queue worker."),
        ).not.toBeNull()
    })

    it("schedule preview list рендерит 5 preview элементов", async (): Promise<void> => {
        renderWithProviders(<SettingsJobsPage />)

        const previewList = screen.getByRole("list", { name: "Schedule preview list" })
        const previewItems = within(previewList).getAllByRole("listitem")
        expect(previewItems.length).toBe(5)
    })

    it("weekday select изменяет день для weekly schedule", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsJobsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule frequency" }),
            "weekly",
        )

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Schedule weekday" }),
            "5",
        )

        expect(screen.getByText(/rescan runs weekly on Friday/)).not.toBeNull()
    })
})
