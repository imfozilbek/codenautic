import { type ReactElement } from "react"

import type { IShortcutDescriptor } from "@/lib/keyboard/shortcut-registry"
import { Modal, ModalBody, ModalContent, ModalHeader } from "@/components/ui"

/**
 * Свойства модального окна помощи по keyboard shortcuts.
 */
export interface IShortcutsHelpModalProps {
    /** Открыто ли модальное окно. */
    readonly isOpen: boolean
    /** Callback при изменении состояния открытия. */
    readonly onOpenChange: (isOpen: boolean) => void
    /** Текущий поисковый запрос. */
    readonly query: string
    /** Callback при изменении поискового запроса. */
    readonly onQueryChange: (query: string) => void
    /** Отфильтрованные shortcuts для отображения. */
    readonly shortcuts: ReadonlyArray<IShortcutDescriptor>
}

/**
 * Модальное окно со списком keyboard shortcuts, поиском и фильтрацией.
 *
 * @param props Конфигурация модала.
 * @returns Модальное окно keyboard shortcuts.
 */
export function ShortcutsHelpModal(props: IShortcutsHelpModalProps): ReactElement {
    return (
        <Modal
            isOpen={props.isOpen}
            onOpenChange={(nextOpenState): void => {
                props.onOpenChange(nextOpenState)
                if (nextOpenState !== true) {
                    props.onQueryChange("")
                }
            }}
        >
            <ModalContent>
                <ModalHeader>Keyboard shortcuts</ModalHeader>
                <ModalBody>
                    <input
                        aria-label="Search shortcuts"
                        className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                        placeholder="Search by key or action"
                        type="text"
                        value={props.query}
                        onChange={(event): void => {
                            props.onQueryChange(event.currentTarget.value)
                        }}
                    />
                    <p className="text-xs text-text-subtle">Press ? for help.</p>
                    <ul
                        aria-label="Shortcuts list"
                        className="max-h-72 space-y-2 overflow-y-auto"
                    >
                        {props.shortcuts.map(
                            (shortcut): ReactElement => (
                                <li
                                    key={shortcut.id}
                                    className="flex items-center justify-between rounded-md border border-border px-2 py-1"
                                >
                                    <span className="text-sm text-foreground">
                                        {shortcut.label}
                                    </span>
                                    <span className="flex items-center gap-2 text-xs text-text-secondary">
                                        <span className="rounded border border-border px-2 py-0.5">
                                            {shortcut.scope}
                                        </span>
                                        <span className="rounded border border-border px-2 py-0.5">
                                            {shortcut.keys}
                                        </span>
                                    </span>
                                </li>
                            ),
                        )}
                    </ul>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
}
