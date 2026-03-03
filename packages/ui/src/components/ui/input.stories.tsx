import type {Meta, StoryObj} from "@storybook/react"
import type {ReactElement} from "react"
import {useState} from "react"

import {Input, Textarea} from "./"

const meta = {
    title: "Base/Inputs",
    component: Input,
    tags: ["autodocs"],
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

function TextFieldInputStory(): ReactElement {
    const [value, setValue] = useState("")

    return (
        <Input
            label="Workspace name"
            placeholder="example-app"
            value={value}
            onValueChange={setValue}
        />
    )
}

function TextAreaInputStory(): ReactElement {
    const [value, setValue] = useState("")

    return (
        <Textarea
            label="Comment"
            placeholder="Type notes here"
            value={value}
            onValueChange={setValue}
        />
    )
}

export const TextField: Story = {
    render: (): ReactElement => <TextFieldInputStory />,
}

export const TextAreaField: Story = {
    render: (): ReactElement => <TextAreaInputStory />,
}
