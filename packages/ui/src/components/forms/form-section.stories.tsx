import type { Meta, StoryObj } from "@storybook/react"

import { Input } from "@heroui/react"
import { FormSection } from "./form-section"

const meta: Meta<typeof FormSection> = {
    title: "Forms/FormSection",
    component: FormSection,
}

export default meta

type TStory = StoryObj<typeof FormSection>

export const WithDescription: TStory = {
    args: {
        heading: "Review Settings",
        description: "Configure how code reviews are processed and displayed.",
        children: (
            <div className="space-y-3">
                <Input aria-label="Max suggestions" placeholder="10" type="number" />
                <Input aria-label="Review timeout (ms)" placeholder="30000" type="number" />
            </div>
        ),
    },
}

export const WithoutDescription: TStory = {
    args: {
        heading: "Notifications",
        children: (
            <div className="space-y-3">
                <Input aria-label="Slack channel" placeholder="#code-reviews" />
            </div>
        ),
    },
}
