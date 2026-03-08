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
        return "border-danger/30 bg-danger/10 text-rose-900"
    }
    if (variant === "loading") {
        return "border-primary/30 bg-primary/10 text-blue-900"
    }
    if (variant === "partial") {
        return "border-warning/30 bg-warning/10 text-amber-900"
    }
    return "border-border bg-surface text-foreground"
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
