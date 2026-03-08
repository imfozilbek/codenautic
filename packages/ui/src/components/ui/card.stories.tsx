import type { Meta, StoryObj } from "@storybook/react"

import { Card, CardBody, CardFooter, CardHeader } from "./card"

const meta = {
    title: "Base/Card",
    component: Card,
    tags: ["autodocs"],
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    render: () => (
        <Card className="max-w-md">
            <CardHeader>
                <p className="text-sm font-semibold">CodeNautic</p>
            </CardHeader>
            <CardBody>
                <p className="text-sm text-muted-foreground">
                    Инструментальные карточки для мониторинга пайплайна ревью.
                </p>
            </CardBody>
            <CardFooter>
                <p className="text-xs text-muted-foreground">Updated 2 min ago</p>
            </CardFooter>
        </Card>
    ),
}
