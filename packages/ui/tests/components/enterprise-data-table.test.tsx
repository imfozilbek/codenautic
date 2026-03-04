import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

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

describe("EnterpriseDataTable", (): void => {
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
})
