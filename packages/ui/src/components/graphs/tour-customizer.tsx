import { useState, type ChangeEvent, type DragEvent, type ReactElement } from "react"

import type { IGuidedTourStep } from "@/components/graphs/guided-tour-overlay"

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
            <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
                <p className="text-sm font-semibold text-foreground">Tour customizer</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Admin access is required to create and reorder custom tour steps.
                </p>
            </section>
        )
    }

    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Tour customizer</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Drag and drop step cards, edit stop descriptions, and add custom stops.
            </p>

            <label className="mt-3 block space-y-1" htmlFor="tour-stop-title">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Stop title
                </span>
                <input
                    aria-label="Tour stop title"
                    className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                    id="tour-stop-title"
                    onChange={(event): void => {
                        setDraftTitle(event.currentTarget.value)
                    }}
                    placeholder="Add custom stop title"
                    value={draftTitle}
                />
            </label>

            <label className="mt-2 block space-y-1" htmlFor="tour-stop-description">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Stop description
                </span>
                <textarea
                    aria-label="Tour stop description"
                    className="min-h-20 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                    id="tour-stop-description"
                    onChange={(event): void => {
                        setDraftDescription(event.currentTarget.value)
                    }}
                    placeholder="Describe what developer should inspect on this stop"
                    value={draftDescription}
                />
            </label>

            <button
                aria-label="Add custom tour stop"
                className="mt-2 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                onClick={handleAddStop}
                type="button"
            >
                Add stop
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
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Step ID: {step.id}
                            </p>
                            <label
                                className="mt-1 block space-y-1"
                                htmlFor={`step-title-${step.id}`}
                            >
                                <span className="text-xs text-muted-foreground">Title</span>
                                <input
                                    aria-label={`Tour step title ${step.id}`}
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
                                <span className="text-xs text-muted-foreground">Description</span>
                                <textarea
                                    aria-label={`Tour step description ${step.id}`}
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
