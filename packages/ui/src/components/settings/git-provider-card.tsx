import type {ReactElement} from "react"

import {Button, Card, CardBody, CardHeader, Chip} from "@/components/ui"

/**
 * Конфиг Git provider.
 */
export interface IGitProviderCardProps {
    /** Провайдер. */
    readonly provider: string
    /** Отображаемое имя аккаунта. */
    readonly account?: string
    /** Подключен ли интегратор. */
    readonly connected: boolean
    /** Время последней синхронизации. */
    readonly lastSyncAt?: string
    /** Callback для disconnect/connect. */
    readonly onAction?: () => Promise<void> | void
}

/**
 * Карточка статуса Git провайдера.
 *
 * @param props Конфигурация.
 * @returns Карточка с кнопкой подключения.
 */
export function GitProviderCard(props: IGitProviderCardProps): ReactElement {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-base font-semibold text-slate-900">{props.provider}</h3>
            </CardHeader>
            <CardBody>
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-600">
                        {props.connected ? `Connected as ${props.account ?? "Unknown"}` : "Not connected"}
                    </p>
                    {props.lastSyncAt === undefined ? null : (
                        <p className="text-xs text-slate-500">Last sync: {props.lastSyncAt}</p>
                    )}
                    <Chip color={props.connected ? "success" : "default"} size="sm">
                        {props.connected ? "Connected" : "Disconnected"}
                    </Chip>
                    <Button
                        className="w-full"
                        size="sm"
                        variant={props.connected ? "bordered" : "solid"}
                        onPress={props.onAction}
                    >
                        {props.connected ? "Reconnect" : "Connect"}
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}
