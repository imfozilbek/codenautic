import { type ReactElement, type ReactNode, type HTMLAttributes } from "react"

/**
 * Свойства таблицы.
 */
export interface ITableProps
    extends Omit<HTMLAttributes<HTMLTableElement>, "children" | "onChange"> {
    /** Дочерние ячейки и секции. */
    readonly children?: ReactNode
}

/**
 * Свойства заголовка таблицы.
 */
export type TableHeaderProps = Omit<HTMLAttributes<HTMLTableSectionElement>, "children"> & {
    /** Тело заголовка. */
    readonly children?: ReactNode
}

/**
 * Свойства тела таблицы.
 */
export interface ITableBodyProps extends Omit<HTMLAttributes<HTMLTableSectionElement>, "children"> {
    /** Пустое состояние. */
    readonly emptyContent?: ReactNode
    /** Дочерние строки. */
    readonly children?: ReactNode
}

/**
 * Свойства колонки.
 */
export type TableColumnProps = Omit<HTMLAttributes<HTMLTableCellElement>, "children"> & {
    /** Содержимое колонки. */
    readonly children?: ReactNode
}

/**
 * Свойства строки.
 */
export type TableRowProps = Omit<HTMLAttributes<HTMLTableRowElement>, "children"> & {
    /** Ячейки строки. */
    readonly children?: ReactNode
}

/**
 * Свойства ячейки.
 */
export type TableCellProps = Omit<HTMLAttributes<HTMLTableCellElement>, "children"> & {
    /** Контент ячейки. */
    readonly children?: ReactNode
}

/**
 * Табличная оболочка на базе HTML-семантики.
 */
export function Table({ className, children, ...props }: ITableProps): ReactElement {
    return (
        <div className="w-full overflow-x-auto">
            <table className={`min-w-full ${className ?? ""}`.trim()} {...props}>
                {children}
            </table>
        </div>
    )
}

/**
 * Шапка таблицы.
 */
export function TableHeader({ children, ...props }: TableHeaderProps): ReactElement {
    return (
        <thead {...props}>
            <tr>{children}</tr>
        </thead>
    )
}

/**
 * Тело таблицы.
 */
export function TableBody({ children, emptyContent, ...props }: ITableBodyProps): ReactElement {
    const renderedChildren =
        typeof children === "undefined"
            ? []
            : Array.isArray(children)
              ? children
              : [children]

    const hasRows = renderedChildren.some((child): boolean => child !== null && child !== undefined)

    if (hasRows === false) {
        return (
            <tbody {...props}>
                <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={99}>
                        {emptyContent}
                    </td>
                </tr>
            </tbody>
        )
    }

    return <tbody {...props}>{children}</tbody>
}

/**
 * Колонка таблицы.
 */
export function TableColumn({ children, ...props }: TableColumnProps): ReactElement {
    return <th className="px-3 py-2 text-left text-sm font-semibold text-slate-700" {...props}>{children}</th>
}

/**
 * Строка таблицы.
 */
export function TableRow({ children, ...props }: TableRowProps): ReactElement {
    return (
        <tr className="border-b border-slate-200 last:border-b-0" {...props}>
            {children}
        </tr>
    )
}

/**
 * Ячейка таблицы.
 */
export function TableCell({ children, ...props }: TableCellProps): ReactElement {
    return (
        <td className="px-3 py-2 text-sm text-slate-900" {...props}>
            {children}
        </td>
    )
}

export type { ITableProps as TableProps, ITableBodyProps as TableBodyProps }
