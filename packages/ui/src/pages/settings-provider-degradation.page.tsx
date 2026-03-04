import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
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
    const [providerState, setProviderState] = useState<IProviderState>(DEFAULT_PROVIDER_STATE)
    const [queuedActions, setQueuedActions] = useState<ReadonlyArray<IQueuedAction>>([])

    const canQueueCriticalAction = providerState.level === "degraded"
    const incidentMessage = useMemo((): string => {
        if (providerState.level === "operational") {
            return "All providers are operational."
        }

        return `Provider ${providerState.provider} is degraded. Queue mode is active.`
    }, [providerState.level, providerState.provider])

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
        showToastInfo("Global degradation mode activated.")
    }

    const handleMarkOperational = (): void => {
        const nextState: IProviderState = {
            ...DEFAULT_PROVIDER_STATE,
            provider: providerState.provider,
        }
        setProviderState(nextState)
        dispatchDegradationEvent(nextState)
        setQueuedActions([])
        showToastSuccess("Provider marked as operational.")
    }

    const handleQueueCriticalAction = (): void => {
        if (canQueueCriticalAction !== true) {
            return
        }

        setQueuedActions((previous): ReadonlyArray<IQueuedAction> => [
            {
                description: "CCR finalization webhook",
                id: `QACT-${Date.now().toString(36)}`,
                status: "queued",
            },
            ...previous,
        ])
    }

    const handleRetryQueuedActions = (): void => {
        setQueuedActions((previous): ReadonlyArray<IQueuedAction> =>
            previous.map((action): IQueuedAction => ({
                ...action,
                status: providerState.level === "operational" ? "sent" : "retrying",
            })),
        )
        showToastInfo("Queued actions processed with current provider state.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                Provider degradation mode
            </h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Monitor affected features, keep critical actions in queue/retry mode and provide
                quick incident runbook access.
            </p>

            <Alert
                color={providerState.level === "degraded" ? "danger" : "success"}
                title={providerState.level === "degraded" ? "Degraded mode active" : "Operational mode"}
                variant="flat"
            >
                {incidentMessage}
            </Alert>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Incident controls</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip
                            color={providerState.level === "degraded" ? "danger" : "success"}
                            size="sm"
                            variant="flat"
                        >
                            {providerState.provider} · {providerState.level}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            ETA: {providerState.eta}
                        </Chip>
                    </div>
                    {providerState.affectedFeatures.length === 0 ? (
                        <p className="text-sm text-[var(--foreground)]/70">No affected features.</p>
                    ) : (
                        <ul aria-label="Affected features list" className="space-y-1">
                            {providerState.affectedFeatures.map((feature): ReactElement => (
                                <li className="text-sm text-[var(--foreground)]/80" key={feature}>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button onPress={handleSimulateOutage}>Simulate outage</Button>
                        <Button variant="flat" onPress={handleMarkOperational}>
                            Mark operational
                        </Button>
                        <a
                            className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--foreground)]/80"
                            href={providerState.runbookUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            Open runbook
                        </a>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Queue & retry for critical actions
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="flex gap-2">
                        <Button
                            isDisabled={canQueueCriticalAction !== true}
                            size="sm"
                            onPress={handleQueueCriticalAction}
                        >
                            Queue critical action
                        </Button>
                        <Button size="sm" variant="flat" onPress={handleRetryQueuedActions}>
                            Retry queued actions
                        </Button>
                    </div>
                    <ul aria-label="Queued critical actions list" className="space-y-2">
                        {queuedActions.map((action): ReactElement => (
                            <li
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                                key={action.id}
                            >
                                <p className="font-semibold text-[var(--foreground)]">{action.description}</p>
                                <p className="text-[var(--foreground)]/70">Status: {action.status}</p>
                            </li>
                        ))}
                    </ul>
                    {queuedActions.length === 0 ? (
                        <p className="text-sm text-[var(--foreground)]/70">
                            No critical actions in queue.
                        </p>
                    ) : null}
                </CardBody>
            </Card>
        </section>
    )
}
