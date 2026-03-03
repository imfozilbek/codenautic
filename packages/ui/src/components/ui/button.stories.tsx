import type {Meta, StoryObj} from "@storybook/react"

import {Button} from "./button"

const meta = {
    title: "Base/Button",
    component: Button,
    tags: ["autodocs"],
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {
    args: {
        children: "Primary",
        color: "primary",
        variant: "solid",
    },
}

export const Secondary: Story = {
    args: {
        children: "Secondary",
        color: "secondary",
        variant: "flat",
    },
}

export const Disabled: Story = {
    args: {
        children: "Disabled",
        color: "primary",
        isDisabled: true,
    },
}
