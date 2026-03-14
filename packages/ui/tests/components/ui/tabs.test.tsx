import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Tabs } from "@/components/ui/tabs"
import { renderWithProviders } from "../../utils/render"

describe("Tabs", (): void => {
    it("when rendered with compound API, then displays tab list", (): void => {
        renderWithProviders(
            <Tabs aria-label="Navigation">
                <Tabs.List>
                    <Tabs.Tab id="first">First</Tabs.Tab>
                    <Tabs.Tab id="second">Second</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel id="first">Content 1</Tabs.Panel>
                <Tabs.Panel id="second">Content 2</Tabs.Panel>
            </Tabs>,
        )

        expect(screen.getByRole("tablist")).not.toBeNull()
        expect(screen.getByRole("tab", { name: "First" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "Second" })).not.toBeNull()
    })

    it("when a tab is clicked, then switches active tab panel", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Tabs aria-label="Sections">
                <Tabs.List>
                    <Tabs.Tab id="alpha">Alpha</Tabs.Tab>
                    <Tabs.Tab id="beta">Beta</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel id="alpha">Alpha content</Tabs.Panel>
                <Tabs.Panel id="beta">Beta content</Tabs.Panel>
            </Tabs>,
        )

        await user.click(screen.getByRole("tab", { name: "Beta" }))
        expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true")
    })

    it("when Tabs is re-exported, then is the HeroUI Tabs compound component", (): void => {
        expect(Tabs).not.toBeUndefined()
        expect(Tabs.Tab).not.toBeUndefined()
        expect(Tabs.List).not.toBeUndefined()
        expect(Tabs.Panel).not.toBeUndefined()
    })
})
