import { type ReactElement, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ContextPreview } from "@/components/settings/context-preview"
import { ContextSourceCard } from "@/components/settings/context-source-card"
import { TestConnectionButton } from "@/components/settings/test-connection-button"
import { Button, Card, CardBody, CardHeader, Chip, Input, Switch } from "@/components/ui"
import { FormLayout } from "@/components/forms/form-layout"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { useExternalContext } from "@/lib/hooks/queries/use-external-context"
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
        description: "Issue sync and ticket linking for review findings.",
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
        description: "Lightweight issue routing for triage and ownership.",
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
        description: "Production incidents and error alerts correlation.",
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

function mapStatusChipColor(status: TIntegrationStatus): "default" | "success" | "warning" {
    if (status === "connected") {
        return "success"
    }

    if (status === "degraded") {
        return "warning"
    }

    return "default"
}

function mapStatusLabelKey(status: TIntegrationStatus): string {
    if (status === "connected") {
        return "connected"
    }

    if (status === "degraded") {
        return "degraded"
    }

    return "disconnected"
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
    const { t } = useTranslation(["settings"])
    const [integrations, setIntegrations] =
        useState<ReadonlyArray<IIntegrationState>>(INITIAL_INTEGRATIONS)
    const [selectedContextSourceId, setSelectedContextSourceId] = useState<string | undefined>(
        undefined,
    )
    const externalContext = useExternalContext({
        selectedSourceId: selectedContextSourceId,
        previewEnabled: selectedContextSourceId !== undefined,
    })

    const summary = useMemo((): {
        readonly connected: number
        readonly degraded: number
        readonly disconnected: number
    } => {
        return integrations.reduce(
            (
                accumulator,
                integration,
            ): {
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
    }, [integrations])

    useEffect((): void => {
        if (selectedContextSourceId !== undefined) {
            return
        }

        const firstSourceId = externalContext.sourcesQuery.data?.sources.at(0)?.id
        if (firstSourceId === undefined) {
            return
        }

        setSelectedContextSourceId(firstSourceId)
    }, [externalContext.sourcesQuery.data?.sources, selectedContextSourceId])

    const setWorkspace = (provider: TIntegrationProvider, workspace: string): void => {
        setIntegrations(
            (previous): ReadonlyArray<IIntegrationState> =>
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
        setIntegrations(
            (previous): ReadonlyArray<IIntegrationState> =>
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
        setIntegrations(
            (previous): ReadonlyArray<IIntegrationState> =>
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
        setIntegrations(
            (previous): ReadonlyArray<IIntegrationState> =>
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
        setIntegrations(
            (previous): ReadonlyArray<IIntegrationState> =>
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
        showToastSuccess(t("settings:integrations.toast.configSaved", { provider }))
    }

    const handleToggleConnection = (provider: TIntegrationProvider): void => {
        setIntegrations(
            (previous): ReadonlyArray<IIntegrationState> =>
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
        showToastInfo(t("settings:integrations.toast.connectionStateUpdated", { provider }))
    }

    const handleTestConnection = (provider: TIntegrationProvider): boolean => {
        const integration = integrations.find((item): boolean => item.provider === provider)
        const isHealthy =
            integration !== undefined &&
            integration.connected === true &&
            integration.secretConfigured === true &&
            hasConfigValues(integration)

        setIntegrations(
            (previous): ReadonlyArray<IIntegrationState> =>
                updateIntegrationByProvider(previous, provider, (current): IIntegrationState => {
                    if (current.connected !== true) {
                        return current
                    }

                    return {
                        ...current,
                        lastSyncAt: new Date().toISOString(),
                        status: isHealthy ? "connected" : "degraded",
                    }
                }),
        )

        if (isHealthy) {
            showToastSuccess(t("settings:integrations.toast.providerHealthy", { provider }))
            return true
        }

        showToastError(t("settings:integrations.toast.healthCheckFailed", { provider }))
        return false
    }

    const handleToggleContextSource = async (
        sourceId: string,
        nextEnabled: boolean,
    ): Promise<void> => {
        try {
            await externalContext.updateSource.mutateAsync({
                sourceId,
                enabled: nextEnabled,
            })
            showToastSuccess(t("settings:integrations.toast.contextSourceUpdated"))
        } catch {
            showToastError(t("settings:integrations.toast.unableToUpdateContextSource"))
        }
    }

    const handleRefreshContextSource = async (sourceId: string): Promise<void> => {
        try {
            await externalContext.refreshSource.mutateAsync(sourceId)
            showToastInfo(t("settings:integrations.toast.contextSourceRefreshQueued"))
        } catch {
            showToastError(t("settings:integrations.toast.unableToQueueRefresh"))
        }
    }

    const selectedContextSource = externalContext.sourcesQuery.data?.sources.find(
        (source): boolean => source.id === selectedContextSourceId,
    )

    return (
        <FormLayout
            title={t("settings:integrations.pageTitle")}
            description={t("settings:integrations.pageSubtitle")}
        >

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:integrations.connectionHealthSummary")}
                    </p>
                </CardHeader>
                <CardBody className="grid gap-2 text-sm sm:grid-cols-3">
                    <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-success">
                        {t("settings:integrations.connected")}{" "}
                        <span className="font-semibold">{summary.connected}</span>
                    </p>
                    <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning">
                        {t("settings:integrations.degraded")}{" "}
                        <span className="font-semibold">{summary.degraded}</span>
                    </p>
                    <p className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground">
                        {t("settings:integrations.disconnected")}{" "}
                        <span className="font-semibold">{summary.disconnected}</span>
                    </p>
                </CardBody>
            </Card>

            <div className="space-y-4">
                {integrations.map(
                    (integration): ReactElement => (
                        <Card key={integration.provider}>
                            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className={TYPOGRAPHY.sectionTitle}>
                                        {integration.provider}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {integration.description}
                                    </p>
                                </div>
                                <Chip
                                    color={mapStatusChipColor(integration.status)}
                                    size="sm"
                                    variant="flat"
                                >
                                    {(t as unknown as (key: string) => string)(`settings:integrations.${mapStatusLabelKey(integration.status)}`)}
                                </Chip>
                            </CardHeader>
                            <CardBody className="space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Input
                                        label={t("settings:integrations.workspaceEndpoint")}
                                        onValueChange={(value): void => {
                                            setWorkspace(integration.provider, value)
                                        }}
                                        placeholder={resolveWorkspacePlaceholder(
                                            integration.provider,
                                        )}
                                        value={integration.workspace}
                                    />
                                    <Input
                                        label={t("settings:integrations.target")}
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
                                        {t("settings:integrations.enableSync")}
                                    </Switch>
                                    <Switch
                                        isSelected={integration.notificationsEnabled}
                                        onValueChange={(value): void => {
                                            setNotificationsEnabled(integration.provider, value)
                                        }}
                                    >
                                        {t("settings:integrations.enableNotifications")}
                                    </Switch>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <TestConnectionButton
                                        onTest={(): Promise<boolean> =>
                                            Promise.resolve(
                                                handleTestConnection(integration.provider),
                                            )
                                        }
                                        providerLabel={integration.provider}
                                    />
                                    <Button
                                        onPress={(): void => {
                                            handleToggleConnection(integration.provider)
                                        }}
                                        size="sm"
                                        color="primary"
                                        variant={
                                            integration.connected === true ? "flat" : "solid"
                                        }
                                    >
                                        {integration.connected === true
                                            ? t("settings:integrations.disconnect")
                                            : t("settings:integrations.connect")}
                                    </Button>
                                    <Button
                                        onPress={(): void => {
                                            handleSaveConfiguration(integration.provider)
                                        }}
                                        size="sm"
                                        variant="light"
                                    >
                                        {t("settings:integrations.saveConfiguration")}
                                    </Button>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    {t("settings:integrations.secretToken")}{" "}
                                    {integration.secretConfigured === true
                                        ? t("settings:integrations.configured")
                                        : t("settings:integrations.notConfigured")}{" "}
                                    · {t("settings:integrations.lastSync")}{" "}
                                    {integration.lastSyncAt ?? t("settings:integrations.notSyncedYet")}
                                </p>
                            </CardBody>
                        </Card>
                    ),
                )}
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:integrations.externalContextSources")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t("settings:integrations.manageContextSources")}
                        </p>
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    {externalContext.sourcesQuery.isPending ? (
                        <p aria-live="polite" className="text-sm text-muted-foreground">
                            {t("settings:integrations.loadingContextSources")}
                        </p>
                    ) : externalContext.sourcesQuery.error !== null ? (
                        <p aria-live="polite" className="text-sm text-danger">
                            {t("settings:integrations.failedToLoadContextSources")}
                        </p>
                    ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                            <div className="space-y-3">
                                {externalContext.sourcesQuery.data?.sources.map(
                                    (source): ReactElement => (
                                        <ContextSourceCard
                                            key={source.id}
                                            isLoading={
                                                externalContext.updateSource.isPending ||
                                                externalContext.refreshSource.isPending
                                            }
                                            selected={source.id === selectedContextSourceId}
                                            source={source}
                                            onRefresh={handleRefreshContextSource}
                                            onSelect={(sourceId): void => {
                                                setSelectedContextSourceId(sourceId)
                                            }}
                                            onToggleEnabled={handleToggleContextSource}
                                        />
                                    ),
                                ) ?? []}
                            </div>
                            <ContextPreview
                                isError={externalContext.previewQuery.error !== null}
                                isLoading={externalContext.previewQuery.isPending}
                                preview={externalContext.previewQuery.data}
                                sourceName={selectedContextSource?.name}
                            />
                        </div>
                    )}
                </CardBody>
            </Card>
        </FormLayout>
    )
}
