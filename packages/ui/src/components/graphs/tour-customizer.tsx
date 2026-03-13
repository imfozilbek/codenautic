import { useState, type ChangeEvent, type DragEvent, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { IGuidedTourStep } from "@/components/graphs/guided-tour-overlay"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Пропсы кастомайзера тура.
 */
export interface ITourCustomizerProps {
    /** Текущий набор шагов тура. */
    readonly steps: ReadonlyArray<IGuidedTourStep>
    /** Признак наличия admin-прав на изменение тура. */
    readonly isAdmin: boolean
    /** Callback обновления последовательности шагов. */
    readonly onStepsChange: (steps: ReadonlyArray<IGuidedTourStep>) => void
}

/**
 * Перемещает шаги между позициями для drag-and-drop reordering.
 *
 * @param steps Текущая последовательность шагов.
 * @param sourceId Идентификатор перетаскиваемого шага.
 * @param targetId Идентификатор целевого шага.
 * @returns Обновлённая последовательность.
 */
function reorderStepsByIds(
    steps: ReadonlyArray<IGuidedTourStep>,
    sourceId: string,
    targetId: string,
): ReadonlyArray<IGuidedTourStep> {
    if (sourceId === targetId) {
        return steps
    }

    const sourceIndex = steps.findIndex((step): boolean => step.id === sourceId)
    const targetIndex = steps.findIndex((step): boolean => step.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) {
        return steps
    }

    const nextSteps = [...steps]
    const [sourceStep] = nextSteps.splice(sourceIndex, 1)
    if (sourceStep === undefined) {
        return steps
    }

    nextSteps.splice(targetIndex, 0, sourceStep)
    return nextSteps
}

/**
 * Admin-интерфейс для создания и настройки custom guided tours.
 *
 * @param props Данные шагов и callback обновления.
 * @returns React-компонент кастомайзера.
 */
export function TourCustomizer(props: ITourCustomizerProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const [draftTitle, setDraftTitle] = useState<string>("")
    const [draftDescription, setDraftDescription] = useState<string>("")
    const [draggingStepId, setDraggingStepId] = useState<string | undefined>()

    const handleTitleChange = (stepId: string, event: ChangeEvent<HTMLInputElement>): void => {
        const nextTitle = event.currentTarget.value
        props.onStepsChange(
            props.steps.map((step): IGuidedTourStep => {
                if (step.id === stepId) {
                    return {
                        ...step,
                        title: nextTitle,
                    }
                }
                return step
            }),
        )
    }

    const handleDescriptionChange = (
        stepId: string,
        event: ChangeEvent<HTMLTextAreaElement>,
    ): void => {
        const nextDescription = event.currentTarget.value
        props.onStepsChange(
            props.steps.map((step): IGuidedTourStep => {
                if (step.id === stepId) {
                    return {
                        ...step,
                        description: nextDescription,
                    }
                }
                return step
            }),
        )
    }

    const handleAddStop = (): void => {
        if (draftTitle.trim().length === 0 || draftDescription.trim().length === 0) {
            return
        }

        const normalizedTitle = draftTitle.trim()
        const normalizedDescription = draftDescription.trim()
        const stopId = `custom-stop-${String(props.steps.length + 1)}`
        props.onStepsChange([
            ...props.steps,
            {
                description: normalizedDescription,
                id: stopId,
                title: normalizedTitle,
            },
        ])
        setDraftTitle("")
        setDraftDescription("")
    }

    const handleDropOnStep = (targetStepId: string, event: DragEvent<HTMLLIElement>): void => {
        event.preventDefault()
        const sourceStepId = draggingStepId
        if (sourceStepId === undefined) {
            return
        }

        const reorderedSteps = reorderStepsByIds(props.steps, sourceStepId, targetStepId)
        props.onStepsChange(reorderedSteps)
        setDraggingStepId(undefined)
    }

    if (props.isAdmin === false) {
        return (
            <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
                <p className={TYPOGRAPHY.cardTitle}>
                    {t("code-city:tourCustomizer.title")}
                </p>
                <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                    {t("code-city:tourCustomizer.adminRequiredDescription")}
                </p>
            </section>
        )
    }

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>
                {t("code-city:tourCustomizer.title")}
            </p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:tourCustomizer.description")}
            </p>

            <label className="mt-3 block space-y-1" htmlFor="tour-stop-title">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("code-city:tourCustomizer.stopTitleLabel")}
                </span>
                <input
                    aria-label={t("code-city:tourCustomizer.stopTitleAriaLabel")}
                    className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                    id="tour-stop-title"
                    onChange={(event): void => {
                        setDraftTitle(event.currentTarget.value)
                    }}
                    placeholder={t("code-city:tourCustomizer.stopTitlePlaceholder")}
                    value={draftTitle}
                />
            </label>

            <label className="mt-2 block space-y-1" htmlFor="tour-stop-description">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("code-city:tourCustomizer.stopDescriptionLabel")}
                </span>
                <textarea
                    aria-label={t("code-city:tourCustomizer.stopDescriptionAriaLabel")}
                    className="min-h-20 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                    id="tour-stop-description"
                    onChange={(event): void => {
                        setDraftDescription(event.currentTarget.value)
                    }}
                    placeholder={t("code-city:tourCustomizer.stopDescriptionPlaceholder")}
                    value={draftDescription}
                />
            </label>

            <button
                aria-label={t("code-city:tourCustomizer.addStopAriaLabel")}
                className="mt-2 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                onClick={handleAddStop}
                type="button"
            >
                {t("code-city:tourCustomizer.addStopButton")}
            </button>

            <ul className="mt-3 space-y-2">
                {props.steps.map(
                    (step): ReactElement => (
                        <li
                            className="rounded border border-border bg-surface p-2"
                            draggable={true}
                            key={step.id}
                            onDragOver={(event): void => {
                                event.preventDefault()
                            }}
                            onDragStart={(): void => {
                                setDraggingStepId(step.id)
                            }}
                            onDrop={(event): void => {
                                handleDropOnStep(step.id, event)
                            }}
                        >
                            <p className={`${TYPOGRAPHY.micro} text-muted-foreground`}>
                                {t("code-city:tourCustomizer.stepIdPrefix")} {step.id}
                            </p>
                            <label
                                className="mt-1 block space-y-1"
                                htmlFor={`step-title-${step.id}`}
                            >
                                <span className={TYPOGRAPHY.captionMuted}>
                                    {t("code-city:tourCustomizer.titleLabel")}
                                </span>
                                <input
                                    aria-label={t("code-city:tourCustomizer.stepTitleAriaLabel", {
                                        id: step.id,
                                    })}
                                    className="w-full rounded border border-border px-2 py-1 text-sm"
                                    id={`step-title-${step.id}`}
                                    onChange={(event): void => {
                                        handleTitleChange(step.id, event)
                                    }}
                                    value={step.title}
                                />
                            </label>
                            <label
                                className="mt-1 block space-y-1"
                                htmlFor={`step-description-${step.id}`}
                            >
                                <span className={TYPOGRAPHY.captionMuted}>
                                    {t("code-city:tourCustomizer.descriptionLabel")}
                                </span>
                                <textarea
                                    aria-label={t(
                                        "code-city:tourCustomizer.stepDescriptionAriaLabel",
                                        { id: step.id },
                                    )}
                                    className="min-h-16 w-full rounded border border-border px-2 py-1 text-sm"
                                    id={`step-description-${step.id}`}
                                    onChange={(event): void => {
                                        handleDescriptionChange(step.id, event)
                                    }}
                                    value={step.description}
                                />
                            </label>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
