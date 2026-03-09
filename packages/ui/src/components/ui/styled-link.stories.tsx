import type { Meta, StoryObj } from "@storybook/react"

import { StyledLink } from "./styled-link"

const meta: Meta<typeof StyledLink> = {
    title: "UI/StyledLink",
    component: StyledLink,
}

export default meta

type TStory = StoryObj<typeof StyledLink>

export const Default: TStory = {
    args: {
        to: "/",
        children: "Go to dashboard",
    },
}

export const WithCustomClass: TStory = {
    args: {
        to: "/reviews",
        children: "View reviews",
        className: "text-primary hover:text-primary/80",
    },
}
