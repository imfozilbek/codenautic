import { useMemo, useState, type ChangeEvent, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
    const { t } = useTranslation(["code-city"])
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
    const [destination, setDestination] = useState<TRefactoringExportDestination>("jira")
    const [templateTitle, setTemplateTitle] = useState<string>("Refactor {{title}} in {{module}}")
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

    const handleTemplateTitleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setTemplateTitle(event.currentTarget.value)
    }

    const handleTemplateBodyChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
        setTemplateBody(event.currentTarget.value)
    }

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:refactoringExportComp.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:refactoringExportComp.description")}
            </p>

            <button
                aria-label={t("code-city:refactoringExportComp.ariaOpenDialog")}
                className="mt-3 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                onClick={(): void => {
                    setIsDialogOpen(true)
                }}
                type="button"
            >
                {t("code-city:refactoringExportComp.openDialog")}
            </button>

            {isDialogOpen ? (
                <div className="mt-3 rounded border border-border bg-surface p-3">
                    <label className="block space-y-1" htmlFor="refactor-export-destination">
                        <span className={TYPOGRAPHY.overline}>
                            {t("code-city:refactoringExportComp.destination")}
                        </span>
                        <select
                            aria-label={t("code-city:refactoringExportComp.ariaDestination")}
                            className={NATIVE_FORM.select}
                            id="refactor-export-destination"
                            value={destination}
                            onChange={(event): void => {
                                const value = event.currentTarget.value
                                if (value === "jira" || value === "github") {
                                    setDestination(value)
                                }
                            }}
                        >
                            <option value="jira">{t("code-city:refactoringExportComp.destinationOptions.jira")}</option>
                            <option value="github">{t("code-city:refactoringExportComp.destinationOptions.github")}</option>
                        </select>
                    </label>

                    <label className="mt-2 block space-y-1" htmlFor="refactor-export-title">
                        <span className={TYPOGRAPHY.overline}>
                            {t("code-city:refactoringExportComp.templateTitle")}
                        </span>
                        <input
                            aria-label={t("code-city:refactoringExportComp.ariaTemplateTitle")}
                            className="w-full rounded border border-border px-2 py-1.5 text-sm"
                            id="refactor-export-title"
                            onChange={handleTemplateTitleChange}
                            type="text"
                            value={templateTitle}
                        />
                    </label>

                    <label className="mt-2 block space-y-1" htmlFor="refactor-export-body">
                        <span className={TYPOGRAPHY.overline}>
                            {t("code-city:refactoringExportComp.templateBody")}
                        </span>
                        <textarea
                            aria-label={t("code-city:refactoringExportComp.ariaTemplateBody")}
                            className="min-h-[88px] w-full rounded border border-border px-2 py-1.5 text-sm"
                            id="refactor-export-body"
                            onChange={handleTemplateBodyChange}
                            value={templateBody}
                        />
                    </label>

                    <ul className="mt-3 space-y-2">
                        {props.targets.slice(0, 6).map(
                            (target): ReactElement => (
                                <li
                                    className="flex items-start gap-2 rounded border border-border bg-surface p-2"
                                    key={target.id}
                                >
                                    <input
                                        aria-label={t("code-city:refactoringExportComp.ariaSelectTarget", { title: target.title })}
                                        checked={selectedTargetIds.includes(target.id)}
                                        className="mt-0.5 h-4 w-4 rounded border-border"
                                        onChange={(): void => {
                                            toggleTarget(target.id)
                                        }}
                                        type="checkbox"
                                    />
                                    <div className="min-w-0">
                                        <p className={TYPOGRAPHY.cardTitle}>
                                            {target.title}
                                        </p>
                                        <p className={TYPOGRAPHY.captionMuted}>
                                            {t("code-city:refactoringExportComp.moduleRoi", { module: target.module, roi: target.roiScore })}
                                        </p>
                                    </div>
                                </li>
                            ),
                        )}
                    </ul>

                    <button
                        aria-label={t("code-city:refactoringExportComp.ariaExportPlan")}
                        className="mt-3 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={selectedTargets.length === 0}
                        onClick={(): void => {
                            props.onExport?.({
                                destination,
                                fileIds: selectedTargets.map((target): string => target.fileId),
                                templateBody,
                                templateTitle,
                            })
                            setLastExportLabel(
                                t("code-city:refactoringExportComp.exportedTasks", { count: selectedTargets.length, destination }),
                            )
                            setIsDialogOpen(false)
                        }}
                        type="button"
                    >
                        {t("code-city:refactoringExportComp.exportPlan")}
                    </button>
                </div>
            ) : null}

            {lastExportLabel.length > 0 ? (
                <p className="mt-2 text-xs font-semibold text-success">{lastExportLabel}</p>
            ) : null}
        </section>
    )
}
