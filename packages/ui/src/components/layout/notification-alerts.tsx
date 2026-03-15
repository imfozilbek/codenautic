import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { IProviderDegradationEventDetail } from "@/lib/providers/degradation-mode"
import type { IShortcutConflict } from "@/lib/keyboard/shortcut-registry"
import { Alert } from "@heroui/react"
import { AnimatedAlert } from "@/lib/motion"

/**
 * Свойства компонента уведомлений dashboard.
 */
export interface INotificationAlertsProps {
    /** Конфликты keyboard shortcuts. */
    readonly shortcutConflicts: ReadonlyArray<IShortcutConflict>
    /** Уведомление о multi-tab sync. */
    readonly multiTabNotice: string | undefined
    /** Детали деградации провайдера. */
    readonly providerDegradation: IProviderDegradationEventDetail | undefined
    /** Уведомление о policy drift. */
    readonly policyDriftNotice: string | undefined
    /** Сообщение о восстановленном черновике. */
    readonly restoredDraftMessage: string | undefined
}

/**
 * Набор AnimatedAlert баннеров для глобальных уведомлений dashboard.
 *
 * @param props Данные для отображения уведомлений.
 * @returns Список animated alert баннеров.
 */
export function NotificationAlerts(props: INotificationAlertsProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    return (
        <>
            <AnimatedAlert isVisible={props.shortcutConflicts.length > 0}>
                <Alert status="warning">
                    <Alert.Title>
                        {t("navigation:notifications.shortcutConflictsTitle")}
                    </Alert.Title>
                    <Alert.Description>
                        {props.shortcutConflicts
                            .map((conflict): string => {
                                return `${conflict.signature}: ${conflict.ids.join(", ")}`
                            })
                            .join(" | ")}
                    </Alert.Description>
                </Alert>
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.multiTabNotice !== undefined}>
                <Alert status="accent">
                    <Alert.Title>{t("navigation:notifications.multiTabSyncTitle")}</Alert.Title>
                    <Alert.Description>{props.multiTabNotice}</Alert.Description>
                </Alert>
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.providerDegradation !== undefined}>
                {props.providerDegradation !== undefined ? (
                    <Alert status="danger">
                        <Alert.Title>
                            {t("navigation:notifications.providerDegradationTitle")}
                        </Alert.Title>
                        <Alert.Description>
                            {t("navigation:notifications.providerDegradationMessage", {
                                provider: props.providerDegradation.provider,
                                features: props.providerDegradation.affectedFeatures.join(", "),
                                eta: props.providerDegradation.eta,
                            })}{" "}
                            <a
                                className="underline underline-offset-4"
                                href={props.providerDegradation.runbookUrl}
                                rel="noreferrer"
                                target="_blank"
                            >
                                {t("navigation:notifications.openRunbook")}
                            </a>
                        </Alert.Description>
                    </Alert>
                ) : null}
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.policyDriftNotice !== undefined}>
                <Alert status="warning">
                    <Alert.Title>{t("navigation:notifications.policyDriftTitle")}</Alert.Title>
                    <Alert.Description>{props.policyDriftNotice}</Alert.Description>
                </Alert>
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.restoredDraftMessage !== undefined}>
                <Alert status="success">
                    <Alert.Title>{t("navigation:notifications.sessionRecoveredTitle")}</Alert.Title>
                    <Alert.Description>{props.restoredDraftMessage}</Alert.Description>
                </Alert>
            </AnimatedAlert>
        </>
    )
}
