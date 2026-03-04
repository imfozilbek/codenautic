import { useMemo, useState, type ReactElement } from "react"

export interface IRootCauseChainNodeDescriptor {
    readonly id: string
    readonly label: string
    readonly type: "event" | "metric" | "module"
    readonly description: string
}

export interface IRootCauseIssueDescriptor {
    readonly id: string
    readonly title: string
    readonly severity: "low" | "medium" | "high" | "critical"
    readonly chain: ReadonlyArray<IRootCauseChainNodeDescriptor>
}

interface IRootCauseChainViewerProps {
    readonly issues: ReadonlyArray<IRootCauseIssueDescriptor>
}

const SEVERITY_TONE: Readonly<Record<IRootCauseIssueDescriptor["severity"], string>> = {
    critical: "bg-rose-100 text-rose-700",
    high: "bg-orange-100 text-orange-700",
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
}

/**
 * Интерактивный Root Cause Chain viewer: выбор issue и покомпонентный просмотр causal DAG-цепочки.
 *
 * @param props Набор issue-цепочек.
 * @returns Viewer с issue-list, chain tree и node details.
 */
export function RootCauseChainViewer(props: IRootCauseChainViewerProps): ReactElement {
    const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>(props.issues[0]?.id)
    const selectedIssue = useMemo((): IRootCauseIssueDescriptor | undefined => {
        if (selectedIssueId === undefined) {
            return props.issues[0]
        }
        return props.issues.find((issue): boolean => issue.id === selectedIssueId) ?? props.issues[0]
    }, [props.issues, selectedIssueId])
    const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
        selectedIssue?.chain[0]?.id,
    )
    const selectedNode = useMemo((): IRootCauseChainNodeDescriptor | undefined => {
        if (selectedIssue === undefined) {
            return undefined
        }
        if (selectedNodeId === undefined) {
            return selectedIssue.chain[0]
        }
        return (
            selectedIssue.chain.find((node): boolean => node.id === selectedNodeId) ?? selectedIssue.chain[0]
        )
    }, [selectedIssue, selectedNodeId])

    if (props.issues.length === 0 || selectedIssue === undefined) {
        return (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                No causal issues available for this scope.
            </p>
        )
    }

    return (
        <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-2">
                {props.issues.map((issue): ReactElement => (
                    <button
                        aria-label={`Open causal issue ${issue.title}`}
                        className={`w-full rounded-md border px-3 py-2 text-left transition ${
                            selectedIssue.id === issue.id
                                ? "border-cyan-300 bg-cyan-50"
                                : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                        key={issue.id}
                        onClick={(): void => {
                            setSelectedIssueId(issue.id)
                            setSelectedNodeId(issue.chain[0]?.id)
                        }}
                        type="button"
                    >
                        <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
                        <span
                            className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                                SEVERITY_TONE[issue.severity]
                            }`}
                        >
                            {issue.severity.toUpperCase()}
                        </span>
                    </button>
                ))}
            </aside>

            <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Causal chain</p>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="space-y-2">
                        {selectedIssue.chain.map((node, index): ReactElement => (
                            <div className="relative pl-6" key={node.id}>
                                {index > 0 ? (
                                    <span className="absolute left-2 top-[-10px] h-3.5 border-l border-slate-300" />
                                ) : null}
                                <span className="absolute left-2 top-4 h-[calc(100%-6px)] border-l border-slate-300" />
                                <button
                                    aria-label={`Open chain node ${node.label}`}
                                    className={`w-full rounded border px-2 py-1.5 text-left text-sm transition ${
                                        selectedNode?.id === node.id
                                            ? "border-cyan-300 bg-cyan-50"
                                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                                    }`}
                                    onClick={(): void => {
                                        setSelectedNodeId(node.id)
                                    }}
                                    type="button"
                                >
                                    <p className="font-semibold text-slate-900">{node.label}</p>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{node.type}</p>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedNode !== undefined ? (
                    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">{selectedNode.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{selectedNode.description}</p>
                    </article>
                ) : null}
            </div>
        </section>
    )
}
