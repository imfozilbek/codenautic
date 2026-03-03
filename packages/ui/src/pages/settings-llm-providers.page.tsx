import { type ReactElement, useMemo, useState } from "react"

import { Button, Card, CardBody, CardHeader } from "@/components/ui"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import {
    LlmProviderForm,
    type ILlmProviderFormValues,
} from "@/components/settings/llm-provider-form"
import { TestConnectionButton } from "@/components/settings/test-connection-button"

/** Конфигурация LLM integration. */
interface ILlmProviderConfig {
    /** Провайдер. */
    readonly provider: string
    /** Активная модель. */
    readonly model: string
    /** API key. */
    readonly apiKey: string
    /** Custom endpoint. */
    readonly endpoint: string
    /** Состояние подключения. */
    readonly connected: boolean
}

const LL_MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4o", "claude-3-7-sonnet", "mistral-small-latest"]
const LLM_PROVIDER_OPTIONS = ["OpenAI", "Anthropic", "Azure OpenAI", "Mistral"] as const
type TLlmProvider = (typeof LLM_PROVIDER_OPTIONS)[number]

const INITIAL_CONFIG: Record<TLlmProvider, ILlmProviderConfig> = {
    OpenAI: {
        apiKey: "",
        connected: false,
        endpoint: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        provider: "OpenAI",
    },
    Anthropic: {
        apiKey: "",
        connected: false,
        endpoint: "https://api.anthropic.com",
        model: "claude-3-7-sonnet",
        provider: "Anthropic",
    },
    "Azure OpenAI": {
        apiKey: "",
        connected: false,
        endpoint: "",
        model: "gpt-4o-mini",
        provider: "Azure OpenAI",
    },
    Mistral: {
        apiKey: "",
        connected: false,
        endpoint: "https://api.mistral.ai/v1",
        model: "mistral-small-latest",
        provider: "Mistral",
    },
}

/**
 * Проверяет, есть ли сохранённые ключи у хотя бы одного провайдера.
 *
 * @param configs Конфигурация провайдеров.
 * @returns true, если хотя бы один ключ установлен.
 */
function hasConfiguredApiKey(configs: Record<TLlmProvider, ILlmProviderConfig>): boolean {
    return Object.values(configs).some((item): boolean => item.apiKey.length > 12)
}

/**
 * Возвращает конфиг для провайдера.
 *
 * @param configs Карта конфигов.
 * @param provider Имя провайдера.
 * @returns Конфиг или undefined, если отсутствует.
 */
function getProviderConfig(
    configs: Record<TLlmProvider, ILlmProviderConfig>,
    provider: TLlmProvider,
): ILlmProviderConfig {
    return configs[provider]
}

/**
 * Обновляет состояние провайдера.
 *
 * @param previousValue Существующий state.
 * @param provider Имя провайдера.
 * @param next Значения формы.
 * @returns Новая карта конфигов.
 */
function toNextProviderConfig(
    previousValue: Record<TLlmProvider, ILlmProviderConfig>,
    provider: TLlmProvider,
    next: ILlmProviderFormValues,
): Record<TLlmProvider, ILlmProviderConfig> {
    return {
        ...previousValue,
        [provider]: {
            ...previousValue[provider],
            connected: next.testAfterSave ? previousValue[provider].connected === true : false,
            provider: next.provider,
            apiKey: next.apiKey,
            model: next.model,
            endpoint: next.endpoint ?? "",
        },
    }
}

/**
 * Рендер карточки провайдера.
 *
 * @param provider Имя провайдера.
 * @param config Конфиг.
 * @param onSave Сабмит формы.
 * @param onTest Проверка соединения.
 * @returns Карточка провайдера.
 */
function renderProviderCard(
    provider: TLlmProvider,
    config: ILlmProviderConfig,
    onSave: (next: ILlmProviderFormValues) => void,
    onTest: () => Promise<boolean>,
    isActionDisabled: boolean,
): ReactElement {
    return (
        <Card key={provider}>
            <CardHeader>
                <p className="text-base font-semibold text-slate-900">{provider}</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <LlmProviderForm
                    initialValues={{
                        apiKey: config.apiKey,
                        endpoint: config.endpoint,
                        model: config.model,
                        provider: config.provider,
                        testAfterSave: config.connected,
                    }}
                    modelOptions={LL_MODEL_OPTIONS}
                    providers={[...LLM_PROVIDER_OPTIONS]}
                    onSubmit={(next): void => {
                        onSave(next)
                    }}
                />
                <div className="flex items-center gap-3">
                    <TestConnectionButton providerLabel={provider} onTest={onTest} />
                    <Button
                        isDisabled={isActionDisabled}
                        onPress={(): void => {
                            showToastInfo(`Triggered manual test for ${provider}.`)
                        }}
                    >
                        Validate via pipeline
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}

/**
 * Страница настроек LLM providers.
 *
 * @returns Форма выбора провайдера, ключа и теста подключения.
 */
export function SettingsLlmProvidersPage(): ReactElement {
    const [configs, setConfigs] = useState<Record<TLlmProvider, ILlmProviderConfig>>(INITIAL_CONFIG)

    const hasAtLeastOneConfigured = useMemo<boolean>(
        (): boolean => hasConfiguredApiKey(configs),
        [configs],
    )

    const saveConfig = (provider: TLlmProvider, next: ILlmProviderFormValues): void => {
        setConfigs(
            (previousValue): Record<TLlmProvider, ILlmProviderConfig> =>
                toNextProviderConfig(previousValue, provider, next),
        )
        showToastSuccess(`Saved ${provider} provider config.`)
    }

    const testProvider = (provider: TLlmProvider): Promise<boolean> => {
        const config = getProviderConfig(configs, provider)

        return Promise.resolve(config.apiKey.length >= 10)
    }

    const handleConnectionResult = (provider: TLlmProvider, next: boolean): void => {
        setConfigs(
            (previousValue): Record<TLlmProvider, ILlmProviderConfig> => {
                const currentConfig = getProviderConfig(previousValue, provider)

                return {
                    ...previousValue,
                    [provider]: {
                        ...currentConfig,
                        connected: next,
                    },
                }
            },
        )
        if (next === true) {
            showToastSuccess(`${provider} marked as connected.`)
            return
        }

        showToastError(`${provider} is not connected.`)
    }

    const testAndPersistConnection = async (provider: TLlmProvider): Promise<boolean> => {
        const result = await testProvider(provider)
        handleConnectionResult(provider, result)
        return result
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">LLM Providers</h1>
            <p className="text-sm text-slate-600">
                Configure provider credentials and model defaults for automated suggestion
                generation.
            </p>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                BYOK keys are masked in UI. Keep secrets in secure storage on save.
            </div>

            <div className="space-y-4">
                {LLM_PROVIDER_OPTIONS.map((provider): ReactElement => {
                    const config = getProviderConfig(configs, provider)

                    return renderProviderCard(
                        provider,
                        config,
                        (next): void => {
                            saveConfig(provider, next)
                        },
                        async (): Promise<boolean> => testAndPersistConnection(provider),
                        hasAtLeastOneConfigured === false,
                    )
                })}
            </div>
        </section>
    )
}
