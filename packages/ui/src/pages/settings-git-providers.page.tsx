import { type ReactElement, useMemo } from "react"

import { Button, Card, CardBody } from "@/components/ui"
import {
    GIT_PROVIDER_CONNECTION_STATUS,
    type IGitProviderConnection,
} from "@/lib/api/endpoints/git-providers.endpoint"
import { useGitProviders } from "@/lib/hooks/queries"
import { GitProvidersList } from "@/components/settings/git-providers-list"
import type { IGitProviderCardProps } from "@/components/settings/git-provider-card"
import { TestConnectionButton } from "@/components/settings/test-connection-button"

const FALLBACK_GIT_PROVIDERS: ReadonlyArray<IGitProviderConnection> = [
    {
        account: "acme-org",
        connected: true,
        id: "github",
        isKeySet: true,
        lastSyncAt: "2026-03-03 08:00",
        provider: "GitHub",
        status: GIT_PROVIDER_CONNECTION_STATUS.connected,
    },
    {
        account: "runtime-team",
        connected: false,
        id: "gitlab",
        isKeySet: false,
        lastSyncAt: "2026-03-02 22:12",
        provider: "GitLab",
        status: GIT_PROVIDER_CONNECTION_STATUS.disconnected,
    },
    {
        account: "build-team",
        connected: false,
        id: "bitbucket",
        isKeySet: false,
        lastSyncAt: undefined,
        provider: "Bitbucket",
        status: GIT_PROVIDER_CONNECTION_STATUS.disconnected,
    },
    {
        account: "platform-team",
        connected: false,
        id: "azure-devops",
        isKeySet: false,
        lastSyncAt: undefined,
        provider: "Azure DevOps",
        status: GIT_PROVIDER_CONNECTION_STATUS.disconnected,
    },
]

function resolveSourceProviders(
    providers: ReadonlyArray<IGitProviderConnection> | undefined,
): ReadonlyArray<IGitProviderConnection> {
    if (providers === undefined || providers.length === 0) {
        return FALLBACK_GIT_PROVIDERS
    }

    return providers
}

function hasAnyConfiguredToken(providers: ReadonlyArray<IGitProviderConnection>): boolean {
    return providers.some((provider): boolean => provider.isKeySet === true)
}

/**
 * Страница управления Git providers.
 *
 * @returns Список Git подключений и действия connect/test.
 */
export function SettingsGitProvidersPage(): ReactElement {
    const gitProviders = useGitProviders()

    const sourceProviders = useMemo((): ReadonlyArray<IGitProviderConnection> => {
        return resolveSourceProviders(gitProviders.providersQuery.data?.providers)
    }, [gitProviders.providersQuery.data?.providers])

    const providerCards = useMemo((): ReadonlyArray<IGitProviderCardProps> => {
        return sourceProviders.map((provider): IGitProviderCardProps => {
            const isMutatingProvider =
                gitProviders.updateConnection.isPending === true &&
                gitProviders.updateConnection.variables?.providerId === provider.id

            return {
                account: provider.account,
                connected: provider.connected,
                isLoading: isMutatingProvider,
                lastSyncAt: provider.lastSyncAt,
                onAction: async (): Promise<void> => {
                    await gitProviders.updateConnection.mutateAsync({
                        connected: provider.connected !== true,
                        providerId: provider.id,
                    })
                },
                provider: provider.provider,
            }
        })
    }, [
        gitProviders.updateConnection.isPending,
        gitProviders.updateConnection.mutateAsync,
        gitProviders.updateConnection.variables?.providerId,
        sourceProviders,
    ])

    const handleTestConnection = async (providerId: string): Promise<boolean> => {
        const result = await gitProviders.testConnection.mutateAsync(providerId)
        return result.ok
    }

    const isTokenConfigured = hasAnyConfiguredToken(sourceProviders)

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Git Providers</h1>
            <p className="text-sm text-muted-foreground">
                Настройка OAuth/чтение репозиториев и webhook-интеграций.
            </p>
            <GitProvidersList providers={providerCards} />
            <Card>
                <CardBody className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Connectivity checks</p>
                    <div className="space-y-2">
                        {sourceProviders.map(
                            (provider): ReactElement => (
                                <div
                                    key={`connectivity-${provider.id}`}
                                    className="flex items-center gap-3"
                                >
                                    <TestConnectionButton
                                        providerLabel={provider.provider}
                                        onTest={async (): Promise<boolean> => {
                                            return handleTestConnection(provider.id)
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onPress={(): void => {
                                            void gitProviders.updateConnection.mutateAsync({
                                                connected: provider.connected !== true,
                                                providerId: provider.id,
                                            })
                                        }}
                                    >
                                        {provider.connected ? "Force reconnect" : "Connect"}
                                    </Button>
                                </div>
                            ),
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isTokenConfigured
                            ? "At least one token is configured."
                            : "No tokens are configured yet."}
                    </p>
                </CardBody>
            </Card>
        </section>
    )
}
