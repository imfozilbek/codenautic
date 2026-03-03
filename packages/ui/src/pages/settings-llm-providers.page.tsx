import {type ReactElement, useMemo, useState} from "react"

import {Button, Card, CardBody, CardHeader} from "@/components/ui"
import {showToastError, showToastInfo, showToastSuccess} from "@/lib/notifications/toast"
import {LlmProviderForm, type ILlmProviderFormValues} from "@/components/settings/llm-provider-form"
import {TestConnectionButton} from "@/components/settings/test-connection-button"

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
const LLM_PROVIDER_OPTIONS = ["OpenAI", "Anthropic", "Azure OpenAI", "Mistral"]

/**
 * Страница настроек LLM providers.
 *
 * @returns Форма выбора провайдера, ключа и теста подключения.
 */
export function SettingsLlmProvidersPage(): ReactElement {
    const [configs, setConfigs] = useState<Record<string, ILlmProviderConfig>>(() => {
        return {
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
        }
    })

    const hasAtLeastOneConfigured = useMemo((): boolean => {
        return Object.values(configs).some((item): boolean => item.apiKey.length > 12)
    }, [configs])

    const saveConfig = (provider: string, next: ILlmProviderFormValues): void => {
        setConfigs((previousValue): Record<string, ILlmProviderConfig> => ({
            ...previousValue,
            [provider]: {
                connected: next.testAfterSave ? previousValue[provider]?.connected === true : false,
                provider: next.provider,
                apiKey: next.apiKey,
                model: next.model,
                endpoint: next.endpoint ?? "",
            },
        }))
        showToastSuccess(`Saved ${provider} provider config.`)
    }

    const testProvider = (provider: string): Promise<boolean> => {
        const config = configs[provider]

        if (config === undefined) {
            return Promise.resolve(false)
        }

        return Promise.resolve(config.apiKey.length >= 10)
    }

    const handleConnectionResult = (provider: string, next: boolean): void => {
        setConfigs((previousValue): Record<string, ILlmProviderConfig> => ({
            ...previousValue,
            [provider]: {
                ...previousValue[provider]!,
                connected: next,
            },
        }))
        if (next === true) {
            showToastSuccess(`${provider} marked as connected.`)
            return
        }

        showToastError(`${provider} is not connected.`)
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">LLM Providers</h1>
            <p className="text-sm text-slate-600">
                Configure provider credentials and model defaults for automated suggestion generation.
            </p>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                BYOK keys are masked in UI. Keep secrets in secure storage on save.
            </div>

            <div className="space-y-4">
                {LLM_PROVIDER_OPTIONS.map((provider): ReactElement => {
                    const config = configs[provider]

                    if (config === undefined) {
                        return null
                    }

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
                                    providers={LLM_PROVIDER_OPTIONS}
                                    onSubmit={(next): void => {
                                        saveConfig(provider, next)
                                    }}
                                />
                                <div className="flex items-center gap-3">
                                    <TestConnectionButton
                                        providerLabel={provider}
                                        onTest={async (): Promise<boolean> => {
                                            const result = await testProvider(provider)
                                            handleConnectionResult(provider, result)
                                            return result
                                        }}
                                    />
                                    <Button
                                        isDisabled={hasAtLeastOneConfigured === false}
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
                })}
            </div>
        </section>
    )
}
