import type { ReactElement } from "react"

import { Button, Card, CardContent } from "@heroui/react"
import { useDynamicTranslation } from "@/lib/i18n"

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
        return "border-danger/30 bg-danger/10 text-danger-foreground"
    }
    if (variant === "loading") {
        return "border-accent/30 bg-accent/10 text-accent-foreground"
    }
    if (variant === "partial") {
        return "border-warning/30 bg-warning/10 text-warning-foreground"
    }
    return "border-border bg-surface text-foreground"
}

function mapStateLabelKey(variant: TSystemStateVariant): string {
    if (variant === "error") {
        return "common:systemStateCard.errorState"
    }
    if (variant === "loading") {
        return "common:systemStateCard.loadingState"
    }
    if (variant === "partial") {
        return "common:systemStateCard.partialDataState"
    }
    return "common:systemStateCard.emptyState"
}

/**
 * Унифицированный route-level шаблон системных состояний.
 *
 * @param props Тип состояния, microcopy и опциональный CTA.
 * @returns Системный state card.
 */
export function SystemStateCard(props: ISystemStateCardProps): ReactElement {
    const { td } = useDynamicTranslation(["common"])
    return (
        <Card className={mapStateTone(props.variant)}>
            <CardContent className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                    {td(mapStateLabelKey(props.variant))}
                </p>
                <p className="text-base font-semibold">{props.title}</p>
                <p className="text-sm opacity-90">{props.description}</p>
                {props.ctaLabel !== undefined && props.onCtaPress !== undefined ? (
                    <Button size="sm" variant="secondary" onPress={props.onCtaPress}>
                        {props.ctaLabel}
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    )
}

export type { TSystemStateVariant, ISystemStateCardProps }
