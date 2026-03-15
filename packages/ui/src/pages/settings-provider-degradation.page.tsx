import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Chip } from "@heroui/react"
import { FormLayout } from "@/components/forms/form-layout"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import {
    PROVIDER_DEGRADATION_EVENT,
    type IProviderDegradationEventDetail,
    type TDegradationLevel,
    type TDegradedProvider,
} from "@/lib/providers/degradation-mode"

interface IQueuedAction {
    /** Уникальный id queued action. */
    readonly id: string
    /** Описание критичного действия. */
    readonly description: string
    /** Текущий статус в queue/retry режиме. */
    readonly status: "queued" | "retrying" | "sent"
}

interface IProviderState {
    /** Провайдер. */
    readonly provider: TDegradedProvider
    /** Уровень доступности. */
    readonly level: TDegradationLevel
    /** Затронутые фичи. */
    readonly affectedFeatures: ReadonlyArray<string>
    /** ETA восстановления. */
    readonly eta: string
    /** Ссылка на incident runbook. */
    readonly runbookUrl: string
}

const DEFAULT_PROVIDER_STATE: IProviderState = {
    affectedFeatures: [],
    eta: "stable",
    level: "operational",
    provider: "llm",
    runbookUrl: "https://status.codenautic.local/runbooks/llm",
}

/**
 * Экран provider degradation mode.
 *
 * @returns Управление degraded banner, affected features и queue/retry сценариями.
 */
export function SettingsProviderDegradationPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const [providerState, setProviderState] = useState<IProviderState>(DEFAULT_PROVIDER_STATE)
    const [queuedActions, setQueuedActions] = useState<ReadonlyArray<IQueuedAction>>([])

    const canQueueCriticalAction = providerState.level === "degraded"
    const incidentMessage = useMemo((): string => {
        if (providerState.level === "operational") {
            return t("settings:providerDegradation.allProvidersOperational")
        }

        return t("settings:providerDegradation.providerDegraded", {
            provider: providerState.provider,
        })
    }, [providerState.level, providerState.provider, t])

    const dispatchDegradationEvent = (detail: IProviderDegradationEventDetail): void => {
        window.dispatchEvent(
            new CustomEvent(PROVIDER_DEGRADATION_EVENT, {
                detail,
            }),
        )
    }

    const handleSimulateOutage = (): void => {
        const nextState: IProviderState = {
            affectedFeatures: ["Review generation", "Auto summary", "Chat completion"],
            eta: "25m",
            level: "degraded",
            provider: "llm",
            runbookUrl: "https://status.codenautic.local/runbooks/llm",
        }
        setProviderState(nextState)
        dispatchDegradationEvent(nextState)
        showToastInfo(t("settings:providerDegradation.toast.degradationActivated"))
    }

    const handleMarkOperational = (): void => {
        const nextState: IProviderState = {
            ...DEFAULT_PROVIDER_STATE,
            provider: providerState.provider,
        }
        setProviderState(nextState)
        dispatchDegradationEvent(nextState)
        setQueuedActions([])
        showToastSuccess(t("settings:providerDegradation.toast.markedOperational"))
    }

    const handleQueueCriticalAction = (): void => {
        if (canQueueCriticalAction !== true) {
            return
        }

        setQueuedActions(
            (previous): ReadonlyArray<IQueuedAction> => [
                {
                    description: "CCR finalization webhook",
                    id: `QACT-${Date.now().toString(36)}`,
                    status: "queued",
                },
                ...previous,
            ],
        )
    }

    const handleRetryQueuedActions = (): void => {
        setQueuedActions(
            (previous): ReadonlyArray<IQueuedAction> =>
                previous.map(
                    (action): IQueuedAction => ({
                        ...action,
                        status: providerState.level === "operational" ? "sent" : "retrying",
                    }),
                ),
        )
        showToastInfo(t("settings:providerDegradation.toast.queuedActionsProcessed"))
    }

    return (
        <FormLayout
            title={t("settings:providerDegradation.pageTitle")}
            description={t("settings:providerDegradation.pageSubtitle")}
        >
            <Alert status={providerState.level === "degraded" ? "danger" : "success"}>
                <Alert.Title>
                    {providerState.level === "degraded"
                        ? t("settings:providerDegradation.degradedModeActive")
                        : t("settings:providerDegradation.operationalMode")}
                </Alert.Title>
                <Alert.Description>{incidentMessage}</Alert.Description>
            </Alert>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:providerDegradation.incidentControls")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip
                            color={providerState.level === "degraded" ? "danger" : "success"}
                            size="sm"
                            variant="soft"
                        >
                            {providerState.provider} · {providerState.level}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            ETA: {providerState.eta}
                        </Chip>
                    </div>
                    {providerState.affectedFeatures.length === 0 ? (
                        <p className="text-sm text-muted">
                            {t("settings:providerDegradation.noAffectedFeatures")}
                        </p>
                    ) : (
                        <ul
                            aria-label={t(
                                "settings:ariaLabel.providerDegradation.affectedFeaturesList",
                            )}
                            className="space-y-1"
                        >
                            {providerState.affectedFeatures.map(
                                (feature): ReactElement => (
                                    <li className="text-sm text-muted" key={feature}>
                                        {feature}
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button variant="primary" onPress={handleSimulateOutage}>
                            {t("settings:providerDegradation.simulateOutage")}
                        </Button>
                        <Button variant="secondary" onPress={handleMarkOperational}>
                            {t("settings:providerDegradation.markOperational")}
                        </Button>
                        <a
                            className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm text-muted"
                            href={providerState.runbookUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {t("settings:providerDegradation.openRunbook")}
                        </a>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:providerDegradation.queueRetry")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Button
                            isDisabled={canQueueCriticalAction !== true}
                            size="sm"
                            onPress={handleQueueCriticalAction}
                        >
                            {t("settings:providerDegradation.queueCriticalAction")}
                        </Button>
                        <Button size="sm" variant="secondary" onPress={handleRetryQueuedActions}>
                            {t("settings:providerDegradation.retryQueuedActions")}
                        </Button>
                    </div>
                    <ul
                        aria-label={t(
                            "settings:ariaLabel.providerDegradation.queuedCriticalActionsList",
                        )}
                        className="space-y-2"
                    >
                        {queuedActions.map(
                            (action): ReactElement => (
                                <li
                                    className="rounded-lg border border-border bg-surface p-3 text-sm"
                                    key={action.id}
                                >
                                    <p className="font-semibold text-foreground">
                                        {action.description}
                                    </p>
                                    <p className="text-muted">Status: {action.status}</p>
                                </li>
                            ),
                        )}
                    </ul>
                    {queuedActions.length === 0 ? (
                        <p className="text-sm text-muted">
                            {t("settings:providerDegradation.noCriticalActionsInQueue")}
                        </p>
                    ) : null}
                </CardContent>
            </Card>
        </FormLayout>
    )
}
