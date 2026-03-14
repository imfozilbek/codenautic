import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { type Key, Button, Chip, ListBox, ListBoxItem, Select, Slider, Tooltip } from "@heroui/react"

/**
 * Свойства карточки управления колонкой таблицы.
 */
export interface IColumnCardProps {
    /** Уникальный идентификатор колонки. */
    readonly columnId: string
    /** Заголовок колонки. */
    readonly header: string
    /** Индекс колонки в порядке отображения. */
    readonly index: number
    /** Общее количество колонок. */
    readonly totalColumns: number
    /** Видима ли колонка. */
    readonly isVisible: boolean
    /** Можно ли скрыть колонку. */
    readonly canHide: boolean
    /** Закреплена ли колонка и с какой стороны. */
    readonly pinnedSide: "left" | "right" | false
    /** Текущая ширина колонки в пикселях. */
    readonly currentWidth: number
    /** Callback переключения видимости. */
    readonly onToggleVisibility: () => void
    /** Callback перемещения колонки влево. */
    readonly onMoveLeft: () => void
    /** Callback перемещения колонки вправо. */
    readonly onMoveRight: () => void
    /** Callback изменения закрепления. */
    readonly onPinChange: (pin: "left" | "right" | false) => void
    /** Callback мгновенного изменения ширины (визуальный feedback). */
    readonly onWidthChange: (width: number) => void
    /** Callback завершения изменения ширины (commit). */
    readonly onWidthChangeEnd: (width: number) => void
}


/**
 * Карточка управления отдельной колонкой enterprise-таблицы.
 *
 * Содержит: toggle visibility, move left/right, pin select, width slider.
 * Использует HeroUI компоненты для accessibility и единого дизайна.
 *
 * @param props Свойства карточки колонки.
 * @returns Карточка с элементами управления колонкой.
 */
export function ColumnCard(props: IColumnCardProps): ReactElement {
    const { t } = useTranslation(["common"])

    const cardOpacity = props.isVisible ? "" : "opacity-50"
    const pinValue = props.pinnedSide === false ? "none" : props.pinnedSide

    return (
        <div className={`w-56 rounded-lg border border-border bg-surface px-3 py-2 ${cardOpacity}`}>
            <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em]">{props.header}</p>
                {props.isVisible === false ? (
                    <Chip size="sm" variant="soft">
                        {t("common:dataTable.columnHidden")}
                    </Chip>
                ) : null}
                {props.pinnedSide === "left" ? (
                    <Chip color="accent" size="sm" variant="soft">
                        {t("common:dataTable.columnPinnedLeft")}
                    </Chip>
                ) : null}
                {props.pinnedSide === "right" ? (
                    <Chip color="accent" size="sm" variant="soft">
                        {t("common:dataTable.columnPinnedRight")}
                    </Chip>
                ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
                {props.canHide ? (
                    <Button
                        aria-label={
                            props.isVisible
                                ? t("common:dataTable.hideColumnAriaLabel", {
                                      column: props.header,
                                  })
                                : t("common:dataTable.showColumnAriaLabel", {
                                      column: props.header,
                                  })
                        }
                        size="sm"
                        variant="secondary"
                        onPress={props.onToggleVisibility}
                    >
                        {props.isVisible ? t("common:dataTable.hide") : t("common:dataTable.show")}
                    </Button>
                ) : null}
                <Tooltip>
                    <Button
                        aria-label={t("common:dataTable.moveLeft")}
                        isDisabled={props.index === 0}
                        size="sm"
                        variant="secondary"
                        onPress={props.onMoveLeft}
                    >
                        ←
                    </Button>
                </Tooltip>
                <Tooltip>
                    <Button
                        aria-label={t("common:dataTable.moveRight")}
                        isDisabled={props.index === props.totalColumns - 1}
                        size="sm"
                        variant="secondary"
                        onPress={props.onMoveRight}
                    >
                        →
                    </Button>
                </Tooltip>
                <Select
                    aria-label={t("common:dataTable.pinColumnAriaLabel", { column: props.header })}
                    className="w-36"
                    selectedKey={pinValue}
                    onSelectionChange={(nextValue: Key | null): void => {
                        const value = String(nextValue)
                        if (value === "left" || value === "right") {
                            props.onPinChange(value)
                            return
                        }
                        props.onPinChange(false)
                    }}
                >
                    <Select.Trigger>
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Popover>
                        <ListBox>
                            <ListBoxItem id="none" textValue={t("common:dataTable.pinNone")}>{t("common:dataTable.pinNone")}</ListBoxItem>
                            <ListBoxItem id="left" textValue={t("common:dataTable.pinLeft")}>{t("common:dataTable.pinLeft")}</ListBoxItem>
                            <ListBoxItem id="right" textValue={t("common:dataTable.pinRight")}>{t("common:dataTable.pinRight")}</ListBoxItem>
                        </ListBox>
                    </Select.Popover>
                </Select>
            </div>
            <Slider
                aria-label={t("common:dataTable.columnWidth") + ` ${props.header}`}
                className="mt-2"
                maxValue={420}
                minValue={120}
                onChange={(value: number | number[]): void => {
                    const numericValue = Array.isArray(value) ? (value[0] ?? props.currentWidth) : value
                    props.onWidthChange(numericValue)
                }}
                onChangeEnd={(value: number | number[]): void => {
                    const numericValue = Array.isArray(value) ? (value[0] ?? props.currentWidth) : value
                    props.onWidthChangeEnd(numericValue)
                }}
                step={10}
                value={props.currentWidth}
            />
        </div>
    )
}
