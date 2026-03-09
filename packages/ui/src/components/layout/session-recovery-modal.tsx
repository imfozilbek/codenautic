import { type ReactElement } from "react"

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui"

/**
 * Свойства модального окна восстановления сессии.
 */
export interface ISessionRecoveryModalProps {
    /** Открыто ли модальное окно. */
    readonly isOpen: boolean
    /** Callback при изменении состояния открытия. */
    readonly onOpenChange: (isOpen: boolean) => void
    /** HTTP-код ошибки аутентификации. */
    readonly failureCode: 401 | 419
    /** Callback повторной аутентификации. */
    readonly onReAuthenticate: () => void
}

/**
 * Модальное окно при истечении сессии с предложением re-auth.
 *
 * @param props Конфигурация модала.
 * @returns Модальное окно восстановления сессии.
 */
export function SessionRecoveryModal(props: ISessionRecoveryModalProps): ReactElement {
    return (
        <Modal isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
            <ModalContent>
                <ModalHeader>Session expired</ModalHeader>
                <ModalBody>
                    <p className="text-sm text-text-tertiary">
                        Authentication failed with {props.failureCode}. Re-authentication is
                        required to continue safely.
                    </p>
                    <p className="text-xs text-text-secondary">
                        Drafts and pending intent were autosaved and will be restored after
                        successful sign-in.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="flat"
                        onPress={(): void => {
                            props.onOpenChange(false)
                        }}
                    >
                        Later
                    </Button>
                    <Button color="primary" onPress={props.onReAuthenticate}>
                        Re-authenticate
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
