import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { IProviderDegradationEventDetail } from "@/lib/providers/degradation-mode"
import type { IShortcutConflict } from "@/lib/keyboard/shortcut-registry"
import { AnimatePresence, motion } from "motion/react"

import { Alert } from "@heroui/react"

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
 * Набор animated alert баннеров для глобальных уведомлений dashboard.
 *
 * @param props Данные для отображения уведомлений.
 * @returns Список animated alert баннеров.
 */
export function NotificationAlerts(props: INotificationAlertsProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    return (
        <>
            <AnimatePresence>
                {props.shortcutConflicts.length > 0 ? (
                    <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] }}
                    >
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
                    </motion.div>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {props.multiTabNotice !== undefined ? (
                    <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] }}
                    >
                        <Alert status="accent">
                            <Alert.Title>
                                {t("navigation:notifications.multiTabSyncTitle")}
                            </Alert.Title>
                            <Alert.Description>{props.multiTabNotice}</Alert.Description>
                        </Alert>
                    </motion.div>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {props.providerDegradation !== undefined ? (
                    <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] }}
                    >
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
                    </motion.div>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {props.policyDriftNotice !== undefined ? (
                    <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] }}
                    >
                        <Alert status="warning">
                            <Alert.Title>
                                {t("navigation:notifications.policyDriftTitle")}
                            </Alert.Title>
                            <Alert.Description>{props.policyDriftNotice}</Alert.Description>
                        </Alert>
                    </motion.div>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {props.restoredDraftMessage !== undefined ? (
                    <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] }}
                    >
                        <Alert status="success">
                            <Alert.Title>
                                {t("navigation:notifications.sessionRecoveredTitle")}
                            </Alert.Title>
                            <Alert.Description>{props.restoredDraftMessage}</Alert.Description>
                        </Alert>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </>
    )
}
