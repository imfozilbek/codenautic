import { type Meta, type StoryObj } from "@storybook/react"
import type { ReactElement } from "react"

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "./table"

const rows = [
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

const meta = {
    title: "Base/Table",
    component: Table,
    tags: ["autodocs"],
} satisfies Meta<typeof Table>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
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
