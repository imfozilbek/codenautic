import type { ReactElement } from "react"

/**
 * Шаг guided tour в CodeCity.
 */
export interface IGuidedTourStep {
    /** Уникальный идентификатор шага. */
    readonly id: string
    /** Короткий заголовок шага. */
    readonly title: string
    /** Описание действия для пользователя. */
    readonly description: string
}

/**
 * Пропсы guided tour overlay.
 */
export interface IGuidedTourOverlayProps {
    /** Активность оверлея. */
    readonly isActive: boolean
    /** Список шагов тура. */
    readonly steps: ReadonlyArray<IGuidedTourStep>
    /** Индекс текущего шага. */
    readonly currentStepIndex: number
    /** Переход на следующий шаг. */
    readonly onNext: () => void
    /** Переход на предыдущий шаг. */
    readonly onPrevious: () => void
    /** Пропуск тура. */
    readonly onSkip: () => void
}

/**
 * Визуальный guided tour overlay со step-by-step навигацией.
 *
 * @param props Конфигурация guided tour.
 * @returns Панель guided tour или null, если тур не активен.
 */
export function GuidedTourOverlay(props: IGuidedTourOverlayProps): ReactElement | null {
    if (props.isActive === false || props.steps.length === 0) {
        return null
    }

    const lastStepIndex = props.steps.length - 1
    const normalizedStepIndex = Math.max(0, Math.min(props.currentStepIndex, lastStepIndex))
    const currentStep = props.steps[normalizedStepIndex] ?? props.steps[0]
    if (currentStep === undefined) {
        return null
    }

    const isFirstStep = normalizedStepIndex === 0
    const isLastStep = normalizedStepIndex === lastStepIndex

    return (
        <aside
            aria-label="Guided tour overlay"
            className="sticky top-3 z-20 rounded-lg border border-cyan-400/60 bg-slate-900/95 p-3 text-sm text-slate-100 shadow-xl"
            role="dialog"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                        Guided tour
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                        Step {String(normalizedStepIndex + 1)} of {String(props.steps.length)}
                    </p>
                </div>
                <button
                    aria-label="Skip guided tour"
                    className="rounded border border-slate-500 px-2 py-0.5 text-xs text-slate-200 hover:border-border"
                    onClick={props.onSkip}
                    type="button"
                >
                    Skip
                </button>
            </div>
            <p className="mt-2 font-semibold text-cyan-100">{currentStep.title}</p>
            <p className="mt-1 text-xs text-slate-300">{currentStep.description}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
                <button
                    aria-label="Previous tour step"
                    className="rounded border border-slate-500 px-2 py-1 text-xs text-slate-200 hover:border-border disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isFirstStep}
                    onClick={props.onPrevious}
                    type="button"
                >
                    Prev
                </button>
                <button
                    aria-label={isLastStep ? "Finish guided tour" : "Next tour step"}
                    className="rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-100 hover:border-cyan-200"
                    onClick={props.onNext}
                    type="button"
                >
                    {isLastStep ? "Finish" : "Next"}
                </button>
            </div>
        </aside>
    )
}
