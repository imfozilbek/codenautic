import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentType, type ReactElement } from "react"

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "./table"

const rows: ReadonlyArray<{
    /** Идентификатор строки. */
    readonly id: string
    /** Репозиторий. */
    readonly repository: string
    /** Кол-во открытых issue. */
    readonly issues: string
}> = [
    {
        id: "1",
        repository: "acme/web",
        issues: "12",
    },
    {
        id: "2",
        repository: "platform/backend",
        issues: "3",
    },
    {
        id: "4",
        repository: "mobile/clients",
        issues: "0",
    },
]

const storyComponent: ComponentType = Table

const meta: Meta = {
    title: "Base/Table",
    component: storyComponent,
    tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {},
    render: () => (
        <Table aria-label="Repositories overview">
            <TableHeader>
                <TableColumn>Repository</TableColumn>
                <TableColumn>Open issues</TableColumn>
            </TableHeader>
            <TableBody>
                {rows.map(
                    (item): ReactElement => (
                        <TableRow key={item.id}>
                            <TableCell>{item.repository}</TableCell>
                            <TableCell>{item.issues}</TableCell>
                        </TableRow>
                    ),
                )}
            </TableBody>
        </Table>
    ),
}
