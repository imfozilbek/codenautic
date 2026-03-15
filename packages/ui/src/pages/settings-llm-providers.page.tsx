import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@heroui/react"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import {
    LLM_MODEL_OPTIONS,
    LLM_PROVIDER_OPTIONS,
    type ILlmProviderFormValues,
} from "@/components/settings/settings-form-schemas"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { LlmProviderForm } from "@/components/settings/llm-provider-form"
import { TestConnectionButton } from "@/components/settings/test-connection-button"

/** Конфигурация LLM integration. */
interface ILlmProviderConfig {
    /** Провайдер. */
    readonly provider: TLlmProvider
    /** Активная модель. */
    readonly model: TLlmModel
    /** API key. */
    readonly apiKey: string
    /** Custom endpoint. */
    readonly endpoint: string
    /** Состояние подключения. */
    readonly connected: boolean
}

type TLlmProvider = (typeof LLM_PROVIDER_OPTIONS)[number]
type TLlmModel = (typeof LLM_MODEL_OPTIONS)[number]
type INormalizedLlmProviderFormValues = ILlmProviderFormValues

const DEFAULT_INITIAL_PROVIDER: TLlmProvider = LLM_PROVIDER_OPTIONS[0]
const DEFAULT_FORM_VALUES: INormalizedLlmProviderFormValues = {
    apiKey: "",
    endpoint: "",
    model: LLM_MODEL_OPTIONS[0],
    provider: DEFAULT_INITIAL_PROVIDER,
    testAfterSave: false,
}

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

function safeString(value: unknown, fallback: string): string {
    return typeof value === "string" ? value : fallback
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

function sanitizeChoice<TValue extends string>(
    allowed: readonly [TValue, ...TValue[]],
    value: unknown,
): TValue {
    if (typeof value === "string" && allowed.includes(value as TValue) === true) {
        return value as TValue
    }

    return allowed[0]
}

function normalizeFormValues(raw: unknown): INormalizedLlmProviderFormValues {
    if (raw !== null && typeof raw === "object") {
        const next = raw as Record<string, unknown>

        return {
            apiKey: safeString(next.apiKey, ""),
            endpoint:
                typeof next.endpoint === "string" && next.endpoint.length > 0
                    ? next.endpoint
                    : DEFAULT_FORM_VALUES.endpoint,
            model: sanitizeChoice(LLM_MODEL_OPTIONS, next.model),
            provider: sanitizeChoice(LLM_PROVIDER_OPTIONS, next.provider),
            testAfterSave: next.testAfterSave === true,
        }
    }

    return DEFAULT_FORM_VALUES
}

/**
 * Обновляет состояние провайдера.
 *
 * @param previousValue Существующий state.
 * @param provider Имя провайдера.
 * @param next Значения формы.
 * @returns Новая карта конфигов.
 */
export function toNextProviderConfig(
    previousValue: Record<TLlmProvider, ILlmProviderConfig>,
    provider: TLlmProvider,
    next: INormalizedLlmProviderFormValues,
): Record<TLlmProvider, ILlmProviderConfig> {
    return {
        ...previousValue,
        [provider]: {
            ...previousValue[provider],
            connected: previousValue[provider].connected,
            provider: next.provider,
            apiKey: next.apiKey,
            model: next.model,
            endpoint: next.endpoint,
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
    onSave: (next: INormalizedLlmProviderFormValues) => void,
    onTest: () => Promise<boolean>,
    isActionDisabled: boolean,
    t: ReturnType<typeof useTranslation<readonly ["settings"]>>["t"],
): ReactElement {
    return (
        <section className="space-y-4 rounded-lg border border-border/50 bg-surface-tertiary p-4" key={provider}><div className="space-y-1"><h3 className={TYPOGRAPHY.subsectionTitle}>{provider}</h3></div><div className="space-y-3">
            <LlmProviderForm
                initialValues={{
                    apiKey: config.apiKey,
                    endpoint: config.endpoint,
                    model: config.model,
                    provider: config.provider,
                    testAfterSave: config.connected,
                }}
                modelOptions={LLM_MODEL_OPTIONS}
                providers={[...LLM_PROVIDER_OPTIONS]}
                onSubmit={(next: INormalizedLlmProviderFormValues): void => {
                    onSave(normalizeFormValues(next))
                }}
            />
            <div className="flex items-center gap-3">
                <TestConnectionButton providerLabel={provider} onTest={onTest} />
                <Button
                    variant="primary"
                    isDisabled={isActionDisabled}
                    onPress={(): void => {
                        showToastInfo(
                            t("settings:llmProviders.toast.manualTestTriggered", { provider }),
                        )
                    }}
                >
                    {t("settings:llmProviders.validateViaPipeline")}
                </Button>
            </div>
            </div></section>
    )
}

/**
 * Страница настроек LLM providers.
 *
 * @returns Форма выбора провайдера, ключа и теста подключения.
 */
export function SettingsLlmProvidersPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const [configs, setConfigs] = useState<Record<TLlmProvider, ILlmProviderConfig>>(INITIAL_CONFIG)

    const hasAtLeastOneConfigured = useMemo<boolean>(
        (): boolean => hasConfiguredApiKey(configs),
        [configs],
    )

    const saveConfig = (provider: TLlmProvider, next: INormalizedLlmProviderFormValues): void => {
        setConfigs((previousValue): Record<TLlmProvider, ILlmProviderConfig> => {
            return toNextProviderConfig(previousValue, provider, next)
        })
        showToastSuccess(t("settings:llmProviders.toast.configSaved", { provider }))
    }

    const testProvider = (provider: TLlmProvider): Promise<boolean> => {
        const config = getProviderConfig(configs, provider)

        return Promise.resolve(config.apiKey.length >= 10)
    }

    const handleConnectionResult = (provider: TLlmProvider, next: boolean): void => {
        setConfigs((previousValue): Record<TLlmProvider, ILlmProviderConfig> => {
            const currentConfig = getProviderConfig(previousValue, provider)

            return {
                ...previousValue,
                [provider]: {
                    ...currentConfig,
                    connected: next,
                },
            }
        })
        if (next === true) {
            showToastSuccess(t("settings:llmProviders.toast.markedAsConnected", { provider }))
            return
        }

        showToastError(t("settings:llmProviders.toast.notConnected", { provider }))
    }

    const testAndPersistConnection = async (provider: TLlmProvider): Promise<boolean> => {
        const result = await testProvider(provider)
        handleConnectionResult(provider, result)
        return result
    }

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]">
            <div className="space-y-1.5">
                <h1 className={TYPOGRAPHY.pageTitle}>{t("settings:llmProviders.pageTitle")}</h1>
                <p className={TYPOGRAPHY.bodyMuted}>{t("settings:llmProviders.pageSubtitle")}</p>
            </div>
            <div className="space-y-6">
            <div className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-accent-foreground">
                {t("settings:llmProviders.byokNotice")}
            </div>

            <div className="space-y-4">
                {LLM_PROVIDER_OPTIONS.map((provider): ReactElement => {
                    const config = getProviderConfig(configs, provider)

                    return renderProviderCard(
                        provider,
                        config,
                        (next): void => {
                            saveConfig(provider, normalizeFormValues(next))
                        },
                        async (): Promise<boolean> => testAndPersistConnection(provider),
                        hasAtLeastOneConfigured === false,
                        t,
                    )
                })}
            </div>
            </div>
        </div>
    )
}
