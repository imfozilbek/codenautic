import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ReportGeneratorPage } from "@/pages/report-generator.page"
import { renderWithProviders } from "../utils/render"

describe("ReportGeneratorPage", (): void => {
    it("настраивает report configuration и показывает preview перед генерацией", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Report generator" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open reports list" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open latest report" })).not.toBeNull()

        await user.selectOptions(screen.getByLabelText("Report type"), "delivery")
        await user.selectOptions(screen.getByLabelText("Report format"), "html")
        await user.clear(screen.getByLabelText("Report date range start"))
        await user.type(screen.getByLabelText("Report date range start"), "2026-02-01")
        await user.clear(screen.getByLabelText("Report date range end"))
        await user.type(screen.getByLabelText("Report date range end"), "2026-02-28")

        await user.click(screen.getByRole("button", { name: "Preview report" }))
        await waitFor(() => {
            expect(
                screen.getByText(
                    /Preview ready: delivery report from 2026-02-01 to 2026-02-28 in HTML\./,
                ),
            ).not.toBeNull()
        })

        expect(screen.getByLabelText("Report preview payload").textContent).toContain(
            '"type": "delivery"',
        )
        expect(screen.getByLabelText("Report preview payload").textContent).toContain(
            '"format": "html"',
        )

        await user.click(screen.getByRole("button", { name: "Generate report" }))
        await waitFor(() => {
            expect(
                screen.getByText(
                    /Report generation queued for delivery \(HTML\) with 2 sections\./,
                ),
            ).not.toBeNull()
        })
    })

    it("блокирует preview при пустом date range", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.clear(screen.getByLabelText("Report date range start"))
        await user.clear(screen.getByLabelText("Report date range end"))

        await user.click(screen.getByRole("button", { name: "Preview report" }))
        await waitFor((): void => {
            expect(screen.getByText(/Preview blocked: Date range is required\./)).not.toBeNull()
        })
    })

    it("блокирует generation при пустом date range", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.clear(screen.getByLabelText("Report date range start"))
        await user.clear(screen.getByLabelText("Report date range end"))

        await user.click(screen.getByRole("button", { name: "Generate report" }))
        await waitFor((): void => {
            expect(
                screen.getByText(/Generation blocked: Date range is required\./),
            ).not.toBeNull()
        })
    })

    it("блокирует preview когда start date после end date", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.clear(screen.getByLabelText("Report date range start"))
        await user.type(screen.getByLabelText("Report date range start"), "2026-03-01")
        await user.clear(screen.getByLabelText("Report date range end"))
        await user.type(screen.getByLabelText("Report date range end"), "2026-01-01")

        await user.click(screen.getByRole("button", { name: "Preview report" }))
        await waitFor((): void => {
            expect(
                screen.getByText(/Preview blocked: Start date cannot be after end date\./),
            ).not.toBeNull()
        })
    })

    it("блокирует generation когда start date после end date", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.clear(screen.getByLabelText("Report date range start"))
        await user.type(screen.getByLabelText("Report date range start"), "2026-03-01")
        await user.clear(screen.getByLabelText("Report date range end"))
        await user.type(screen.getByLabelText("Report date range end"), "2026-01-01")

        await user.click(screen.getByRole("button", { name: "Generate report" }))
        await waitFor((): void => {
            expect(
                screen.getByText(
                    /Generation blocked: Start date cannot be after end date\./,
                ),
            ).not.toBeNull()
        })
    })

    it("блокирует preview когда не выбраны секции", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.click(screen.getByLabelText("Report section executive-summary"))
        await user.click(screen.getByLabelText("Report section risk-hotspots"))

        await user.click(screen.getByRole("button", { name: "Preview report" }))
        await waitFor((): void => {
            expect(
                screen.getByText(
                    /Preview blocked: select at least one report section\./,
                ),
            ).not.toBeNull()
        })
    })

    it("блокирует generation когда не выбраны секции", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.click(screen.getByLabelText("Report section executive-summary"))
        await user.click(screen.getByLabelText("Report section risk-hotspots"))

        await user.click(screen.getByRole("button", { name: "Generate report" }))
        await waitFor((): void => {
            expect(
                screen.getByText(
                    /Generation blocked: select at least one report section\./,
                ),
            ).not.toBeNull()
        })
    })

    it("показывает warning когда все секции сняты", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.click(screen.getByLabelText("Report section executive-summary"))
        await user.click(screen.getByLabelText("Report section risk-hotspots"))

        expect(
            screen.getByText("Select at least one section to build preview."),
        ).not.toBeNull()
    })

    it("toggle section добавляет и удаляет секцию из selected list", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        const sectionsList = screen.getByRole("list", { name: "Selected report sections" })
        expect(within(sectionsList).getByText("Executive summary")).not.toBeNull()
        expect(within(sectionsList).getByText("Risk hotspots")).not.toBeNull()
        expect(within(sectionsList).queryByText("Architecture drift")).toBeNull()

        await user.click(screen.getByLabelText("Report section architecture-drift"))
        expect(within(sectionsList).getByText("Architecture drift")).not.toBeNull()

        await user.click(screen.getByLabelText("Report section architecture-drift"))
        expect(within(sectionsList).queryByText("Architecture drift")).toBeNull()
    })

    it("переключает report type на quality", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.selectOptions(screen.getByLabelText("Report type"), "quality")

        await user.click(screen.getByRole("button", { name: "Preview report" }))
        await waitFor((): void => {
            expect(screen.getByText(/Preview ready: quality report/)).not.toBeNull()
        })
    })

    it("переключает report format на png", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.selectOptions(screen.getByLabelText("Report format"), "png")

        const payload = screen.getByLabelText("Report preview payload")
        expect(payload.textContent).toContain('"format": "png"')
    })

    it("показывает начальное состояние preview и generation статусов", async (): Promise<void> => {
        renderWithProviders(<ReportGeneratorPage />)

        expect(screen.getByText("No preview generated yet.")).not.toBeNull()
        expect(screen.getByText("No report generated yet.")).not.toBeNull()
    })

    it("рендерит report schedule dialog и template editor компоненты", async (): Promise<void> => {
        renderWithProviders(<ReportGeneratorPage />)

        expect(screen.getByText("Report schedule")).not.toBeNull()
        expect(screen.getByText("Report template editor")).not.toBeNull()
    })

    it("report schedule dialog открывается, настраивается и сохраняется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.click(screen.getByRole("button", { name: "Open schedule dialog" }))

        const dialog = screen.getByRole("dialog", { name: "Report schedule dialog" })
        expect(dialog).not.toBeNull()

        await user.clear(within(dialog).getByLabelText("Schedule recipients"))
        await user.type(
            within(dialog).getByLabelText("Schedule recipients"),
            "dev@codenautic.app",
        )

        await user.selectOptions(within(dialog).getByLabelText("Schedule format"), "html")

        const previewText = within(dialog).getByLabelText("Schedule preview value")
        expect(previewText.textContent).toContain("dev@codenautic.app")
        expect(previewText.textContent).toContain("HTML")

        await user.click(within(dialog).getByRole("button", { name: "Save schedule" }))
        expect(screen.getByText(/Scheduled delivery saved \(HTML\)/)).not.toBeNull()

        await user.click(within(dialog).getByRole("button", { name: "Close dialog" }))
        expect(screen.queryByRole("dialog", { name: "Report schedule dialog" })).toBeNull()
    })

    it("report template editor позволяет toggle секций и save", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        const templateSections = screen.getByRole("list", { name: "Template sections list" })
        expect(within(templateSections).getByText("Executive summary")).not.toBeNull()

        await user.click(
            screen.getByLabelText("Template section enabled executive-summary"),
        )

        const previewSummary = screen.getByLabelText("Template preview summary")
        expect(previewSummary.textContent).not.toContain("Executive summary")

        await user.click(screen.getByRole("button", { name: "Save template" }))
        expect(screen.getByText(/Template saved: .* with 3 enabled sections\./)).not.toBeNull()
    })

    it("template editor reorder секций через move up/down кнопки", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        await user.click(
            screen.getByRole("button", { name: "Move down section executive-summary" }),
        )

        const previewSummary = screen.getByLabelText("Template preview summary")
        expect(previewSummary.textContent).toContain("Architecture signals -> Executive summary")

        await user.click(
            screen.getByRole("button", { name: "Move up section executive-summary" }),
        )
        expect(previewSummary.textContent).toContain("Executive summary -> Architecture signals")
    })
})
