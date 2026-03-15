import { type ReactElement, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

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
    const { t } = useTranslation(["code-city"])

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
    const dialogRef = useRef<HTMLElement>(null)

    useEffect((): void => {
        const container = dialogRef.current
        if (container === null) {
            return
        }
        const focusable = container.querySelector<HTMLElement>("button:not([disabled])")
        focusable?.focus()
    }, [normalizedStepIndex])

    useEffect((): (() => void) => {
        const container = dialogRef.current
        if (container === null) {
            return (): void => {}
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== "Tab") {
                return
            }
            const focusableElements = container.querySelectorAll<HTMLElement>(
                "button:not([disabled]), [tabindex]:not([tabindex='-1'])",
            )
            if (focusableElements.length === 0) {
                return
            }
            const first = focusableElements[0]
            const last = focusableElements[focusableElements.length - 1]
            if (first === undefined || last === undefined) {
                return
            }
            if (event.shiftKey === true && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (event.shiftKey !== true && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        container.addEventListener("keydown", handleKeyDown)
        return (): void => {
            container.removeEventListener("keydown", handleKeyDown)
        }
    }, [normalizedStepIndex])

    return (
        <aside
            ref={dialogRef}
            aria-label={t("code-city:guidedTour.overlayAriaLabel")}
            className="sticky top-3 z-20 rounded-lg border border-hud-border bg-hud-surface/95 p-3 text-sm text-hud-text shadow-xl"
            data-dark-hud=""
            role="dialog"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-hud-accent">
                        {t("code-city:guidedTour.title")}
                    </p>
                    <p className="mt-1 text-xs text-hud-text-muted">
                        {t("code-city:guidedTour.stepOf", {
                            current: String(normalizedStepIndex + 1),
                            total: String(props.steps.length),
                        })}
                    </p>
                </div>
                <button
                    aria-label={t("code-city:guidedTour.skipAriaLabel")}
                    className="rounded border border-hud-border px-2 py-0.5 text-xs text-hud-text hover:border-hud-accent"
                    onClick={props.onSkip}
                    type="button"
                >
                    {t("code-city:guidedTour.skipButton")}
                </button>
            </div>
            <p className="mt-2 font-semibold text-hud-text">{currentStep.title}</p>
            <p className="mt-1 text-xs text-hud-text-muted">{currentStep.description}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
                <button
                    aria-label={t("code-city:guidedTour.prevAriaLabel")}
                    className="rounded border border-hud-border px-2 py-1 text-xs text-hud-text hover:border-hud-accent disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isFirstStep}
                    onClick={props.onPrevious}
                    type="button"
                >
                    {t("code-city:guidedTour.prevButton")}
                </button>
                <button
                    aria-label={
                        isLastStep
                            ? t("code-city:guidedTour.finishAriaLabel")
                            : t("code-city:guidedTour.nextAriaLabel")
                    }
                    className="rounded border border-accent/40 bg-accent/20 px-2 py-1 text-xs font-semibold text-hud-text hover:border-accent/30"
                    onClick={props.onNext}
                    type="button"
                >
                    {isLastStep
                        ? t("code-city:guidedTour.finishButton")
                        : t("code-city:guidedTour.nextButton")}
                </button>
            </div>
        </aside>
    )
}
