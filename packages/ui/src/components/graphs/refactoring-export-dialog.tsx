import { useMemo, useState, type ChangeEvent, type ReactElement } from "react"

import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"

/**
 * Канал экспорта refactoring плана.
 */
export type TRefactoringExportDestination = "github" | "jira"

/**
 * Payload экспорта refactoring плана.
 */
export interface IRefactoringExportPayload {
    /** Канал назначения (Jira/GitHub). */
    readonly destination: TRefactoringExportDestination
    /** Заголовок шаблона задачи. */
    readonly templateTitle: string
    /** Текст шаблона задачи. */
    readonly templateBody: string
    /** Выбранные file ids для задач. */
    readonly fileIds: ReadonlyArray<string>
}

/**
 * Пропсы export dialog.
 */
export interface IRefactoringExportDialogProps {
    /** Набор доступных refactoring targets. */
    readonly targets: ReadonlyArray<IRefactoringTargetDescriptor>
    /** Callback экспорта. */
    readonly onExport?: (payload: IRefactoringExportPayload) => void
}

/**
 * Диалог экспорта refactoring-плана в Jira/GitHub.
 *
 * @param props Набор таргетов и callback экспорта.
 * @returns React-компонент export dialog.
 */
export function RefactoringExportDialog(props: IRefactoringExportDialogProps): ReactElement {
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
    const [destination, setDestination] = useState<TRefactoringExportDestination>("jira")
    const [templateTitle, setTemplateTitle] = useState<string>(
        "Refactor {{title}} in {{module}}",
    )
    const [templateBody, setTemplateBody] = useState<string>(
        "Goal: reduce risk and complexity. Scope: {{title}}. Notes: {{notes}}",
    )
    const [selectedTargetIds, setSelectedTargetIds] = useState<ReadonlyArray<string>>([])
    const [lastExportLabel, setLastExportLabel] = useState<string>("")

    const selectedTargets = useMemo((): ReadonlyArray<IRefactoringTargetDescriptor> => {
        return props.targets.filter((target): boolean => selectedTargetIds.includes(target.id))
    }, [props.targets, selectedTargetIds])

    const toggleTarget = (targetId: string): void => {
        setSelectedTargetIds((currentIds): ReadonlyArray<string> => {
            if (currentIds.includes(targetId)) {
                return currentIds.filter((id): boolean => id !== targetId)
            }
            return [...currentIds, targetId]
        })
    }

    const handleDestinationChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const value = event.currentTarget.value
        if (value === "jira" || value === "github") {
            setDestination(value)
        }
    }

    const handleTemplateTitleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setTemplateTitle(event.currentTarget.value)
    }

    const handleTemplateBodyChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
        setTemplateBody(event.currentTarget.value)
    }

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Refactoring export dialog</p>
            <p className="mt-1 text-xs text-slate-500">
                Export selected refactoring tasks as Jira tickets or GitHub issues with editable
                templates.
            </p>

            <button
                aria-label="Open refactoring export dialog"
                className="mt-3 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                onClick={(): void => {
                    setIsDialogOpen(true)
                }}
                type="button"
            >
                Open export dialog
            </button>

            {isDialogOpen ? (
                <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                    <label className="block space-y-1" htmlFor="refactor-export-destination">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Destination
                        </span>
                        <select
                            aria-label="Refactoring export destination"
                            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                            id="refactor-export-destination"
                            onChange={handleDestinationChange}
                            value={destination}
                        >
                            <option value="jira">Jira</option>
                            <option value="github">GitHub Issues</option>
                        </select>
                    </label>

                    <label className="mt-2 block space-y-1" htmlFor="refactor-export-title">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Template title
                        </span>
                        <input
                            aria-label="Refactoring export template title"
                            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                            id="refactor-export-title"
                            onChange={handleTemplateTitleChange}
                            type="text"
                            value={templateTitle}
                        />
                    </label>

                    <label className="mt-2 block space-y-1" htmlFor="refactor-export-body">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Template body
                        </span>
                        <textarea
                            aria-label="Refactoring export template body"
                            className="min-h-[88px] w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                            id="refactor-export-body"
                            onChange={handleTemplateBodyChange}
                            value={templateBody}
                        />
                    </label>

                    <ul className="mt-3 space-y-2">
                        {props.targets.slice(0, 6).map((target): ReactElement => (
                            <li
                                className="flex items-start gap-2 rounded border border-slate-200 bg-white p-2"
                                key={target.id}
                            >
                                <input
                                    aria-label={`Select export target ${target.title}`}
                                    checked={selectedTargetIds.includes(target.id)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                                    onChange={(): void => {
                                        toggleTarget(target.id)
                                    }}
                                    type="checkbox"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {target.title}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        Module {target.module} · ROI {String(target.roiScore)}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <button
                        aria-label="Export refactoring plan"
                        className="mt-3 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={selectedTargets.length === 0}
                        onClick={(): void => {
                            props.onExport?.({
                                destination,
                                fileIds: selectedTargets.map((target): string => target.fileId),
                                templateBody,
                                templateTitle,
                            })
                            setLastExportLabel(
                                `Exported ${String(selectedTargets.length)} task(s) to ${destination}`,
                            )
                            setIsDialogOpen(false)
                        }}
                        type="button"
                    >
                        Export plan
                    </button>
                </div>
            ) : null}

            {lastExportLabel.length > 0 ? (
                <p className="mt-2 text-xs font-semibold text-emerald-700">{lastExportLabel}</p>
            ) : null}
        </section>
    )
}
