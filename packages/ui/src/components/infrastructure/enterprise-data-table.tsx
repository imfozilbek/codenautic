import {
    type ChangeEvent,
    type KeyboardEvent,
    type ReactElement,
    useMemo,
    useRef,
    useState,
} from "react"

import {
    type ColumnDef,
    type ColumnOrderState,
    type ColumnPinningState,
    type ColumnSizingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    type RowSelectionState,
    type VisibilityState,
    useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"

import { Button, Chip } from "@/components/ui"

type TDensity = "comfortable" | "compact"

interface IEnterpriseDataTableColumn<TRow> {
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

interface IEnterpriseDataTableProps<TRow> {
    /** Идентификатор таблицы для сохранения view state. */
    readonly id: string
    /** Данные таблицы. */
    readonly rows: ReadonlyArray<TRow>
    /** Конфигурация колонок. */
    readonly columns: ReadonlyArray<IEnterpriseDataTableColumn<TRow>>
    /** Функция получения row id. */
    readonly getRowId: (row: TRow) => string
    /** ARIA label таблицы. */
    readonly ariaLabel: string
    /** Текст empty state. */
    readonly emptyMessage: string
    /** Конфигурация виртуализации body таблицы. */
    readonly virtualization?: IEnterpriseDataTableVirtualizationOptions
}

interface IEnterpriseDataTableVirtualizationOptions {
    /** Оценка высоты строки для разных density режимов. */
    readonly estimateRowHeight?: {
        readonly comfortable: number
        readonly compact: number
    }
    /** Overscan для virtualizer. */
    readonly overscan?: number
    /** Максимальная высота scroll контейнера body. */
    readonly maxBodyHeight?: number
}

interface IEnterpriseTableSavedView {
    /** Visibility колонок. */
    readonly columnVisibility: VisibilityState
    /** Порядок колонок. */
    readonly columnOrder: ColumnOrderState
    /** Density режима таблицы. */
    readonly density: TDensity
    /** Значение global filter. */
    readonly globalFilter: string
}

interface IRenderedRowOffset {
    readonly index: number
    readonly key: number | string
    readonly start: number
}

function getStorageKey(tableId: string): string {
    return `ui.enterprise-table.${tableId}`
}

function readSavedView(tableId: string): IEnterpriseTableSavedView {
    if (typeof window === "undefined") {
        return {
            columnOrder: [],
            columnVisibility: {},
            density: "comfortable",
            globalFilter: "",
        }
    }

    const raw = window.localStorage.getItem(getStorageKey(tableId))
    if (raw === null) {
        return {
            columnOrder: [],
            columnVisibility: {},
            density: "comfortable",
            globalFilter: "",
        }
    }

    try {
        const parsed = JSON.parse(raw) as Partial<IEnterpriseTableSavedView>
        const density = parsed.density === "compact" ? "compact" : "comfortable"

        return {
            columnOrder: Array.isArray(parsed.columnOrder) ? parsed.columnOrder : [],
            columnVisibility:
                typeof parsed.columnVisibility === "object" && parsed.columnVisibility !== null
                    ? (parsed.columnVisibility)
                    : {},
            density,
            globalFilter: typeof parsed.globalFilter === "string" ? parsed.globalFilter : "",
        }
    } catch {
        return {
            columnOrder: [],
            columnVisibility: {},
            density: "comfortable",
            globalFilter: "",
        }
    }
}

function writeSavedView(tableId: string, view: IEnterpriseTableSavedView): void {
    if (typeof window === "undefined") {
        return
    }
    window.localStorage.setItem(getStorageKey(tableId), JSON.stringify(view))
}

function downloadFile(fileName: string, payload: string, contentType: string): void {
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

function csvEscape(value: string): string {
    return `"${value.replace(/"/g, "\"\"")}"`
}

function buildCsvPayload<TRow>(
    rows: ReadonlyArray<TRow>,
    columns: ReadonlyArray<IEnterpriseDataTableColumn<TRow>>,
): string {
    const header = columns.map((column): string => csvEscape(column.header)).join(",")
    const records = rows.map((row): string => {
        return columns.map((column): string => csvEscape(String(column.accessor(row)))).join(",")
    })

    return `${header}\n${records.join("\n")}`
}

function createColumnDefs<TRow>(
    columns: ReadonlyArray<IEnterpriseDataTableColumn<TRow>>,
): ReadonlyArray<ColumnDef<TRow>> {
    return columns.map((column): ColumnDef<TRow> => ({
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
        size: column.size ?? 180,
    }))
}

/**
 * Enterprise table kit для list-страниц: row selection, density, column controls, export.
 *
 * @param props Данные и конфигурация таблицы.
 * @returns Унифицированный виртуализированный table layout.
 */
export function EnterpriseDataTable<TRow>(props: IEnterpriseDataTableProps<TRow>): ReactElement {
    const initialView = useMemo((): IEnterpriseTableSavedView => {
        return readSavedView(props.id)
    }, [props.id])
    const initialColumnOrder = useMemo(
        (): ColumnOrderState => props.columns.map((column): string => column.id),
        [props.columns],
    )
    const initialColumnPinning = useMemo((): ColumnPinningState => {
        return {
            left: props.columns
                .filter((column): boolean => column.pin === "left")
                .map((column): string => column.id),
            right: props.columns
                .filter((column): boolean => column.pin === "right")
                .map((column): string => column.id),
        }
    }, [props.columns])
    const initialColumnSizing = useMemo((): ColumnSizingState => {
        const sizing: ColumnSizingState = {}
        props.columns.forEach((column): void => {
            if (column.size !== undefined) {
                sizing[column.id] = column.size
            }
        })
        return sizing
    }, [props.columns])

    const [globalFilter, setGlobalFilter] = useState<string>(initialView.globalFilter)
    const [density, setDensity] = useState<TDensity>(initialView.density)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        initialView.columnVisibility,
    )
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
        initialView.columnOrder.length > 0 ? initialView.columnOrder : initialColumnOrder,
    )
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(initialColumnPinning)
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(initialColumnSizing)
    const [focusedRowIndex, setFocusedRowIndex] = useState<number>(0)

    const data = useMemo((): Array<TRow> => [...props.rows], [props.rows])
    const columnDefs = useMemo((): ReadonlyArray<ColumnDef<TRow>> => {
        return createColumnDefs(props.columns)
    }, [props.columns])

    const table = useReactTable({
        columnResizeMode: "onChange",
        columns: columnDefs as ColumnDef<TRow, unknown>[],
        data,
        enableColumnResizing: true,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getRowId: (row): string => props.getRowId(row),
        getSortedRowModel: getSortedRowModel(),
        globalFilterFn: (row, columnId, filterValue): boolean => {
            const value = row.getValue(columnId)
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
        },
        onColumnOrderChange: setColumnOrder,
        onColumnPinningChange: setColumnPinning,
        onColumnSizingChange: setColumnSizing,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        state: {
            columnOrder,
            columnPinning,
            columnSizing,
            columnVisibility,
            globalFilter,
            rowSelection,
        },
    })

    const rowModel = table.getRowModel().rows
    const visibleColumns = table.getVisibleLeafColumns()
    const gridTemplateColumns = `48px ${visibleColumns
        .map((column): string => `${String(Math.max(column.getSize(), 120))}px`)
        .join(" ")}`
    const totalTableWidth =
        48 + visibleColumns.reduce((accumulator, column): number => {
            return accumulator + Math.max(column.getSize(), 120)
        }, 0)

    const parentRef = useRef<HTMLDivElement | null>(null)
    const defaultComfortableRowHeight = 56
    const defaultCompactRowHeight = 42
    const rowHeight =
        density === "compact"
            ? (props.virtualization?.estimateRowHeight?.compact ?? defaultCompactRowHeight)
            : (props.virtualization?.estimateRowHeight?.comfortable ?? defaultComfortableRowHeight)
    const maxBodyHeight = props.virtualization?.maxBodyHeight ?? 520
    const overscan = props.virtualization?.overscan ?? 8
    const rowVirtualizer = useVirtualizer({
        count: rowModel.length,
        estimateSize: (): number => rowHeight,
        getScrollElement: (): HTMLDivElement | null => parentRef.current,
        overscan,
    })
    const fallbackRowHeight = rowHeight
    const virtualItems = rowVirtualizer.getVirtualItems()
    const fallbackRenderedRowCount = Math.min(
        rowModel.length,
        Math.max(1, Math.ceil(maxBodyHeight / fallbackRowHeight) + overscan),
    )
    const renderedRowOffsets: ReadonlyArray<IRenderedRowOffset> = virtualItems.length > 0
        ? virtualItems.map((item): IRenderedRowOffset => ({
            index: item.index,
            key: String(item.key),
            start: item.start,
        }))
        : Array.from({ length: fallbackRenderedRowCount }, (_unusedValue, index): IRenderedRowOffset => ({
            index,
            key: `fallback-row-${props.id}-${String(index)}`,
            start: index * fallbackRowHeight,
        }))
    const totalRowsHeight = virtualItems.length > 0
        ? rowVirtualizer.getTotalSize()
        : rowModel.length * fallbackRowHeight

    const selectedRows = table.getSelectedRowModel().rows

    const handleSaveView = (): void => {
        writeSavedView(props.id, {
            columnOrder,
            columnVisibility,
            density,
            globalFilter,
        })
    }

    const handleResetView = (): void => {
        setGlobalFilter("")
        setDensity("comfortable")
        setColumnVisibility({})
        setColumnOrder(initialColumnOrder)
        setColumnPinning(initialColumnPinning)
        setColumnSizing(initialColumnSizing)
        setRowSelection({})
    }

    const handleExportCsv = (): void => {
        const filteredRows = table
            .getFilteredRowModel()
            .rows.map((row): TRow => row.original)
        const payload = buildCsvPayload(filteredRows, props.columns)
        downloadFile(`${props.id}.csv`, payload, "text/csv;charset=utf-8;")
    }

    const handleExportJson = (): void => {
        const filteredRows = table
            .getFilteredRowModel()
            .rows.map((row): TRow => row.original)
        const payload = JSON.stringify(filteredRows, null, 2)
        downloadFile(`${props.id}.json`, payload, "application/json;charset=utf-8;")
    }

    const handleRowKeyDown = (
        event: KeyboardEvent<HTMLDivElement>,
        rowIndex: number,
    ): void => {
        if (event.key === "ArrowDown") {
            const nextIndex = Math.min(rowIndex + 1, rowModel.length - 1)
            setFocusedRowIndex(nextIndex)
            event.preventDefault()
            return
        }

        if (event.key === "ArrowUp") {
            const nextIndex = Math.max(rowIndex - 1, 0)
            setFocusedRowIndex(nextIndex)
            event.preventDefault()
        }
    }

    const handleColumnWidthChange = (
        event: ChangeEvent<HTMLInputElement>,
        columnId: string,
    ): void => {
        const next = Number.parseInt(event.currentTarget.value, 10)
        if (Number.isNaN(next)) {
            return
        }
        const column = table.getColumn(columnId)
        if (column === undefined) {
            return
        }
        table.setColumnSizing((previous): ColumnSizingState => ({
            ...previous,
            [columnId]: next,
        }))
    }

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    aria-label={`${props.ariaLabel} search`}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    placeholder="Search rows"
                    value={globalFilter}
                    onChange={(event): void => {
                        setGlobalFilter(event.currentTarget.value)
                    }}
                />
                <Button
                    size="sm"
                    variant={density === "compact" ? "solid" : "flat"}
                    onPress={(): void => {
                        setDensity("compact")
                    }}
                >
                    Compact
                </Button>
                <Button
                    size="sm"
                    variant={density === "comfortable" ? "solid" : "flat"}
                    onPress={(): void => {
                        setDensity("comfortable")
                    }}
                >
                    Comfortable
                </Button>
                <Button size="sm" variant="flat" onPress={handleExportCsv}>
                    Export CSV
                </Button>
                <Button size="sm" variant="flat" onPress={handleExportJson}>
                    Export JSON
                </Button>
                <Button size="sm" variant="flat" onPress={handleSaveView}>
                    Save view
                </Button>
                <Button size="sm" variant="flat" onPress={handleResetView}>
                    Reset view
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {columnOrder.map((columnId, index): ReactElement | null => {
                    const column = table.getColumn(columnId)
                    if (column === undefined) {
                        return null
                    }

                    return (
                        <div
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                            key={columnId}
                        >
                            <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                                {String(column.columnDef.header)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                                {column.getCanHide() ? (
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={(): void => {
                                            column.toggleVisibility()
                                        }}
                                    >
                                        {column.getIsVisible() ? "Hide" : "Show"}
                                    </Button>
                                ) : null}
                                <Button
                                    isDisabled={index === 0}
                                    size="sm"
                                    variant="flat"
                                    onPress={(): void => {
                                        if (index === 0) {
                                            return
                                        }
                                        const next = [...columnOrder]
                                        const target = next[index - 1]
                                        if (target === undefined) {
                                            return
                                        }
                                        next[index - 1] = columnId
                                        next[index] = target
                                        setColumnOrder(next)
                                    }}
                                >
                                    ←
                                </Button>
                                <Button
                                    isDisabled={index === columnOrder.length - 1}
                                    size="sm"
                                    variant="flat"
                                    onPress={(): void => {
                                        if (index >= columnOrder.length - 1) {
                                            return
                                        }
                                        const next = [...columnOrder]
                                        const target = next[index + 1]
                                        if (target === undefined) {
                                            return
                                        }
                                        next[index + 1] = columnId
                                        next[index] = target
                                        setColumnOrder(next)
                                    }}
                                >
                                    →
                                </Button>
                                <select
                                    aria-label={`Pin ${columnId}`}
                                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                                    value={
                                        column.getIsPinned() === false
                                            ? "none"
                                            : String(column.getIsPinned())
                                    }
                                    onChange={(event): void => {
                                        const value = event.currentTarget.value
                                        if (value === "left" || value === "right") {
                                            column.pin(value)
                                            return
                                        }
                                        column.pin(false)
                                    }}
                                >
                                    <option value="none">pin: none</option>
                                    <option value="left">pin: left</option>
                                    <option value="right">pin: right</option>
                                </select>
                            </div>
                            <input
                                aria-label={`Width ${columnId}`}
                                className="mt-2 w-full"
                                max="420"
                                min="120"
                                step="10"
                                type="range"
                                value={Math.round(column.getSize())}
                                onChange={(event): void => {
                                    handleColumnWidthChange(event, columnId)
                                }}
                            />
                        </div>
                    )
                })}
            </div>

            {selectedRows.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    <Chip color="primary" size="sm" variant="flat">
                        {selectedRows.length} selected
                    </Chip>
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={(): void => {
                            setRowSelection({})
                        }}
                    >
                        Clear selection
                    </Button>
                </div>
            ) : null}

            <div
                aria-label={props.ariaLabel}
                className="overflow-auto rounded-lg border border-[var(--border)]"
                data-virtualized="true"
                role="table"
                aria-rowcount={rowModel.length}
                style={{ minWidth: `${String(totalTableWidth)}px` }}
            >
                <div
                    className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]"
                    role="rowgroup"
                >
                    <div
                        className="grid items-center gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]/70"
                        role="row"
                        style={{ gridTemplateColumns }}
                    >
                        <div role="columnheader">
                            <input
                                aria-label={`${props.ariaLabel} select all`}
                                checked={table.getIsAllRowsSelected()}
                                type="checkbox"
                                onChange={table.getToggleAllRowsSelectedHandler()}
                            />
                        </div>
                        {visibleColumns.map((column): ReactElement => {
                            return (
                                <button
                                    className="text-left"
                                    key={column.id}
                                    role="columnheader"
                                    type="button"
                                    onClick={column.getToggleSortingHandler()}
                                >
                                    {String(column.columnDef.header)}
                                    {column.getIsSorted() === "asc" ? " ↑" : null}
                                    {column.getIsSorted() === "desc" ? " ↓" : null}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {rowModel.length === 0 ? (
                    <p className="px-3 py-6 text-sm text-[var(--foreground)]/70">{props.emptyMessage}</p>
                ) : (
                    <div
                        ref={parentRef}
                        className="overflow-auto"
                        data-rendered-row-count={renderedRowOffsets.length}
                        role="rowgroup"
                        style={{ maxHeight: `${String(maxBodyHeight)}px` }}
                    >
                        <div
                            className="relative"
                            style={{ height: `${String(totalRowsHeight)}px` }}
                        >
                            {renderedRowOffsets.map((rowOffset): ReactElement | null => {
                                const row = rowModel[rowOffset.index]
                                if (row === undefined) {
                                    return null
                                }

                                const isFocused = focusedRowIndex === rowOffset.index
                                const rowPadding =
                                    density === "compact" ? "py-1 text-xs" : "py-2 text-sm"

                                return (
                                    <div
                                        className={`absolute left-0 top-0 grid items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 ${rowPadding}`}
                                        key={rowOffset.key}
                                        role="row"
                                        style={{
                                            gridTemplateColumns,
                                            minWidth: `${String(totalTableWidth)}px`,
                                            transform: `translateY(${String(rowOffset.start)}px)`,
                                        }}
                                        tabIndex={isFocused ? 0 : -1}
                                        onFocus={(): void => {
                                            setFocusedRowIndex(rowOffset.index)
                                        }}
                                        onKeyDown={(event): void => {
                                            handleRowKeyDown(event, rowOffset.index)
                                        }}
                                    >
                                        <div role="cell">
                                            <input
                                                aria-label={`Select ${row.id}`}
                                                checked={row.getIsSelected()}
                                                type="checkbox"
                                                onChange={row.getToggleSelectedHandler()}
                                            />
                                        </div>
                                        {row.getVisibleCells().map((cell): ReactElement => (
                                            <div key={cell.id} role="cell">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

export type { IEnterpriseDataTableColumn, IEnterpriseDataTableProps }
