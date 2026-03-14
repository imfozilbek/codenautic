import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { type Key, Button, Input, ListBox, ListBoxItem, Select } from "@heroui/react"

/**
 * Параметры поиска и фильтрации CCR.
 */
export interface IReviewsFiltersProps {
    /** Текущий поисковый запрос. */
    readonly search: string
    /** Выбранный статус. */
    readonly status: string
    /** Выбранный владелец. */
    readonly assignee: string
    /** Список доступных статусных фильтров. */
    readonly statusOptions: ReadonlyArray<string>
    /** Список доступных владельцев. */
    readonly assigneeOptions: ReadonlyArray<string>
    /** Изменение поиска. */
    readonly onSearchChange: (search: string) => void
    /** Изменение статуса. */
    readonly onStatusChange: (status: string) => void
    /** Изменение владельца. */
    readonly onAssigneeChange: (assignee: string) => void
    /** Сброс фильтров. */
    readonly onReset: () => void
}

/**
 * Форма фильтров списка CCR.
 *
 * @param props Конфигурация.
 * @returns Строка фильтров для таблицы.
 */
export function ReviewsFilters(props: IReviewsFiltersProps): ReactElement {
    const { t } = useTranslation(["reviews"])

    return (
        <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 md:grid-cols-4">
            <Input
                aria-label={t("reviews:filters.searchAriaLabel")}
                placeholder={t("reviews:filters.searchPlaceholder")}
                value={props.search}
                onChange={(event): void => {
                    props.onSearchChange(event.target.value)
                }}
            />
            <Select
                aria-label={t("reviews:filters.filterByStatus")}
                selectedKey={props.status}
                onSelectionChange={(key: Key | null): void => {
                    props.onStatusChange(String(key))
                }}
            >
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBoxItem id="all" textValue={t("reviews:filters.allStatuses")}>{t("reviews:filters.allStatuses")}</ListBoxItem>
                        {props.statusOptions.map(
                            (status): ReactElement => (
                                <ListBoxItem key={status} id={status} textValue={status}>
                                    {status}
                                </ListBoxItem>
                            ),
                        )}
                    </ListBox>
                </Select.Popover>
            </Select>
            <Select
                aria-label={t("reviews:filters.filterByAssignee")}
                selectedKey={props.assignee}
                onSelectionChange={(key: Key | null): void => {
                    props.onAssigneeChange(String(key))
                }}
            >
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBoxItem id="all" textValue={t("reviews:filters.allAssignees")}>{t("reviews:filters.allAssignees")}</ListBoxItem>
                        {props.assigneeOptions.map(
                            (assignee): ReactElement => (
                                <ListBoxItem key={assignee} id={assignee} textValue={assignee}>
                                    {assignee}
                                </ListBoxItem>
                            ),
                        )}
                    </ListBox>
                </Select.Popover>
            </Select>
            <Button variant="tertiary" onPress={props.onReset}>
                {t("reviews:filters.reset")}
            </Button>
        </div>
    )
}
