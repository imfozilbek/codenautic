import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

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
        return "border-danger/30 bg-danger/10 text-on-danger"
    }
    if (variant === "loading") {
        return "border-primary/30 bg-primary/10 text-on-primary"
    }
    if (variant === "partial") {
        return "border-warning/30 bg-warning/10 text-on-warning"
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
    const { t } = useTranslation(["common"])
    return (
        <Card className={mapStateTone(props.variant)}>
            <CardBody className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                    {(t as unknown as (key: string) => string)(mapStateLabelKey(props.variant))}
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
