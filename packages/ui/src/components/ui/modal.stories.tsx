import type {Meta, StoryObj} from "@storybook/react"
import {useState} from "react"

import {Button} from "@/components/ui"
import {Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from "./modal"

const meta = {
    title: "Base/Modal",
    component: Modal,
    tags: ["autodocs"],
} satisfies Meta<typeof Modal>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState<boolean>(true)

        return (
            <>
                <Modal
                    isOpen={isOpen}
                    onOpenChange={(nextOpen): void => {
                        if (nextOpen === false) {
                            setIsOpen(false)
                        }
                    }}
                >
                    <ModalContent>
                        <ModalHeader>Техническая подсказка</ModalHeader>
                        <ModalBody>
                            <p>Этот модал полезен для подтверждений и детальной информации.</p>
                        </ModalBody>
                        <ModalFooter>
                            <Button onPress={() => {
                                setIsOpen(false)
                            }}>
                                Закрыть
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </>
        )
    },
}
