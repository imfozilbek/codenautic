import { type ReactElement, useMemo, useState } from "react"

import { Button, Card, CardBody } from "@/components/ui"
import { GitProvidersList } from "@/components/settings/git-providers-list"
import { TestConnectionButton } from "@/components/settings/test-connection-button"
import type { IGitProviderCardProps } from "@/components/settings/git-provider-card"

/** Конфигурация mock git-провайдеров. */
interface IGitProviderState extends IGitProviderCardProps {
    /** Есть ли локально сохранённый key. */
    readonly isKeySet: boolean
}

/**
 * Возвращает стартовый набор провайдеров.
 *
 * @returns Readonly массив конфигураций.
 */
function getMockProvidersState(): ReadonlyArray<IGitProviderState> {
    return [
        {
            account: "acme-org",
            connected: true,
            isKeySet: true,
            lastSyncAt: "2026-03-03 08:00",
            onAction: () => {
                return
            },
            provider: "GitHub",
        },
        {
            account: "runtime-team",
            connected: false,
            isKeySet: false,
            lastSyncAt: "2026-03-02 22:12",
            onAction: () => {
                return
            },
            provider: "GitLab",
        },
        {
            account: "build-team",
            connected: false,
            isKeySet: false,
            lastSyncAt: undefined,
            onAction: () => {
                return
            },
            provider: "Bitbucket",
        },
    ]
}

/**
 * Проверяет наличие сохранённого ключа для провайдера.
 *
 * @param providers Список провайдеров.
 * @param providerName Имя провайдера.
 * @returns true, если ключ уже сохранён.
 */
function hasProviderKey(
    providers: ReadonlyArray<IGitProviderState>,
    providerName: string,
): boolean {
    const providerState = providers.find((item): boolean => item.provider === providerName)

    return providerState !== undefined && providerState.isKeySet === true
}

/**
 * Переключает подключение у провайдера.
 *
 * @param previousValue Существующий state.
 * @param providerName Имя провайдера.
 * @returns Новое состояние.
 */
function toggleProviderConnectionState(
    previousValue: ReadonlyArray<IGitProviderState>,
    providerName: string,
): ReadonlyArray<IGitProviderState> {
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
}

/**
 * Добавляет обработчик действия в список карточек провайдеров.
 *
 * @param providers Состояние провайдеров.
 * @param onAction Обработчик.
 * @returns Список с привязанным onAction.
 */
function withActions(
    providers: ReadonlyArray<IGitProviderState>,
    onAction: (providerName: string) => void,
): ReadonlyArray<IGitProviderState> {
    return providers.map((item): IGitProviderState => ({
        ...item,
        onAction: (): void => {
            onAction(item.provider)
        },
    }))
}

/**
 * Проверяет подключение через mock-стаб.
 *
 * @param providers Список провайдеров.
 * @param providerName Имя провайдера.
 * @returns Результат проверки.
 */
function checkProviderConnection(
    providers: ReadonlyArray<IGitProviderState>,
    providerName: string,
): Promise<boolean> {
    const providerState = providers.find((item): boolean => item.provider === providerName)

    return Promise.resolve(providerState !== undefined && providerState.isKeySet === true)
}

/**
 * Рендер строки проверки доступности и кнопки.
 *
 * @param provider Конфигурация провайдера.
 * @param onTest Функция проверки.
 * @param onToggle Функция переключения подключения.
 * @returns JSX для строки.
 */
function renderConnectionRow(
    provider: IGitProviderState,
    onTest: (providerName: string) => Promise<boolean>,
    onToggle: (providerName: string) => void,
): ReactElement {
    return (
        <div key={`connectivity-${provider.provider}`} className="flex items-center gap-3">
            <TestConnectionButton
                providerLabel={provider.provider}
                onTest={async (): Promise<boolean> => onTest(provider.provider)}
            />
            <Button
                onPress={(): void => {
                    onToggle(provider.provider)
                }}
                size="sm"
                variant="flat"
            >
                {provider.connected ? "Force reconnect" : "Connect"}
            </Button>
        </div>
    )
}

/**
 * Страница управления Git providers.
 *
 * @returns Список Git подключений и кнопки подключения/теста.
 */
export function SettingsGitProvidersPage(): ReactElement {
    const [providers, setProviders] = useState<ReadonlyArray<IGitProviderState>>(getMockProvidersState)

    const handleAction = (providerName: string): void => {
        setProviders(
            (previousValue): ReadonlyArray<IGitProviderState> =>
                toggleProviderConnectionState(previousValue, providerName),
        )
    }

    const providersWithActions = useMemo(
        (): ReadonlyArray<IGitProviderState> => withActions(providers, handleAction),
        [providers],
    )

    const handleTestConnection = async (providerName: string): Promise<boolean> => {
        const result = await checkProviderConnection(providers, providerName)

        if (result !== true) {
            handleAction(providerName)
        }

        return result
    }

    const hasActiveKey = hasProviderKey(providers, "GitHub")
    const isKeyConfigured =
        hasActiveKey || hasProviderKey(providers, "GitLab") || hasProviderKey(providers, "Bitbucket")

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
                        {providersWithActions.map((provider): ReactElement =>
                            renderConnectionRow(provider, handleTestConnection, handleAction),
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        {isKeyConfigured
                            ? "At least one token is configured."
                            : "No tokens are configured yet."}
                    </p>
                </CardBody>
            </Card>
        </section>
    )
}
