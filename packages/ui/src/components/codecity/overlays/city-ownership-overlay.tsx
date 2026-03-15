import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Avatar as HeroUIAvatar, AvatarFallback, AvatarImage } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
        isActive ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-border",
    ].join(" ")
}

/**
 * Ownership overlay для CodeCity: легенда владельцев и управление раскраской.
 *
 * @param props Набор владельцев и обработчики управления.
 * @returns React-компонент ownership overlay.
 */
export function CityOwnershipOverlay(props: ICityOwnershipOverlayProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const toggleButtonLabel = props.isEnabled
        ? t("code-city:cityOwnership.disableColors")
        : t("code-city:cityOwnership.enableColors")

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className={TYPOGRAPHY.cardTitle}>{t("code-city:cityOwnership.title")}</p>
                    <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                        {t("code-city:cityOwnership.description")}
                    </p>
                </div>
                <button
                    aria-label={toggleButtonLabel}
                    aria-pressed={props.isEnabled}
                    className="rounded-md border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:border-accent"
                    type="button"
                    onClick={(): void => {
                        props.onToggleEnabled?.(props.isEnabled === false)
                    }}
                >
                    {toggleButtonLabel}
                </button>
            </div>

            <ul
                aria-label={t("code-city:cityOwnership.ariaLabelLegend")}
                className="mt-3 grid gap-2 sm:grid-cols-2"
            >
                {props.owners.map((owner): ReactElement => {
                    const isActive = props.activeOwnerId === owner.ownerId
                    const fileCount = owner.fileIds.length

                    return (
                        <li key={owner.ownerId}>
                            <button
                                aria-label={t("code-city:cityOwnership.ariaLabelFocus", {
                                    ownerName: owner.ownerName,
                                })}
                                className={resolveOwnerItemClassName(isActive)}
                                type="button"
                                onClick={(): void => {
                                    props.onSelectOwner?.(owner)
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <HeroUIAvatar className="h-7 w-7 shrink-0 bg-surface-secondary text-xs text-foreground">
                                        {owner.ownerAvatarUrl !== undefined ? (
                                            <AvatarImage
                                                src={owner.ownerAvatarUrl}
                                                alt={owner.ownerName}
                                            />
                                        ) : null}
                                        <AvatarFallback>
                                            {owner.ownerName.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </HeroUIAvatar>
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate ${TYPOGRAPHY.cardTitle}`}>
                                            {owner.ownerName}
                                        </p>
                                        <p className={TYPOGRAPHY.captionMuted}>
                                            {t("code-city:cityOwnership.files", {
                                                count: fileCount,
                                            })}
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
