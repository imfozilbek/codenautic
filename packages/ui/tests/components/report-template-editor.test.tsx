import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ReportTemplateEditor } from "@/components/reports/report-template-editor"
import { renderWithProviders } from "../utils/render"

describe("ReportTemplateEditor", (): void => {
    it("редактирует template branding/sections и сохраняет конфигурацию", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        await user.clear(screen.getByLabelText("Template name"))
        await user.type(screen.getByLabelText("Template name"), "Leadership weekly digest")
        await user.clear(screen.getByLabelText("Template brand logo"))
        await user.type(
            screen.getByLabelText("Template brand logo"),
            "https://cdn.codenautic.app/lead.svg",
        )
        fireEvent.change(screen.getByLabelText("Template accent color"), {
            target: { value: "#0f766e" },
        })

        await user.click(
            screen.getByRole("button", { name: "Move down section executive-summary" }),
        )
        await user.click(
            screen.getByRole("checkbox", { name: "Template section enabled risks-and-actions" }),
        )

        expect(screen.getByLabelText("Template preview summary").textContent).toContain(
            "Leadership weekly digest",
        )
        expect(screen.getByLabelText("Template preview summary").textContent).toContain(
            "https://cdn.codenautic.app/lead.svg",
        )
        expect(screen.getByLabelText("Template preview summary").textContent).toContain("#0f766e")

        await user.click(screen.getByRole("button", { name: "Save template" }))
        await waitFor(() => {
            expect(screen.getByText(/Template saved: Leadership weekly digest/)).not.toBeNull()
        })
    })

    it("when move up нажат на секции, then секция перемещается вверх", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        const sectionsList = screen.getByRole("list", { name: "Template sections list" })
        const initialItems = sectionsList.querySelectorAll("li")
        const secondSectionTitle = initialItems[1]?.textContent ?? ""
        expect(secondSectionTitle).toContain("Architecture signals")

        await user.click(
            screen.getByRole("button", { name: "Move up section architecture-signals" }),
        )

        const updatedItems = sectionsList.querySelectorAll("li")
        const firstSectionTitle = updatedItems[0]?.textContent ?? ""
        expect(firstSectionTitle).toContain("Architecture signals")
    })

    it("when move up нажат на первой секции, then порядок не меняется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        const sectionsList = screen.getByRole("list", { name: "Template sections list" })

        await user.click(
            screen.getByRole("button", { name: "Move up section executive-summary" }),
        )

        const items = sectionsList.querySelectorAll("li")
        const firstSectionTitle = items[0]?.textContent ?? ""
        expect(firstSectionTitle).toContain("Executive summary")
    })

    it("when move down нажат на последней секции, then порядок не меняется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        const sectionsList = screen.getByRole("list", { name: "Template sections list" })

        await user.click(
            screen.getByRole("button", { name: "Move down section risks-and-actions" }),
        )

        const items = sectionsList.querySelectorAll("li")
        const lastSectionTitle = items[items.length - 1]?.textContent ?? ""
        expect(lastSectionTitle).toContain("Risks and actions")
    })

    it("when секция выключена, then preview не содержит её название", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        await user.click(
            screen.getByRole("checkbox", {
                name: "Template section enabled architecture-signals",
            }),
        )

        const preview = screen.getByLabelText("Template preview summary").textContent ?? ""
        expect(preview).not.toContain("Architecture signals")
        expect(preview).toContain("Executive summary")
    })

    it("when секция включена обратно, then preview снова содержит её название", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        const checkbox = screen.getByRole("checkbox", {
            name: "Template section enabled delivery-signals",
        })

        await user.click(checkbox)
        let preview = screen.getByLabelText("Template preview summary").textContent ?? ""
        expect(preview).not.toContain("Delivery signals")

        await user.click(checkbox)
        preview = screen.getByLabelText("Template preview summary").textContent ?? ""
        expect(preview).toContain("Delivery signals")
    })

    it("when drag and drop выполнен, then секции переупорядочиваются", async (): Promise<void> => {
        renderWithProviders(<ReportTemplateEditor />)

        const sectionsList = screen.getByRole("list", { name: "Template sections list" })
        const items = sectionsList.querySelectorAll("li")
        const firstItem = items[0]
        const thirdItem = items[2]

        if (firstItem !== undefined && thirdItem !== undefined) {
            fireEvent.dragStart(firstItem, {
                dataTransfer: {
                    effectAllowed: "move",
                    setData: (): void => {
                        return undefined
                    },
                    getData: (): string => "executive-summary",
                },
            })

            fireEvent.dragOver(thirdItem, {
                dataTransfer: {
                    effectAllowed: "move",
                },
            })

            fireEvent.drop(thirdItem, {
                dataTransfer: {
                    effectAllowed: "move",
                    getData: (): string => "executive-summary",
                },
            })

            const updatedItems = sectionsList.querySelectorAll("li")
            const firstUpdatedTitle = updatedItems[0]?.textContent ?? ""
            expect(firstUpdatedTitle).toContain("Architecture signals")
        }
    })

    it("when drop с пустым id, then секции не переупорядочиваются", async (): Promise<void> => {
        renderWithProviders(<ReportTemplateEditor />)

        const sectionsList = screen.getByRole("list", { name: "Template sections list" })
        const items = sectionsList.querySelectorAll("li")
        const thirdItem = items[2]

        if (thirdItem !== undefined) {
            fireEvent.drop(thirdItem, {
                dataTransfer: {
                    effectAllowed: "move",
                    getData: (): string => "",
                },
            })

            const updatedItems = sectionsList.querySelectorAll("li")
            const firstUpdatedTitle = updatedItems[0]?.textContent ?? ""
            expect(firstUpdatedTitle).toContain("Executive summary")
        }
    })

    it("when все секции выключены, then preview показывает пустую цепочку секций", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        await user.click(
            screen.getByRole("checkbox", {
                name: "Template section enabled executive-summary",
            }),
        )
        await user.click(
            screen.getByRole("checkbox", {
                name: "Template section enabled architecture-signals",
            }),
        )
        await user.click(
            screen.getByRole("checkbox", {
                name: "Template section enabled delivery-signals",
            }),
        )
        await user.click(
            screen.getByRole("checkbox", {
                name: "Template section enabled risks-and-actions",
            }),
        )

        const preview = screen.getByLabelText("Template preview summary").textContent ?? ""
        expect(preview).toContain("Sections:")
        expect(preview).not.toContain("Executive summary")
        expect(preview).not.toContain("Architecture signals")
    })

    it("when начальное состояние, then отображает статус no changes", (): void => {
        renderWithProviders(<ReportTemplateEditor />)

        expect(screen.queryByText("No template changes saved yet.")).not.toBeNull()
    })

    it("when save нажат, then статус обновляется с количеством enabled секций", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        await user.click(screen.getByRole("button", { name: "Save template" }))

        await waitFor((): void => {
            expect(
                screen.getByText(/Template saved: Weekly engineering report with 4 enabled sections/),
            ).not.toBeNull()
        })
    })
})
