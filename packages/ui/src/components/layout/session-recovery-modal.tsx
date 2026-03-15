import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Button, Modal } from "@heroui/react"

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
    const { t } = useTranslation(["navigation"])
    return (
        <Modal isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog>
                        <Modal.Header>{t("navigation:sessionRecovery.title")}</Modal.Header>
                        <Modal.Body>
                            <p className="text-sm text-muted">
                                Authentication failed with {props.failureCode}. Re-authentication is
                                required to continue safely.
                            </p>
                            <p className="text-xs text-muted">
                                Drafts and pending intent were autosaved and will be restored after
                                successful sign-in.
                            </p>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button
                                variant="secondary"
                                onPress={(): void => {
                                    props.onOpenChange(false)
                                }}
                            >
                                Later
                            </Button>
                            <Button variant="primary" onPress={props.onReAuthenticate}>
                                Re-authenticate
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    )
}
