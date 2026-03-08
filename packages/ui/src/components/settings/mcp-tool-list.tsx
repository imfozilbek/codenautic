import { type ReactElement } from "react"

export interface IMcpToolListItem {
    readonly avgLatencyMs: number
    readonly calls: number
    readonly errorCount: number
    readonly toolId: string
}

interface IMcpToolListProps {
    readonly items: ReadonlyArray<IMcpToolListItem>
}

/**
 * Табличный список MCP инструментов и их runtime-метрик.
 *
 * @param props - набор инструментов с usage/statistics.
 * @returns Таблица MCP tools.
 */
export function MCPToolList(props: IMcpToolListProps): ReactElement {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-surface text-left text-muted-foreground">
                    <tr>
                        <th className="px-3 py-2 font-medium" scope="col">
                            MCP tool
                        </th>
                        <th className="px-3 py-2 font-medium" scope="col">
                            Calls
                        </th>
                        <th className="px-3 py-2 font-medium" scope="col">
                            Errors
                        </th>
                        <th className="px-3 py-2 font-medium" scope="col">
                            Avg latency
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {props.items.map(
                        (item): ReactElement => (
                            <tr key={item.toolId} data-testid="mcp-tool-row">
                                <td className="px-3 py-2 text-foreground">{item.toolId}</td>
                                <td className="px-3 py-2 text-foreground">{item.calls}</td>
                                <td className="px-3 py-2 text-foreground">{item.errorCount}</td>
                                <td className="px-3 py-2 text-foreground">
                                    {item.avgLatencyMs} ms
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    )
}
