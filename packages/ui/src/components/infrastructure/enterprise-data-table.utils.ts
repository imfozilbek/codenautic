/**
 * Pure utility functions for the EnterpriseDataTable component.
 * No hooks, no JSX — only data transformations and side-effect helpers.
 */
import { type ReactElement } from "react"

import {
    type ColumnDef,
    type ColumnPinningState,
    type ColumnSizingState,
    type VisibilityState,
} from "@tanstack/react-table"

import {
    getWindowLocalStorage,
    safeStorageGetJson,
    safeStorageSetJson,
} from "@/lib/utils/safe-storage"

import {
    DEFAULT_COLUMN_SIZE,
    DEFAULT_DENSITY,
    STORAGE_KEY_PREFIX,
} from "./enterprise-data-table.constants"

/**
 * Density mode type for the enterprise data table.
 */
export type TDensity = "comfortable" | "compact"

/**
 * Column descriptor for EnterpriseDataTable.
 */
export interface IEnterpriseDataTableColumn<TRow> {
    /** Уникальный идентификатор колонки. */
    readonly id: string
    /** Заголовок колонки. */
    readonly header: string
    /** Доступ к ячейке как plain value для фильтрации/экспорта. */
    readonly accessor: (row: TRow) => string | number
    /** Кастомный рендер ячейки. */
    readonly cell?: (row: TRow) => ReactElement | string | number
    /** Ширина колонки. */
    readonly size?: number
    /** Можно ли скрыть колонку. */
    readonly isHideable?: boolean
    /** Участвует ли колонка в global search. */
    readonly enableGlobalFilter?: boolean
    /** Начальный pin колонки. */
    readonly pin?: "left" | "right"
}

/**
 * Persisted view state for an EnterpriseDataTable instance.
 */
export interface IEnterpriseTableSavedView {
    /** Visibility колонок. */
    readonly columnVisibility: VisibilityState
    /** Порядок колонок. */
    readonly columnOrder: ReadonlyArray<string>
    /** Density режима таблицы. */
    readonly density: TDensity
    /** Значение global filter. */
    readonly globalFilter: string
    /** Закрепление колонок. */
    readonly columnPinning: ColumnPinningState
    /** Ширины колонок. */
    readonly columnSizing: ColumnSizingState
}

/**
 * Builds the localStorage key for the given table id.
 *
 * @param tableId - Unique table identifier.
 * @returns Full localStorage key string.
 */
export function getStorageKey(tableId: string): string {
    return `${STORAGE_KEY_PREFIX}${tableId}`
}

/**
 * Парсит ColumnPinningState из сохранённых данных.
 *
 * @param value - Сырые данные из localStorage.
 * @returns Валидный ColumnPinningState или пустой default.
 */
export function parseSavedColumnPinning(value: unknown): ColumnPinningState {
    if (typeof value !== "object" || value === null) {
        return { left: [], right: [] }
    }
    const record = value as Record<string, unknown>
    return {
        left: Array.isArray(record["left"]) ? (record["left"] as string[]) : [],
        right: Array.isArray(record["right"]) ? (record["right"] as string[]) : [],
    }
}

/**
 * Парсит ColumnSizingState из сохранённых данных.
 *
 * @param value - Сырые данные из localStorage.
 * @returns Валидный ColumnSizingState или пустой default.
 */
export function parseSavedColumnSizing(value: unknown): ColumnSizingState {
    if (typeof value !== "object" || value === null) {
        return {}
    }
    return value as ColumnSizingState
}

/**
 * Creates the empty (default) saved view state.
 *
 * @returns An IEnterpriseTableSavedView with all fields set to defaults.
 */
function createEmptySavedView(): IEnterpriseTableSavedView {
    return {
        columnOrder: [],
        columnPinning: { left: [], right: [] },
        columnSizing: {},
        columnVisibility: {},
        density: DEFAULT_DENSITY,
        globalFilter: "",
    }
}

/**
 * Читает сохранённое состояние таблицы из localStorage.
 *
 * @param tableId - Идентификатор таблицы.
 * @returns Восстановленный view state.
 */
export function readSavedView(tableId: string): IEnterpriseTableSavedView {
    const emptyView = createEmptySavedView()
    const storage = getWindowLocalStorage()
    if (storage === undefined) {
        return emptyView
    }

    const parsed = safeStorageGetJson<Partial<IEnterpriseTableSavedView>>(
        storage,
        getStorageKey(tableId),
        {},
    )

    if (Object.keys(parsed).length === 0) {
        return emptyView
    }

    const density = parsed.density === "compact" ? "compact" : "comfortable"

    return {
        columnOrder: Array.isArray(parsed.columnOrder)
            ? (parsed.columnOrder as string[])
            : [],
        columnPinning: parseSavedColumnPinning(parsed.columnPinning),
        columnSizing: parseSavedColumnSizing(parsed.columnSizing),
        columnVisibility:
            typeof parsed.columnVisibility === "object" && parsed.columnVisibility !== null
                ? parsed.columnVisibility
                : {},
        density,
        globalFilter: typeof parsed.globalFilter === "string" ? parsed.globalFilter : "",
    }
}

/**
 * Записывает состояние таблицы в localStorage.
 *
 * @param tableId - Идентификатор таблицы.
 * @param view - Состояние для сохранения.
 */
export function writeSavedView(tableId: string, view: IEnterpriseTableSavedView): void {
    const storage = getWindowLocalStorage()
    safeStorageSetJson(storage, getStorageKey(tableId), view)
}

/**
 * Triggers a browser file download with the given content.
 *
 * @param fileName - Name of the downloaded file.
 * @param payload - File content as a string.
 * @param contentType - MIME content type header.
 */
export function downloadFile(fileName: string, payload: string, contentType: string): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return
    }

    const blob = new Blob([payload], { type: contentType })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = fileName
    anchor.style.display = "none"
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
}

/**
 * Escapes a string value for safe inclusion in a CSV cell.
 *
 * @param value - Raw string value.
 * @returns Double-quoted, escaped string.
 */
export function csvEscape(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
}

/**
 * Builds a CSV payload string from rows and column definitions.
 *
 * @param rows - Data rows to export.
 * @param columns - Column definitions with accessor functions.
 * @returns CSV-formatted string with header and data rows.
 */
export function buildCsvPayload<TRow>(
    rows: ReadonlyArray<TRow>,
    columns: ReadonlyArray<IEnterpriseDataTableColumn<TRow>>,
): string {
    const header = columns.map((column): string => csvEscape(column.header)).join(",")
    const records = rows.map((row): string => {
        return columns.map((column): string => csvEscape(String(column.accessor(row)))).join(",")
    })

    return `${header}\n${records.join("\n")}`
}

/**
 * Проверяет, содержит ли saved pinning реальные данные.
 *
 * @param pinning - Сохранённый ColumnPinningState.
 * @returns true если есть хотя бы одна закреплённая колонка.
 */
export function hasSavedPinning(pinning: ColumnPinningState): boolean {
    const leftCount = Array.isArray(pinning.left) ? pinning.left.length : 0
    const rightCount = Array.isArray(pinning.right) ? pinning.right.length : 0
    return leftCount > 0 || rightCount > 0
}

/**
 * Проверяет, содержит ли saved sizing реальные данные.
 *
 * @param sizing - Сохранённый ColumnSizingState.
 * @returns true если есть хотя бы одна ширина.
 */
export function hasSavedSizing(sizing: ColumnSizingState): boolean {
    return Object.keys(sizing).length > 0
}

/**
 * Transforms IEnterpriseDataTableColumn descriptors into TanStack ColumnDef array.
 *
 * @param columns - Application-level column descriptors.
 * @returns TanStack-compatible column definitions.
 */
export function createColumnDefs<TRow>(
    columns: ReadonlyArray<IEnterpriseDataTableColumn<TRow>>,
): ReadonlyArray<ColumnDef<TRow>> {
    return columns.map(
        (column): ColumnDef<TRow> => ({
            accessorFn: (row): string | number => column.accessor(row),
            cell: (context): ReactElement | string | number => {
                if (column.cell !== undefined) {
                    return column.cell(context.row.original)
                }
                return column.accessor(context.row.original)
            },
            enableGlobalFilter: column.enableGlobalFilter !== false,
            enableHiding: column.isHideable !== false,
            header: column.header,
            id: column.id,
            size: column.size ?? DEFAULT_COLUMN_SIZE,
        }),
    )
}

/**
 * Builds the CSS grid-template-columns string from visible columns.
 *
 * @param checkboxWidth - Width of the checkbox column in pixels.
 * @param columnSizes - Array of column widths in pixels (already clamped to min).
 * @returns CSS grid-template-columns value.
 */
export function buildGridTemplate(
    checkboxWidth: number,
    columnSizes: ReadonlyArray<number>,
): string {
    return `${String(checkboxWidth)}px ${columnSizes.map((size): string => `${String(size)}px`).join(" ")}`
}
