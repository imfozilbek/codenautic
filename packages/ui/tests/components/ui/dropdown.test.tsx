import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/dropdown"
import { renderWithProviders } from "../../utils/render"

describe("Dropdown", (): void => {
    it("when rendered, then displays trigger button", (): void => {
        renderWithProviders(
            <Dropdown>
                <DropdownTrigger>
                    <span>Open menu</span>
                </DropdownTrigger>
                <DropdownMenu aria-label="Actions">
                    <DropdownItem id="edit">Edit</DropdownItem>
                    <DropdownItem id="delete">Delete</DropdownItem>
                </DropdownMenu>
            </Dropdown>,
        )

        expect(screen.getByRole("button")).not.toBeNull()
    })

    it("when trigger is clicked, then opens the menu", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Dropdown>
                <DropdownTrigger>
                    <span>Actions</span>
                </DropdownTrigger>
                <DropdownMenu aria-label="User actions">
                    <DropdownItem id="profile">Profile</DropdownItem>
                    <DropdownItem id="settings">Settings</DropdownItem>
                </DropdownMenu>
            </Dropdown>,
        )

        await user.click(screen.getByRole("button"))
        expect(screen.getByRole("menu")).not.toBeNull()
    })

    it("when DropdownItem has color danger, then applies danger class", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Dropdown>
                <DropdownTrigger>
                    <span>Menu</span>
                </DropdownTrigger>
                <DropdownMenu aria-label="Danger menu">
                    <DropdownItem id="remove" color="danger">
                        Remove
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>,
        )

        await user.click(screen.getByRole("button"))
        const menuItem = screen.getByRole("menuitem", { name: "Remove" })
        expect(menuItem.className).toContain("text-danger")
    })

    it("when DropdownTrigger has isDisabled, then trigger is disabled", (): void => {
        renderWithProviders(
            <Dropdown>
                <DropdownTrigger isDisabled>
                    <span>Disabled</span>
                </DropdownTrigger>
                <DropdownMenu aria-label="Disabled menu">
                    <DropdownItem id="item">Item</DropdownItem>
                </DropdownMenu>
            </Dropdown>,
        )

        expect(screen.getByRole("button")).toBeDisabled()
    })
})
