import { type ReactElement } from "react"

import type { IProviderDegradationEventDetail } from "@/lib/providers/degradation-mode"
import type { IShortcutConflict } from "@/lib/keyboard/shortcut-registry"
import { Alert } from "@/components/ui"
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
    return (
        <>
            <AnimatedAlert isVisible={props.shortcutConflicts.length > 0}>
                <Alert
                    color="warning"
                    title="Keyboard shortcut conflicts detected"
                    variant="flat"
                >
                    {props.shortcutConflicts
                        .map((conflict): string => {
                            return `${conflict.signature}: ${conflict.ids.join(", ")}`
                        })
                        .join(" | ")}
                </Alert>
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.multiTabNotice !== undefined}>
                <Alert color="primary" title="Multi-tab sync applied" variant="flat">
                    {props.multiTabNotice}
                </Alert>
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.providerDegradation !== undefined}>
                {props.providerDegradation !== undefined ? (
                    <Alert color="danger" title="Provider degradation mode" variant="flat">
                        {props.providerDegradation.provider} degraded. Affected:{" "}
                        {props.providerDegradation.affectedFeatures.join(", ")}. ETA:{" "}
                        {props.providerDegradation.eta}.{" "}
                        <a
                            className="underline underline-offset-4"
                            href={props.providerDegradation.runbookUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            Open runbook
                        </a>
                    </Alert>
                ) : null}
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.policyDriftNotice !== undefined}>
                <Alert color="warning" title="Runtime policy drift detected" variant="flat">
                    {props.policyDriftNotice}
                </Alert>
            </AnimatedAlert>
            <AnimatedAlert isVisible={props.restoredDraftMessage !== undefined}>
                <Alert color="success" title="Session recovered" variant="flat">
                    {props.restoredDraftMessage}
                </Alert>
            </AnimatedAlert>
        </>
    )
}
