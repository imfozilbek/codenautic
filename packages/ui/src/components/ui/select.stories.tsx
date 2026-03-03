import type { Meta, StoryObj } from "@storybook/react"
import type { ReactElement } from "react"
import { useState } from "react"

import { Select, SelectItem } from "./select"

const meta = {
    title: "Base/Select",
    component: Select,
    tags: ["autodocs"],
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

const providers = [
    {
        label: "OpenAI",
        value: "openai",
    },
    {
        label: "Anthropic",
        value: "anthropic",
    },
    {
        label: "Azure OpenAI",
        value: "azure",
    },
]

export const Default: Story = {
    render: (): ReactElement => <DefaultSelectStory />,
}

function DefaultSelectStory(): ReactElement {
    const [selected, setSelected] = useState<string>("openai")

    return (
        <Select
            placeholder="Select provider"
            selectionMode="single"
            selectedKeys={new Set([selected])}
            onSelectionChange={(keys): void => {
                if (keys instanceof Set === false) {
                    return
                }

                if (keys.size === 0) {
                    return
                }

                const next = [...keys][0]
                if (typeof next === "string") {
                    setSelected(next)
                }
            }}
        >
            {providers.map(
                (provider): ReactElement => (
                    <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                    </SelectItem>
                ),
            )}
        </Select>
    )
}
