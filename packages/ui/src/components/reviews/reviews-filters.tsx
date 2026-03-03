import type {ReactElement} from "react"

import {Button, Input, Select, SelectItem} from "@/components/ui"

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
    return (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
            <Input
                aria-label="Search CCR"
                placeholder="Search by repository or title"
                value={props.search}
                onValueChange={props.onSearchChange}
            />
            <Select
                aria-label="Filter by status"
                placeholder="All statuses"
                selectedKeys={new Set([props.status])}
                onSelectionChange={(keys): void => {
                    const [nextStatus] = Array.from(keys)
                    props.onStatusChange(typeof nextStatus === "string" ? nextStatus : "all")
                }}
            >
                <SelectItem key="all">All statuses</SelectItem>
                {props.statusOptions.map((status): ReactElement => (
                    <SelectItem key={status}>{status}</SelectItem>
                ))}
            </Select>
            <Select
                aria-label="Filter by assignee"
                placeholder="All assignees"
                selectedKeys={new Set([props.assignee])}
                onSelectionChange={(keys): void => {
                    const [nextAssignee] = Array.from(keys)
                    props.onAssigneeChange(typeof nextAssignee === "string" ? nextAssignee : "all")
                }}
            >
                <SelectItem key="all">All assignees</SelectItem>
                {props.assigneeOptions.map((assignee): ReactElement => (
                    <SelectItem key={assignee}>{assignee}</SelectItem>
                ))}
            </Select>
            <Button variant="flat" onPress={props.onReset}>
                Reset
            </Button>
        </div>
    )
}
