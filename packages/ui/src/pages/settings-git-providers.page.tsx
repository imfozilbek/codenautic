import { type ReactElement, useState } from "react"

import { GitProvidersList } from "@/components/settings/git-providers-list"
import { TestConnectionButton } from "@/components/settings/test-connection-button"
import { Button, Card, CardBody } from "@/components/ui"
import type { IGitProviderCardProps } from "@/components/settings/git-provider-card"

/** Конфигурация mock git-провайдеров. */
interface IGitProviderState extends IGitProviderCardProps {
    /** Внутренний token для mock тестов. */
    readonly isKeySet: boolean
}

/**
 * Страница управления Git providers.
 *
 * @returns Список Git подключений и кнопки подключения/теста.
 */
export function SettingsGitProvidersPage(): ReactElement {
    const [providers, setProviders] = useState<ReadonlyArray<IGitProviderState>>([
        {
            account: "acme-org",
            connected: true,
            isKeySet: true,
            lastSyncAt: "2026-03-03 08:00",
            onAction: () => {},
            provider: "GitHub",
        },
        {
            account: "runtime-team",
            connected: false,
            isKeySet: false,
            lastSyncAt: "2026-03-02 22:12",
            onAction: () => {},
            provider: "GitLab",
        },
        {
            account: "build-team",
            connected: false,
            isKeySet: false,
            lastSyncAt: undefined,
            onAction: () => {},
            provider: "Bitbucket",
        },
    ])

    const handleAction = (providerName: string): void => {
        setProviders((previousValue): ReadonlyArray<IGitProviderState> => {
            return previousValue.map((item): IGitProviderState => {
                if (item.provider !== providerName) {
                    return item
                }

                return {
                    ...item,
                    connected: !item.connected,
                    isKeySet: true,
                }
            })
        })
    }

    const providersWithActions = providers.map(
        (item): IGitProviderState => ({
            ...item,
            onAction: (): void => {
                handleAction(item.provider)
            },
        }),
    )

    const testProvider = (provider: string): Promise<boolean> => {
        const providerState = providers.find((item): boolean => item.provider === provider)
        return Promise.resolve(providerState?.isKeySet === true)
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Git Providers</h1>
            <p className="text-sm text-slate-600">
                Настройка OAuth/чтение репозиториев и webhook-интеграций.
            </p>
            <GitProvidersList providers={providersWithActions} />
            <Card>
                <CardBody className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Connectivity checks</p>
                    <div className="space-y-2">
                        {providersWithActions.map(
                            (provider): ReactElement => (
                                <div
                                    key={`connectivity-${provider.provider}`}
                                    className="flex items-center gap-3"
                                >
                                    <TestConnectionButton
                                        providerLabel={provider.provider}
                                        onTest={async (): Promise<boolean> => {
                                            const result = await testProvider(provider.provider)
                                            if (result === true) {
                                                return true
                                            }
                                            if (provider.isKeySet !== true) {
                                                handleAction(provider.provider)
                                            }
                                            return false
                                        }}
                                    />
                                    <Button
                                        onPress={(): void => {
                                            handleAction(provider.provider)
                                        }}
                                        size="sm"
                                        variant="flat"
                                    >
                                        {provider.connected ? "Force reconnect" : "Connect"}
                                    </Button>
                                </div>
                            ),
                        )}
                    </div>
                </CardBody>
            </Card>
        </section>
    )
}
