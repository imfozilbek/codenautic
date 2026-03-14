import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { renderWithProviders } from "../../utils/render"

describe("Modal", (): void => {
    it("when isOpen is true, then renders modal content", (): void => {
        renderWithProviders(
            <Modal isOpen>
                <ModalContent>
                    <ModalHeader>Title</ModalHeader>
                    <ModalBody>Body content</ModalBody>
                    <ModalFooter>Footer</ModalFooter>
                </ModalContent>
            </Modal>,
        )

        expect(screen.getByText("Title")).not.toBeNull()
        expect(screen.getByText("Body content")).not.toBeNull()
        expect(screen.getByText("Footer")).not.toBeNull()
    })

    it("when isOpen is false, then does not render content", (): void => {
        renderWithProviders(
            <Modal isOpen={false}>
                <ModalContent>
                    <ModalBody>Hidden</ModalBody>
                </ModalContent>
            </Modal>,
        )

        expect(screen.queryByText("Hidden")).toBeNull()
    })

    it("when ModalHeader is provided, then renders header text", (): void => {
        renderWithProviders(
            <Modal isOpen>
                <ModalContent>
                    <ModalHeader>My Header</ModalHeader>
                </ModalContent>
            </Modal>,
        )

        expect(screen.getByText("My Header")).not.toBeNull()
    })

    it("when ModalFooter is provided, then renders footer text", (): void => {
        renderWithProviders(
            <Modal isOpen>
                <ModalContent>
                    <ModalFooter>Action buttons</ModalFooter>
                </ModalContent>
            </Modal>,
        )

        expect(screen.getByText("Action buttons")).not.toBeNull()
    })
})
