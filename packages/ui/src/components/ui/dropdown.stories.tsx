import type { Meta, StoryObj } from "@storybook/react"
import { DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger } from "@heroui/react"
import { useState } from "react"

import { Button } from "@/components/ui"
import { Dropdown } from "./dropdown"

const meta = {
    title: "Base/Dropdown",
    component: Dropdown,
    tags: ["autodocs"],
} satisfies Meta<typeof Dropdown>

export default meta

type Story = StoryObj

export const Default: Story = {
    render: () => {
        const [label, setLabel] = useState<string>("Выберите action")

        return (
            <Dropdown>
                <DropdownTrigger>
                    <Button variant="flat">{label}</Button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label="Options"
                    onAction={(action): void => {
                        if (action === "audit" || action === "sync" || action === "settings") {
                            setLabel(`Выбрано: ${action}`)
                        }
                    }}
                >
                    <DropdownSection>
                        <DropdownItem key="audit">Run audit</DropdownItem>
                        <DropdownItem key="sync">Sync now</DropdownItem>
                    </DropdownSection>
                    <DropdownSection>
                        <DropdownItem key="settings">Open settings</DropdownItem>
                    </DropdownSection>
                </DropdownMenu>
            </Dropdown>
        )
    },
}
