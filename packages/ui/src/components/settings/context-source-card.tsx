import type { ReactElement } from "react"

import { Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import type {
    IExternalContextSource,
    TExternalContextStatus,
} from "@/lib/api/endpoints/external-context.endpoint"

/** Параметры карточки внешнего context-source. */
export interface IContextSourceCardProps {
    /** Описание source. */
    readonly source: IExternalContextSource
    /** Выбран ли source в UI. */
    readonly selected?: boolean
    /** Состояние загрузки действий по source. */
    readonly isLoading?: boolean
    /** Обработчик enable/disable source. */
    readonly onToggleEnabled?: (sourceId: string, nextEnabled: boolean) => Promise<void> | void
    /** Обработчик ручного refresh. */
    readonly onRefresh?: (sourceId: string) => Promise<void> | void
    /** Обработчик выбора карточки. */
    readonly onSelect?: (sourceId: string) => void
}

function resolveStatusColor(status: TExternalContextStatus): "default" | "success" | "warning" {
    if (status === "CONNECTED") {
        return "success"
    }

    if (status === "DEGRADED" || status === "SYNCING") {
        return "warning"
    }

    return "default"
}

function formatStatusLabel(status: TExternalContextStatus): string {
    if (status === "CONNECTED") {
        return "Connected"
    }
    if (status === "DEGRADED") {
        return "Degraded"
    }
    if (status === "SYNCING") {
        return "Syncing"
    }
    return "Disconnected"
}

/**
 * Карточка внешнего context-source с действиями управления.
 *
 * @param props Параметры source-карточки.
 * @returns Виджет источника внешнего контекста.
 */
export function ContextSourceCard(props: IContextSourceCardProps): ReactElement {
    const { source } = props

    return (
        <Card
            className={
                props.selected === true
                    ? "border-2 border-primary-300"
                    : "border border-default-200"
            }
            isPressable={props.onSelect !== undefined}
            onPress={(): void => {
                if (props.onSelect === undefined) {
                    return
                }
                props.onSelect(source.id)
            }}
        >
            <CardHeader className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{source.name}</h3>
                    <p className="text-xs text-foreground-500">{source.type}</p>
                </div>
                <Chip color={resolveStatusColor(source.status)} size="sm" variant="flat">
                    {formatStatusLabel(source.status)}
                </Chip>
            </CardHeader>
            <CardBody className="space-y-3">
                <p className="text-xs text-foreground-600">
                    {`Items: ${source.itemCount} · Last sync: ${source.lastSyncedAt ?? "n/a"}`}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button
                        isDisabled={props.onToggleEnabled === undefined || props.isLoading === true}
                        size="sm"
                        variant={source.enabled ? "bordered" : "solid"}
                        onPress={(): void => {
                            if (props.onToggleEnabled === undefined) {
                                return
                            }
                            void props.onToggleEnabled(source.id, source.enabled !== true)
                        }}
                    >
                        {source.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                        isDisabled={props.onRefresh === undefined || props.isLoading === true}
                        size="sm"
                        variant="flat"
                        onPress={(): void => {
                            if (props.onRefresh === undefined) {
                                return
                            }
                            void props.onRefresh(source.id)
                        }}
                    >
                        Refresh
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}
