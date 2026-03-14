import type { Meta, StoryObj } from "@storybook/react"

import { Button, Input } from "@heroui/react"
import { FormSection } from "./form-section"
import { FormGroup } from "./form-group"
import { FormLayout } from "./form-layout"

const meta: Meta<typeof FormLayout> = {
    title: "Forms/FormLayout",
    component: FormLayout,
}

export default meta

type TStory = StoryObj<typeof FormLayout>

export const Complete: TStory = {
    args: {
        title: "Code Review Settings",
        description: "Configure the automated review pipeline for your repositories.",
        actions: (
            <>
                <Button variant="primary">Save changes</Button>
                <Button variant="secondary">Cancel</Button>
            </>
        ),
        children: (
            <>
                <FormSection heading="General" description="Basic review configuration.">
                    <FormGroup withDivider>
                        <Input aria-label="Max suggestions per CCR" placeholder="10" />
                        <Input aria-label="Review timeout (ms)" placeholder="30000" />
                    </FormGroup>
                </FormSection>
                <FormSection heading="Notifications">
                    <Input aria-label="Slack channel" placeholder="#code-reviews" />
                </FormSection>
            </>
        ),
    },
}
