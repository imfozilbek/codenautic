import { type Meta, type StoryObj } from "@storybook/react"
import { useState } from "react"
import type { ReactElement } from "react"

import { Tab, Tabs } from "./tabs"

const meta = {
    title: "Base/Tabs",
    component: Tabs,
    tags: ["autodocs"],
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        children: "Dashboard tabs",
    },
    render: (): ReactElement => {
        const [selected, setSelected] = useState<string>("overview")

        return (
            <Tabs
                aria-label="Dashboard tabs"
                selectedKey={selected}
                onSelectionChange={(key): void => {
                    if (typeof key === "string") {
                        setSelected(key)
                    }
                }}
            >
                <Tab key="overview" title="Overview">
                    <p>Overview content</p>
                </Tab>
                <Tab key="issues" title="Issues">
                    <p>Open review issues</p>
                </Tab>
            </Tabs>
        )
    },
}
