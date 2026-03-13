import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
    /** Индикатор загрузки действия. */
    readonly isLoading?: boolean
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
    const { t } = useTranslation(["settings"])

    return (
        <Card>
            <CardHeader>
                <h3 className={TYPOGRAPHY.sectionTitle}>{props.provider}</h3>
            </CardHeader>
            <CardBody>
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                        {props.connected
                            ? t("settings:gitProviderCard.connectedAs", {
                                  account: props.account ?? "Unknown",
                              })
                            : t("settings:gitProviderCard.notConnected")}
                    </p>
                    {props.lastSyncAt === undefined ? null : (
                        <p className={TYPOGRAPHY.captionMuted}>
                            {t("settings:gitProviderCard.lastSync", { date: props.lastSyncAt })}
                        </p>
                    )}
                    <Chip color={props.connected ? "success" : "default"} size="sm">
                        {props.connected
                            ? t("settings:gitProviderCard.statusConnected")
                            : t("settings:gitProviderCard.statusDisconnected")}
                    </Chip>
                    <Button
                        className="w-full"
                        isLoading={props.isLoading === true}
                        size="sm"
                        variant={props.connected ? "bordered" : "solid"}
                        isDisabled={props.onAction === undefined}
                        onPress={(): void => {
                            if (props.onAction === undefined) {
                                return
                            }

                            void props.onAction()
                        }}
                    >
                        {props.connected
                            ? t("settings:gitProviderCard.disconnect")
                            : t("settings:gitProviderCard.connect")}
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}
