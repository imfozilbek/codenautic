import { type ReactElement } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as z from "zod"
import { Button, Input, ListBox, ListBoxItem, Select, Switch } from "@heroui/react"

import { FormField, type IFormSelectOption } from "@/components/forms"
import {
    type ILlmProviderFormValues,
    LLM_MODEL_OPTIONS,
    LLM_PROVIDER_OPTIONS,
    llmProviderFormSchema,
} from "@/components/settings/settings-form-schemas"

type TLlmProvider = (typeof LLM_PROVIDER_OPTIONS)[number]
type TLlmModel = (typeof LLM_MODEL_OPTIONS)[number]

function findFallbackItem<TValue extends string>(
    values: ReadonlyArray<string>,
    allowedValues: ReadonlyArray<TValue>,
    fallback: TValue,
): TValue {
    const foundItem = values.find((value): value is TValue =>
        allowedValues.includes(value as TValue),
    )

    return foundItem ?? fallback
}

function sanitizeChoice<TValue extends string>(
    values: ReadonlyArray<TValue>,
    fallback: TValue,
): TValue {
    if (values.length === 0) {
        return fallback
    }

    const firstValue = values[0]
    if (firstValue === undefined) {
        return fallback
    }

    return firstValue
}

/**
 * Параметры формы LLM-провайдера.
 */
export interface ILlmProviderFormProps {
    /** Доступные провайдеры. */
    readonly providers: ReadonlyArray<string>
    /** Список моделей для selected provider. */
    readonly modelOptions: ReadonlyArray<string>
    /** Инициал. */
    readonly initialValues?: Partial<ILlmProviderFormValues>
    /** Сабмит формы. */
    readonly onSubmit: (values: ILlmProviderFormValues) => void
}

function getSafeItems(values: ReadonlyArray<string>, fallback: string): ReadonlyArray<string> {
    if (values.length === 0) {
        return [fallback]
    }

    return values
}

function toSelectOptions(values: ReadonlyArray<string>): ReadonlyArray<IFormSelectOption> {
    const options: IFormSelectOption[] = []
    for (const item of values) {
        options.push({ label: String(item), value: String(item) })
    }

    return options
}

function getLlmFormDefaults(props: ILlmProviderFormProps): {
    readonly provider: TLlmProvider
    readonly model: TLlmModel
    readonly endpoint: string | undefined
    readonly apiKey: string
    readonly testAfterSave: boolean
} {
    const providerOptions = getSafeItems(
        props.providers,
        LLM_PROVIDER_OPTIONS[0] as TLlmProvider,
    ) as ReadonlyArray<TLlmProvider>
    const modelOptions = getSafeItems(
        props.modelOptions,
        LLM_MODEL_OPTIONS[0] as TLlmModel,
    ) as ReadonlyArray<TLlmModel>

    const provider =
        props.initialValues?.provider === undefined
            ? sanitizeChoice(providerOptions, LLM_PROVIDER_OPTIONS[0] as TLlmProvider)
            : findFallbackItem(
                  [props.initialValues.provider],
                  LLM_PROVIDER_OPTIONS,
                  LLM_PROVIDER_OPTIONS[0] as TLlmProvider,
              )
    const model =
        props.initialValues?.model === undefined
            ? sanitizeChoice(modelOptions, LLM_MODEL_OPTIONS[0] as TLlmModel)
            : findFallbackItem(
                  [props.initialValues.model],
                  LLM_MODEL_OPTIONS,
                  LLM_MODEL_OPTIONS[0] as TLlmModel,
              )

    return {
        apiKey: props.initialValues?.apiKey ?? "",
        endpoint: props.initialValues?.endpoint,
        model,
        provider,
        testAfterSave: props.initialValues?.testAfterSave === true,
    }
}

/**
 * Страница-форма настройки LLM провайдера.
 *
 * @param props Конфигурация.
 * @returns Форма с выбором provider, моделью и ключом.
 */
export function LlmProviderForm(props: ILlmProviderFormProps): ReactElement {
    const { t } = useTranslation(["settings"])
    const providers = getSafeItems(props.providers, LLM_PROVIDER_OPTIONS[0])
    const modelOptions = getSafeItems(props.modelOptions, LLM_MODEL_OPTIONS[0])
    const providerOptions = toSelectOptions(providers)
    const llmModelOptions = toSelectOptions(modelOptions)
    const defaults = getLlmFormDefaults(props)
    const form = useForm<z.input<typeof llmProviderFormSchema>, unknown, ILlmProviderFormValues>({
        defaultValues: {
            apiKey: defaults.apiKey,
            endpoint: defaults.endpoint,
            model: defaults.model,
            provider: defaults.provider,
            testAfterSave: defaults.testAfterSave,
        },
        resolver: zodResolver(llmProviderFormSchema),
    })

    const handleSubmit = (): void => {
        void form.handleSubmit((values: ILlmProviderFormValues): void => {
            props.onSubmit(values)
        })()
    }

    return (
        <form className="space-y-3" onSubmit={handleSubmit}>
            <FormField
                control={form.control}
                id="llm-provider-name"
                label={t("settings:llmProviderForm.provider")}
                name="provider"
                renderField={({
                    field,
                    hasError,
                    fieldId,
                    accessibilityLabel,
                    ariaDescribedBy,
                }): ReactElement => {
                    const selectedKey = field.value === undefined ? null : String(field.value)

                    return (
                        <Select
                            aria-describedby={ariaDescribedBy}
                            aria-label={accessibilityLabel}
                            aria-invalid={hasError}
                            name={field.name}
                            id={fieldId}
                            selectedKey={selectedKey}
                            onSelectionChange={(key): void => {
                                const nextValue = typeof key === "string" ? key : undefined
                                field.onChange(nextValue)
                            }}
                        >
                            <Select.Trigger>
                                <Select.Value />
                            </Select.Trigger>
                            <Select.Popover>
                                <ListBox>
                                    {providerOptions.map(
                                        (option): ReactElement => (
                                            <ListBoxItem
                                                key={option.value}
                                                id={option.value}
                                                textValue={option.label}
                                                isDisabled={option.isDisabled}
                                            >
                                                <div className="flex flex-col">
                                                    <span>{option.label}</span>
                                                    {option.description === undefined ? null : (
                                                        <span className="text-xs text-muted">
                                                            {option.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </ListBoxItem>
                                        ),
                                    )}
                                </ListBox>
                            </Select.Popover>
                        </Select>
                    )
                }}
            />
            <FormField
                control={form.control}
                id="llm-api-key"
                label={t("settings:llmProviderForm.apiKeyToken")}
                name="apiKey"
                renderField={({
                    field,
                    hasError,
                    fieldId,
                    accessibilityLabel,
                    ariaDescribedBy,
                }): ReactElement => {
                    const value = typeof field.value === "string" ? field.value : ""

                    return (
                        <Input
                            aria-describedby={ariaDescribedBy}
                            aria-label={accessibilityLabel}
                            aria-invalid={hasError}
                            id={fieldId}
                            name={field.name}
                            placeholder={t("settings:llmProviderForm.apiKeyPlaceholder")}
                            type="password"
                            value={value}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                        />
                    )
                }}
            />
            <FormField
                control={form.control}
                id="llm-model"
                label={t("settings:llmProviderForm.model")}
                name="model"
                renderField={({
                    field,
                    hasError,
                    fieldId,
                    accessibilityLabel,
                    ariaDescribedBy,
                }): ReactElement => {
                    const selectedKey = field.value === undefined ? null : String(field.value)

                    return (
                        <Select
                            aria-describedby={ariaDescribedBy}
                            aria-label={accessibilityLabel}
                            aria-invalid={hasError}
                            name={field.name}
                            id={fieldId}
                            selectedKey={selectedKey}
                            onSelectionChange={(key): void => {
                                const nextValue = typeof key === "string" ? key : undefined
                                field.onChange(nextValue)
                            }}
                        >
                            <Select.Trigger>
                                <Select.Value />
                            </Select.Trigger>
                            <Select.Popover>
                                <ListBox>
                                    {llmModelOptions.map(
                                        (option): ReactElement => (
                                            <ListBoxItem
                                                key={option.value}
                                                id={option.value}
                                                textValue={option.label}
                                                isDisabled={option.isDisabled}
                                            >
                                                <div className="flex flex-col">
                                                    <span>{option.label}</span>
                                                    {option.description === undefined ? null : (
                                                        <span className="text-xs text-muted">
                                                            {option.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </ListBoxItem>
                                        ),
                                    )}
                                </ListBox>
                            </Select.Popover>
                        </Select>
                    )
                }}
            />
            <FormField
                control={form.control}
                helperText={t("settings:llmProviderForm.customEndpointHelper")}
                id="llm-endpoint"
                label={t("settings:llmProviderForm.customEndpoint")}
                name="endpoint"
                renderField={({
                    field,
                    hasError,
                    fieldId,
                    accessibilityLabel,
                    ariaDescribedBy,
                }): ReactElement => {
                    const value = typeof field.value === "string" ? field.value : ""

                    return (
                        <Input
                            aria-describedby={ariaDescribedBy}
                            aria-label={accessibilityLabel}
                            aria-invalid={hasError}
                            id={fieldId}
                            name={field.name}
                            placeholder={t("settings:llmProviderForm.customEndpointPlaceholder")}
                            value={value}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                        />
                    )
                }}
            />
            <FormField
                control={form.control}
                gapClass="gap-1"
                hideLabel={true}
                label={t("settings:llmProviderForm.testAfterSave")}
                name="testAfterSave"
                showRequiredMarker={false}
                renderField={({
                    field,
                    hasError,
                    accessibilityLabel,
                    ariaDescribedBy,
                }): ReactElement => (
                    <Switch
                        aria-describedby={ariaDescribedBy}
                        aria-label={accessibilityLabel}
                        aria-invalid={hasError}
                        name={field.name}
                        isSelected={field.value === true}
                        onChange={field.onChange}
                    >
                        {t("settings:llmProviderForm.testAfterSave")}
                    </Switch>
                )}
            />
            <Button
                aria-busy={form.formState.isSubmitting}
                isDisabled={form.formState.isSubmitting}
                type="submit"
            >
                {t("settings:llmProviderForm.saveLlmConfiguration")}
            </Button>
        </form>
    )
}
