import { type ReactElement, useMemo, useState } from "react"

import { TestConnectionButton } from "@/components/settings/test-connection-button"
import { Button, Card, CardBody, CardHeader, Chip, Input, Switch } from "@/components/ui"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TIntegrationProvider = "Jira" | "Linear" | "Sentry" | "Slack"
type TIntegrationStatus = "connected" | "degraded" | "disconnected"

interface IIntegrationState {
    /** Название интеграции. */
    readonly provider: TIntegrationProvider
    /** Короткое описание роли интеграции. */
    readonly description: string
    /** Workspace/base path. */
    readonly workspace: string
    /** Ключ проекта/канала/сервиса. */
    readonly target: string
    /** Подключена ли интеграция. */
    readonly connected: boolean
    /** Статус health-check. */
    readonly status: TIntegrationStatus
    /** Включен ли sync в pipeline. */
    readonly syncEnabled: boolean
    /** Включены ли уведомления для интеграции. */
    readonly notificationsEnabled: boolean
    /** Настроен ли секрет/token. */
    readonly secretConfigured: boolean
    /** Время последней синхронизации. */
    readonly lastSyncAt?: string
}

const INITIAL_INTEGRATIONS: ReadonlyArray<IIntegrationState> = [
    {
        connected: true,
        description: "Issue sync и ticket linking для review findings.",
        lastSyncAt: "2026-03-04 09:12",
        notificationsEnabled: true,
        provider: "Jira",
        secretConfigured: true,
        status: "connected",
        syncEnabled: true,
        target: "PLAT",
        workspace: "https://acme.atlassian.net",
    },
    {
        connected: false,
        description: "Lightweight issue routing для triage и ownership.",
        notificationsEnabled: false,
        provider: "Linear",
        secretConfigured: false,
        status: "disconnected",
        syncEnabled: false,
        target: "ENG",
        workspace: "acme-workspace",
    },
    {
        connected: true,
        description: "Production incidents и error alerts correlation.",
        lastSyncAt: "2026-03-04 08:41",
        notificationsEnabled: true,
        provider: "Sentry",
        secretConfigured: true,
        status: "degraded",
        syncEnabled: true,
        target: "web-frontend",
        workspace: "acme-org",
    },
    {
        connected: true,
        description: "Delivery channel for notifications and review events.",
        lastSyncAt: "2026-03-04 09:18",
        notificationsEnabled: true,
        provider: "Slack",
        secretConfigured: true,
        status: "connected",
        syncEnabled: true,
        target: "#code-review",
        workspace: "acme-workspace",
    },
]

function mapStatusChipColor(
    status: TIntegrationStatus,
): "default" | "success" | "warning" {
    if (status === "connected") {
        return "success"
    }

    if (status === "degraded") {
        return "warning"
    }

    return "default"
}

function mapStatusLabel(status: TIntegrationStatus): string {
    if (status === "connected") {
        return "Connected"
    }

    if (status === "degraded") {
        return "Degraded"
    }

    return "Disconnected"
}

function resolveWorkspacePlaceholder(provider: TIntegrationProvider): string {
    if (provider === "Jira") {
        return "https://acme.atlassian.net"
    }

    if (provider === "Linear") {
        return "acme-workspace"
    }

    if (provider === "Sentry") {
        return "acme-org"
    }

    return "acme-workspace"
}

function resolveTargetPlaceholder(provider: TIntegrationProvider): string {
    if (provider === "Jira") {
        return "Project key (PLAT)"
    }

    if (provider === "Linear") {
        return "Team key (ENG)"
    }

    if (provider === "Sentry") {
        return "Project slug (web-frontend)"
    }

    return "Channel (#code-review)"
}

function hasConfigValues(integration: IIntegrationState): boolean {
    return integration.workspace.trim().length > 0 && integration.target.trim().length > 0
}

function updateIntegrationByProvider(
    integrations: ReadonlyArray<IIntegrationState>,
    provider: TIntegrationProvider,
    updater: (integration: IIntegrationState) => IIntegrationState,
): ReadonlyArray<IIntegrationState> {
    return integrations.map((integration): IIntegrationState => {
        if (integration.provider !== provider) {
            return integration
        }

        return updater(integration)
    })
}

/**
 * Страница управления внешними интеграциями.
 *
 * @returns Экран конфигурации Jira/Linear/Sentry/Slack.
 */
export function SettingsIntegrationsPage(): ReactElement {
    const [integrations, setIntegrations] =
        useState<ReadonlyArray<IIntegrationState>>(INITIAL_INTEGRATIONS)

    const summary = useMemo(
        (): { readonly connected: number; readonly degraded: number; readonly disconnected: number } => {
            return integrations.reduce(
                (accumulator, integration): {
                    readonly connected: number
                    readonly degraded: number
                    readonly disconnected: number
                } => {
                    if (integration.status === "connected") {
                        return {
                            ...accumulator,
                            connected: accumulator.connected + 1,
                        }
                    }

                    if (integration.status === "degraded") {
                        return {
                            ...accumulator,
                            degraded: accumulator.degraded + 1,
                        }
                    }

                    return {
                        ...accumulator,
                        disconnected: accumulator.disconnected + 1,
                    }
                },
                {
                    connected: 0,
                    degraded: 0,
                    disconnected: 0,
                },
            )
        },
        [integrations],
    )

    const setWorkspace = (provider: TIntegrationProvider, workspace: string): void => {
        setIntegrations((previous): ReadonlyArray<IIntegrationState> =>
            updateIntegrationByProvider(
                previous,
                provider,
                (integration): IIntegrationState => ({
                    ...integration,
                    workspace,
                }),
            ),
        )
    }

    const setTarget = (provider: TIntegrationProvider, target: string): void => {
        setIntegrations((previous): ReadonlyArray<IIntegrationState> =>
            updateIntegrationByProvider(
                previous,
                provider,
                (integration): IIntegrationState => ({
                    ...integration,
                    target,
                }),
            ),
        )
    }

    const setSyncEnabled = (provider: TIntegrationProvider, syncEnabled: boolean): void => {
        setIntegrations((previous): ReadonlyArray<IIntegrationState> =>
            updateIntegrationByProvider(
                previous,
                provider,
                (integration): IIntegrationState => ({
                    ...integration,
                    syncEnabled,
                }),
            ),
        )
    }

    const setNotificationsEnabled = (
        provider: TIntegrationProvider,
        notificationsEnabled: boolean,
    ): void => {
        setIntegrations((previous): ReadonlyArray<IIntegrationState> =>
            updateIntegrationByProvider(
                previous,
                provider,
                (integration): IIntegrationState => ({
                    ...integration,
                    notificationsEnabled,
                }),
            ),
        )
    }

    const handleSaveConfiguration = (provider: TIntegrationProvider): void => {
        setIntegrations((previous): ReadonlyArray<IIntegrationState> =>
            updateIntegrationByProvider(
                previous,
                provider,
                (integration): IIntegrationState => {
                    const configReady = hasConfigValues(integration)
                    const nextStatus =
                        integration.connected !== true
                            ? "disconnected"
                            : configReady
                              ? "connected"
                              : "degraded"

                    return {
                        ...integration,
                        secretConfigured: configReady,
                        status: nextStatus,
                    }
                },
            ),
        )
        showToastSuccess(`${provider} configuration saved.`)
    }

    const handleToggleConnection = (provider: TIntegrationProvider): void => {
        setIntegrations((previous): ReadonlyArray<IIntegrationState> =>
            updateIntegrationByProvider(
                previous,
                provider,
                (integration): IIntegrationState => {
                    const shouldConnect = integration.connected !== true
                    if (shouldConnect !== true) {
                        return {
                            ...integration,
                            connected: false,
                            status: "disconnected",
                        }
                    }

                    const configReady = hasConfigValues(integration)
                    return {
                        ...integration,
                        connected: true,
                        lastSyncAt: new Date().toISOString(),
                        status: configReady ? "connected" : "degraded",
                    }
                },
            ),
        )
        showToastInfo(`${provider} connection state updated.`)
    }

    const handleTestConnection = async (
        provider: TIntegrationProvider,
    ): Promise<boolean> => {
        const integration = integrations.find(
            (item): boolean => item.provider === provider,
        )
        const isHealthy =
            integration !== undefined
            && integration.connected === true
            && integration.secretConfigured === true
            && hasConfigValues(integration)

        setIntegrations((previous): ReadonlyArray<IIntegrationState> =>
            updateIntegrationByProvider(
                previous,
                provider,
                (current): IIntegrationState => {
                    if (current.connected !== true) {
                        return current
                    }

                    return {
                        ...current,
                        lastSyncAt: new Date().toISOString(),
                        status: isHealthy ? "connected" : "degraded",
                    }
                },
            ),
        )

        if (isHealthy) {
            showToastSuccess(`${provider} is healthy.`)
            return true
        }

        showToastError(`${provider} health check failed.`)
        return false
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
            <p className="text-sm text-slate-600">
                Configure Jira, Linear, Sentry and Slack connections for issues, alerts and
                notifications.
            </p>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-slate-900">
                        Connection health summary
                    </p>
                </CardHeader>
                <CardBody className="grid gap-2 text-sm sm:grid-cols-3">
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                        Connected: <span className="font-semibold">{summary.connected}</span>
                    </p>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                        Degraded: <span className="font-semibold">{summary.degraded}</span>
                    </p>
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                        Disconnected: <span className="font-semibold">{summary.disconnected}</span>
                    </p>
                </CardBody>
            </Card>

            <div className="space-y-4">
                {integrations.map((integration): ReactElement => (
                    <Card key={integration.provider}>
                        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-base font-semibold text-slate-900">
                                    {integration.provider}
                                </p>
                                <p className="text-sm text-slate-600">
                                    {integration.description}
                                </p>
                            </div>
                            <Chip
                                color={mapStatusChipColor(integration.status)}
                                size="sm"
                                variant="flat"
                            >
                                {mapStatusLabel(integration.status)}
                            </Chip>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <Input
                                    label="Workspace / endpoint"
                                    onValueChange={(value): void => {
                                        setWorkspace(integration.provider, value)
                                    }}
                                    placeholder={resolveWorkspacePlaceholder(integration.provider)}
                                    value={integration.workspace}
                                />
                                <Input
                                    label="Target"
                                    onValueChange={(value): void => {
                                        setTarget(integration.provider, value)
                                    }}
                                    placeholder={resolveTargetPlaceholder(integration.provider)}
                                    value={integration.target}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <Switch
                                    isSelected={integration.syncEnabled}
                                    onValueChange={(value): void => {
                                        setSyncEnabled(integration.provider, value)
                                    }}
                                >
                                    Enable sync
                                </Switch>
                                <Switch
                                    isSelected={integration.notificationsEnabled}
                                    onValueChange={(value): void => {
                                        setNotificationsEnabled(integration.provider, value)
                                    }}
                                >
                                    Enable notifications
                                </Switch>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <TestConnectionButton
                                    onTest={async (): Promise<boolean> =>
                                        handleTestConnection(integration.provider)}
                                    providerLabel={integration.provider}
                                />
                                <Button
                                    onPress={(): void => {
                                        handleToggleConnection(integration.provider)
                                    }}
                                    size="sm"
                                    variant={
                                        integration.connected === true ? "secondary" : "solid"
                                    }
                                >
                                    {integration.connected === true ? "Disconnect" : "Connect"}
                                </Button>
                                <Button
                                    onPress={(): void => {
                                        handleSaveConfiguration(integration.provider)
                                    }}
                                    size="sm"
                                    variant="light"
                                >
                                    Save configuration
                                </Button>
                            </div>

                            <p className="text-xs text-slate-500">
                                Secret/token:{" "}
                                {integration.secretConfigured === true ? "configured" : "not configured"}{" "}
                                · Last sync: {integration.lastSyncAt ?? "not synced yet"}
                            </p>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </section>
    )
}
