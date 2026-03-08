import type { ReactElement } from "react"

import { Avatar } from "@/components/ui"

/**
 * Владелец для ownership overlay.
 */
export interface ICityOwnershipOverlayOwnerEntry {
    /** Идентификатор владельца. */
    readonly ownerId: string
    /** Отображаемое имя владельца. */
    readonly ownerName: string
    /** Ссылка на аватар владельца. */
    readonly ownerAvatarUrl?: string
    /** Цвет владельца для раскраски зданий. */
    readonly color: string
    /** Список файлов, закрепленных за владельцем. */
    readonly fileIds: ReadonlyArray<string>
    /** Файл для быстрого фокуса в city. */
    readonly primaryFileId: string
}

/**
 * Пропсы ownership overlay.
 */
export interface ICityOwnershipOverlayProps {
    /** Набор владельцев для легенды. */
    readonly owners: ReadonlyArray<ICityOwnershipOverlayOwnerEntry>
    /** Флаг активности ownership раскраски. */
    readonly isEnabled: boolean
    /** Активный владелец для визуального выделения. */
    readonly activeOwnerId?: string
    /** Колбэк изменения активности ownership overlay. */
    readonly onToggleEnabled?: (nextEnabled: boolean) => void
    /** Колбэк выбора владельца. */
    readonly onSelectOwner?: (owner: ICityOwnershipOverlayOwnerEntry) => void
}

function resolveOwnerItemClassName(isActive: boolean): string {
    return [
        "w-full rounded-lg border p-2 text-left transition",
        isActive ? "border-cyan-400 bg-cyan-50" : "border-border bg-surface hover:border-border",
    ].join(" ")
}

/**
 * Ownership overlay для CodeCity: легенда владельцев и управление раскраской.
 *
 * @param props Набор владельцев и обработчики управления.
 * @returns React-компонент ownership overlay.
 */
export function CityOwnershipOverlay(props: ICityOwnershipOverlayProps): ReactElement {
    const toggleButtonLabel = props.isEnabled
        ? "Disable ownership colors"
        : "Enable ownership colors"

    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-foreground">Ownership overlay</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Buildings are colored by primary owner. Select contributor to focus files.
                    </p>
                </div>
                <button
                    aria-label={toggleButtonLabel}
                    aria-pressed={props.isEnabled}
                    className="rounded-md border border-cyan-300 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                    type="button"
                    onClick={(): void => {
                        props.onToggleEnabled?.(props.isEnabled === false)
                    }}
                >
                    {toggleButtonLabel}
                </button>
            </div>

            <ul aria-label="Ownership legend" className="mt-3 grid gap-2 sm:grid-cols-2">
                {props.owners.map((owner): ReactElement => {
                    const isActive = props.activeOwnerId === owner.ownerId
                    const fileCount = owner.fileIds.length

                    return (
                        <li key={owner.ownerId}>
                            <button
                                aria-label={`Focus ownership ${owner.ownerName}`}
                                className={resolveOwnerItemClassName(isActive)}
                                type="button"
                                onClick={(): void => {
                                    props.onSelectOwner?.(owner)
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar
                                        className="h-7 w-7 shrink-0 bg-surface-muted text-xs text-foreground"
                                        label={owner.ownerName}
                                        name={owner.ownerName}
                                        src={owner.ownerAvatarUrl}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {owner.ownerName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Files: {String(fileCount)}
                                        </p>
                                    </div>
                                    <span
                                        aria-hidden={true}
                                        className="inline-flex h-4 w-4 shrink-0 rounded-full border border-border"
                                        style={{ backgroundColor: owner.color }}
                                    />
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
