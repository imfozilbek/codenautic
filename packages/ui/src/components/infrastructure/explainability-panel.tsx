import { type ReactElement, useMemo, useState } from "react"

import {
    Button,
    Drawer,
    DrawerBody,
    DrawerContent,
    DrawerHeader,
    Textarea,
} from "@/components/ui"

type TFactorImpact = "high" | "low" | "medium"

interface IExplainabilityFactor {
    /** Название фактора. */
    readonly label: string
    /** Вклад фактора в сигнал. */
    readonly impact: TFactorImpact
    /** Короткое пояснение фактора. */
    readonly value: string
}

interface IExplainabilityPanelProps {
    /** Заголовок explainability блока. */
    readonly title: string
    /** Короткий label сигнала. */
    readonly signalLabel: string
    /** Значение сигнала. */
    readonly signalValue: string
    /** Порог, применённый к оценке. */
    readonly threshold: string
    /** Confidence оценки. */
    readonly confidence: string
    /** Data window сигнала. */
    readonly dataWindow: string
    /** Ограничения сигнала. */
    readonly limitations: ReadonlyArray<string>
    /** Топ факторы сигнала. */
    readonly factors: ReadonlyArray<IExplainabilityFactor>
}

function formatImpactLabel(impact: TFactorImpact): string {
    if (impact === "high") {
        return "high impact"
    }
    if (impact === "medium") {
        return "medium impact"
    }
    return "low impact"
}

/**
 * Унифицированный explainability drawer для метрик/скорингов.
 *
 * @param props Конфигурация объяснения сигнала.
 * @returns Блок explainability с экспортом snippet.
 */
export function ExplainabilityPanel(props: IExplainabilityPanelProps): ReactElement {
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
    const [snippet, setSnippet] = useState<string>("")
    const exportSnippet = useMemo((): string => {
        const factorSummary = props.factors
            .map((factor): string => `${factor.label}: ${factor.value}`)
            .join(" | ")
        return `${props.signalLabel}=${props.signalValue}; threshold=${props.threshold}; confidence=${props.confidence}; window=${props.dataWindow}; factors=${factorSummary}`
    }, [props.confidence, props.dataWindow, props.factors, props.signalLabel, props.signalValue, props.threshold])

    return (
        <>
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{props.title}</p>
                        <p className="text-xs text-[var(--foreground)]/70">
                            {`${props.signalLabel}: ${props.signalValue} · threshold ${props.threshold} · confidence ${props.confidence}`}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={(): void => {
                            setIsDrawerOpen(true)
                        }}
                    >
                        Why this score?
                    </Button>
                </div>
            </section>

            <Drawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerContent className="!m-0 !ml-auto !h-full !w-[min(92vw,460px)] !rounded-none bg-[var(--surface)] text-[var(--foreground)]">
                    <DrawerHeader className="border-b border-[var(--border)] px-4 py-3">
                        <h2 className="text-base font-semibold text-[var(--foreground)]">
                            Explainability
                        </h2>
                    </DrawerHeader>
                    <DrawerBody className="space-y-3 px-4 py-3">
                        <dl className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-2 text-sm">
                            <dt className="text-[var(--foreground)]/60">Signal</dt>
                            <dd>{`${props.signalLabel}: ${props.signalValue}`}</dd>
                            <dt className="text-[var(--foreground)]/60">Threshold</dt>
                            <dd>{props.threshold}</dd>
                            <dt className="text-[var(--foreground)]/60">Confidence</dt>
                            <dd>{props.confidence}</dd>
                            <dt className="text-[var(--foreground)]/60">Data window</dt>
                            <dd>{props.dataWindow}</dd>
                        </dl>

                        <section className="space-y-2">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                                Top factors
                            </p>
                            <ul aria-label="Explainability factors" className="space-y-2">
                                {props.factors.map((factor): ReactElement => (
                                    <li
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                                        key={factor.label}
                                    >
                                        <p className="text-sm font-semibold text-[var(--foreground)]">
                                            {factor.label}
                                        </p>
                                        <p className="text-xs text-[var(--foreground)]/70">
                                            {formatImpactLabel(factor.impact)}
                                        </p>
                                        <p className="text-sm text-[var(--foreground)]/80">
                                            {factor.value}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="space-y-2">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                                Known limitations
                            </p>
                            <ul aria-label="Explainability limitations" className="list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]/80">
                                {props.limitations.map((limitation): ReactElement => (
                                    <li key={limitation}>{limitation}</li>
                                ))}
                            </ul>
                        </section>

                        <section className="space-y-2">
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={(): void => {
                                    setSnippet(exportSnippet)
                                }}
                            >
                                Export explanation snippet
                            </Button>
                            {snippet.length > 0 ? (
                                <Textarea
                                    isReadOnly
                                    aria-label="Explainability export snippet"
                                    value={snippet}
                                />
                            ) : null}
                        </section>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    )
}

export type { IExplainabilityFactor, IExplainabilityPanelProps }
