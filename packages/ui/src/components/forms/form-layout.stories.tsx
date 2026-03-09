import type { Meta, StoryObj } from "@storybook/react"

import { Button, Input } from "@/components/ui"
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
                <Button color="primary">Save changes</Button>
                <Button variant="flat">Cancel</Button>
            </>
        ),
        children: (
            <>
                <FormSection
                    heading="General"
                    description="Basic review configuration."
                >
                    <FormGroup withDivider>
                        <Input label="Max suggestions per CCR" placeholder="10" />
                        <Input label="Review timeout (ms)" placeholder="30000" />
                    </FormGroup>
                </FormSection>
                <FormSection heading="Notifications">
                    <Input label="Slack channel" placeholder="#code-reviews" />
                </FormSection>
            </>
        ),
    },
}
