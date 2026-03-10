import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EnterpriseDataTable } from "@/components/infrastructure/enterprise-data-table"
import { renderWithProviders } from "../utils/render"

interface ITestRow {
    readonly id: string
    readonly name: string
    readonly status: string
}

const TEST_ROWS: ReadonlyArray<ITestRow> = [
    { id: "A1", name: "alpha", status: "open" },
    { id: "B2", name: "beta", status: "closed" },
]

const MANY_ROWS: ReadonlyArray<ITestRow> = Array.from(
    { length: 140 },
    (_unusedValue, index): ITestRow => {
        const suffix = String(index + 1).padStart(3, "0")
        return {
            id: `ROW-${suffix}`,
            name: `row ${suffix}`,
            status: index % 2 === 0 ? "open" : "closed",
        }
    },
)

describe("EnterpriseDataTable", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("поддерживает selection, filtering и density controls", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Sample table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id", pin: "left" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                    { accessor: (row): string => row.status, header: "Status", id: "status" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="sample-table"
                rows={TEST_ROWS}
            />,
        )

        expect(screen.getByRole("table", { name: "Sample table" })).not.toBeNull()
        await user.click(screen.getByRole("checkbox", { name: "Sample table select all" }))
        expect(screen.getByText("2 selected")).not.toBeNull()

        await user.clear(screen.getByRole("textbox", { name: "Sample table search" }))
        await user.type(screen.getByRole("textbox", { name: "Sample table search" }), "beta")
        expect(screen.queryAllByText("alpha").length).toBe(0)
        expect(screen.queryAllByText("beta").length).toBeGreaterThan(0)

        await user.click(screen.getByRole("button", { name: "Compact" }))
    })

    it("сохраняет и сбрасывает view state", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Saved view table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id", pin: "left" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="saved-view-table"
                rows={TEST_ROWS}
            />,
        )

        await user.type(screen.getByRole("textbox", { name: "Saved view table search" }), "alpha")
        await user.click(screen.getByRole("button", { name: "Save view" }))
        expect(window.localStorage.getItem("ui.enterprise-table.saved-view-table")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Reset view" }))
        expect(screen.getByRole("textbox", { name: "Saved view table search" })).toHaveValue("")
    })

    it("рендерит виртуализованный body без вывода всех строк сразу", (): void => {
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Virtual table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id", pin: "left" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                    { accessor: (row): string => row.status, header: "Status", id: "status" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="virtual-table"
                rows={MANY_ROWS}
                virtualization={{
                    maxBodyHeight: 280,
                    overscan: 4,
                }}
            />,
        )

        const table = screen.getByRole("table", { name: "Virtual table" })
        expect(table).toHaveAttribute("data-virtualized", "true")

        const renderedRows = screen.getAllByRole("checkbox", {
            name: /Select ROW-/i,
        })
        expect(renderedRows.length).toBeGreaterThan(0)
        expect(renderedRows.length).toBeLessThan(MANY_ROWS.length)
    })

    it("поддерживает sticky header для виртуализованной таблицы", (): void => {
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Sticky table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id", pin: "left" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="sticky-table"
                rows={MANY_ROWS}
                stickyHeader={{
                    topOffset: 12,
                    withShadow: true,
                }}
                virtualization={{
                    maxBodyHeight: 240,
                    overscan: 4,
                }}
            />,
        )

        const rowGroups = screen.getAllByRole("rowgroup")
        const headerRowGroup = rowGroups.at(0)
        const bodyRowGroup = rowGroups.at(1)

        expect(headerRowGroup).not.toBeUndefined()
        expect(bodyRowGroup).not.toBeUndefined()

        if (headerRowGroup === undefined || bodyRowGroup === undefined) {
            return
        }

        expect(headerRowGroup).toHaveAttribute("data-sticky-header", "true")
        expect(headerRowGroup).toHaveStyle({ top: "12px" })
        expect(headerRowGroup).toHaveAttribute("data-sticky-shadow", "false")

        fireEvent.scroll(bodyRowGroup, { target: { scrollTop: 120 } })
        expect(headerRowGroup).toHaveAttribute("data-sticky-shadow", "true")
    })

    it("поддерживает кастомный row height estimator для virtual rows", (): void => {
        const estimateRowHeight =
            vi.fn<(row: ITestRow, density: "comfortable" | "compact") => number>()
        estimateRowHeight.mockImplementation((row, density): number => {
            if (density === "compact") {
                return row.status === "open" ? 48 : 44
            }

            return row.status === "open" ? 70 : 58
        })

        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Estimator table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                    { accessor: (row): string => row.status, header: "Status", id: "status" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="estimator-table"
                rows={MANY_ROWS}
                virtualization={{
                    maxBodyHeight: 320,
                    rowHeightEstimator: estimateRowHeight,
                }}
            />,
        )

        const table = screen.getByRole("table", { name: "Estimator table" })
        expect(table).toHaveAttribute("data-row-height-estimator", "custom")
        expect(estimateRowHeight).toHaveBeenCalled()
    })

    it("показывает empty state, когда rows пуст", (): void => {
        const emptyRows: ReadonlyArray<ITestRow> = []
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Empty table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No data available"
                getRowId={(row): string => row.id}
                id="empty-table"
                rows={emptyRows}
            />,
        )

        expect(screen.getByText("No data available")).not.toBeNull()
        expect(screen.queryAllByRole("checkbox", { name: /Select [A-Z]/ }).length).toBe(0)
    })

    it("переключает sorting при клике на column header", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Sort table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="sort-table"
                rows={TEST_ROWS}
            />,
        )

        const nameHeader = screen.getByRole("columnheader", { name: "Name" })
        await user.click(nameHeader)
        expect(nameHeader.textContent).toContain("↑")

        await user.click(nameHeader)
        expect(nameHeader.textContent).toContain("↓")

        await user.click(nameHeader)
        expect(nameHeader.textContent).not.toContain("↑")
        expect(nameHeader.textContent).not.toContain("↓")
    })

    it("переключает selection отдельных строк через checkbox", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Selection table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="selection-table"
                rows={TEST_ROWS}
            />,
        )

        const rowCheckbox = screen.getByRole("checkbox", { name: "Select A1" })
        await user.click(rowCheckbox)
        expect(screen.getByText("1 selected")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Clear selection" }))
        expect(screen.queryByText("1 selected")).toBeNull()
    })

    it("скрывает и показывает column через toggle visibility", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Visibility table"
                columns={[
                    {
                        accessor: (row): string => row.id,
                        header: "ID",
                        id: "id",
                        isHideable: true,
                    },
                    {
                        accessor: (row): string => row.name,
                        header: "Name",
                        id: "name",
                        isHideable: true,
                    },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="visibility-table"
                rows={TEST_ROWS}
            />,
        )

        const hideButtons = screen.getAllByRole("button", { name: "Hide" })
        expect(hideButtons.length).toBeGreaterThan(0)

        const firstHideButton = hideButtons[0]
        if (firstHideButton === undefined) {
            throw new Error("Expected hide button to exist")
        }
        await user.click(firstHideButton)
        expect(screen.getAllByRole("button", { name: "Show" }).length).toBeGreaterThan(0)
    })

    it("экспортирует CSV через Export CSV кнопку", async (): Promise<void> => {
        const user = userEvent.setup()
        const createObjectURLSpy = vi.fn((): string => "blob:mock-url")
        const revokeObjectURLSpy = vi.fn()

        vi.stubGlobal("URL", {
            ...URL,
            createObjectURL: createObjectURLSpy,
            revokeObjectURL: revokeObjectURLSpy,
        })

        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Export table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="export-table"
                rows={TEST_ROWS}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Export CSV" }))
        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)

        vi.unstubAllGlobals()
    })

    it("экспортирует JSON через Export JSON кнопку", async (): Promise<void> => {
        const user = userEvent.setup()
        const createObjectURLSpy = vi.fn((): string => "blob:mock-url")
        const revokeObjectURLSpy = vi.fn()

        vi.stubGlobal("URL", {
            ...URL,
            createObjectURL: createObjectURLSpy,
            revokeObjectURL: revokeObjectURLSpy,
        })

        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Export JSON table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="export-json-table"
                rows={TEST_ROWS}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Export JSON" }))
        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)

        vi.unstubAllGlobals()
    })

    it("восстанавливает saved view из localStorage при инициализации", (): void => {
        const savedView = {
            columnOrder: ["name", "id"],
            columnVisibility: { id: false },
            density: "compact",
            globalFilter: "beta",
        }
        window.localStorage.setItem("ui.enterprise-table.restored-table", JSON.stringify(savedView))

        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Restored table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="restored-table"
                rows={TEST_ROWS}
            />,
        )

        const searchInput = screen.getByRole("textbox", {
            name: "Restored table search",
        })
        expect(searchInput).toHaveValue("beta")

        window.localStorage.removeItem("ui.enterprise-table.restored-table")
    })

    it("обрабатывает невалидный JSON в localStorage без ошибки", (): void => {
        window.localStorage.setItem("ui.enterprise-table.corrupt-table", "not-json{{{")

        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Corrupt table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="corrupt-table"
                rows={TEST_ROWS}
            />,
        )

        expect(screen.getByRole("table", { name: "Corrupt table" })).not.toBeNull()

        window.localStorage.removeItem("ui.enterprise-table.corrupt-table")
    })

    it("переключает density с comfortable на compact и обратно", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Density table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="density-table"
                rows={TEST_ROWS}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Compact" }))
        await user.click(screen.getByRole("button", { name: "Comfortable" }))
        expect(screen.getByRole("table", { name: "Density table" })).not.toBeNull()
    })

    it("навигация по строкам клавишами ArrowDown и ArrowUp", async (): Promise<void> => {
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Keyboard nav table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="keyboard-nav-table"
                rows={TEST_ROWS}
            />,
        )

        const rows = screen.getAllByRole("row")
        const dataRow = rows.find((row): boolean => row.getAttribute("tabindex") === "0")
        expect(dataRow).not.toBeUndefined()

        if (dataRow !== undefined) {
            fireEvent.keyDown(dataRow, { key: "ArrowDown" })
            fireEvent.keyDown(dataRow, { key: "ArrowUp" })
        }
    })

    it("использует кастомный cell рендер, когда задан", (): void => {
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Custom cell table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    {
                        accessor: (row): string => row.name,
                        cell: (row): string => `Custom: ${row.name}`,
                        header: "Name",
                        id: "name",
                    },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="custom-cell-table"
                rows={TEST_ROWS}
            />,
        )

        expect(screen.getByText("Custom: alpha")).not.toBeNull()
        expect(screen.getByText("Custom: beta")).not.toBeNull()
    })

    it("изменяет pin колонки через select", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Pin table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="pin-table"
                rows={TEST_ROWS}
            />,
        )

        const pinSelect = screen.getByLabelText("Pin id")
        await user.selectOptions(pinSelect, "left")
        expect((pinSelect as HTMLSelectElement).value).toBe("left")

        await user.selectOptions(pinSelect, "none")
        expect((pinSelect as HTMLSelectElement).value).toBe("none")
    })

    it("изменяет ширину колонки через range input", async (): Promise<void> => {
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Resize table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id", size: 200 },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="resize-table"
                rows={TEST_ROWS}
            />,
        )

        const widthSlider = screen.getByLabelText("Width id")
        fireEvent.change(widthSlider, { target: { value: "250" } })
        expect(widthSlider).toHaveValue("250")
    })

    it("реордерит колонки через стрелочные кнопки", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <EnterpriseDataTable
                ariaLabel="Reorder table"
                columns={[
                    { accessor: (row): string => row.id, header: "ID", id: "id" },
                    { accessor: (row): string => row.name, header: "Name", id: "name" },
                    { accessor: (row): string => row.status, header: "Status", id: "status" },
                ]}
                emptyMessage="No rows"
                getRowId={(row): string => row.id}
                id="reorder-table"
                rows={TEST_ROWS}
            />,
        )

        const moveRightButtons = screen.getAllByRole("button", { name: "→" })
        const firstMoveRight = moveRightButtons[0]
        if (firstMoveRight !== undefined) {
            await user.click(firstMoveRight)
        }

        const moveLeftButtons = screen.getAllByRole("button", { name: "←" })
        const secondMoveLeft = moveLeftButtons[1]
        if (secondMoveLeft !== undefined) {
            await user.click(secondMoveLeft)
        }
    })
})
