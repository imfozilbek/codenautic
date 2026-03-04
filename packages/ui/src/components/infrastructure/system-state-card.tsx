import type { ReactElement } from "react"

import { Button, Card, CardBody } from "@/components/ui"

type TSystemStateVariant = "empty" | "error" | "loading" | "partial"

interface ISystemStateCardProps {
    /** Вариант системного состояния. */
    readonly variant: TSystemStateVariant
    /** Заголовок состояния. */
    readonly title: string
    /** Поясняющий текст. */
    readonly description: string
    /** Текст CTA кнопки. */
    readonly ctaLabel?: string
    /** Действие CTA кнопки. */
    readonly onCtaPress?: () => void
}

function mapStateTone(variant: TSystemStateVariant): string {
    if (variant === "error") {
        return "border-rose-200 bg-rose-50 text-rose-900"
    }
    if (variant === "loading") {
        return "border-blue-200 bg-blue-50 text-blue-900"
    }
    if (variant === "partial") {
        return "border-amber-200 bg-amber-50 text-amber-900"
    }
    return "border-slate-200 bg-slate-50 text-slate-900"
}

function mapStateLabel(variant: TSystemStateVariant): string {
    if (variant === "error") {
        return "Error state"
    }
    if (variant === "loading") {
        return "Loading state"
    }
    if (variant === "partial") {
        return "Partial data state"
    }
    return "Empty state"
}

/**
 * Унифицированный route-level шаблон системных состояний.
 *
 * @param props Тип состояния, microcopy и опциональный CTA.
 * @returns Системный state card.
 */
export function SystemStateCard(props: ISystemStateCardProps): ReactElement {
    return (
        <Card className={mapStateTone(props.variant)}>
            <CardBody className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                    {mapStateLabel(props.variant)}
                </p>
                <p className="text-base font-semibold">{props.title}</p>
                <p className="text-sm opacity-90">{props.description}</p>
                {props.ctaLabel !== undefined && props.onCtaPress !== undefined ? (
                    <Button size="sm" variant="flat" onPress={props.onCtaPress}>
                        {props.ctaLabel}
                    </Button>
                ) : null}
            </CardBody>
        </Card>
    )
}

export type { TSystemStateVariant, ISystemStateCardProps }
