import { type ReactElement } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
    FormSelectField,
    FormSubmitButton,
    FormSwitchField,
    FormTextField,
} from "@/components/forms"
import { type IFormSelectOption } from "@/components/forms/form-select-field"
import {
    type ILlmProviderFormValues,
    LLM_MODEL_OPTIONS,
    LLM_PROVIDER_OPTIONS,
    llmProviderFormSchema,
} from "@/components/settings/settings-form-schemas"

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
    readonly provider: string
    readonly model: string
    readonly endpoint: string | undefined
    readonly apiKey: string
    readonly testAfterSave: boolean
} {
    const providerOptions = getSafeItems(props.providers, LLM_PROVIDER_OPTIONS[0])
    const modelOptions = getSafeItems(props.modelOptions, LLM_MODEL_OPTIONS[0])

    return {
        apiKey: props.initialValues?.apiKey ?? "",
        endpoint: props.initialValues?.endpoint,
        model: props.initialValues?.model ?? modelOptions[0],
        provider: props.initialValues?.provider ?? providerOptions[0],
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
    const providers = getSafeItems(props.providers, LLM_PROVIDER_OPTIONS[0])
    const modelOptions = getSafeItems(props.modelOptions, LLM_MODEL_OPTIONS[0])
    const providerOptions = toSelectOptions(providers)
    const llmModelOptions = toSelectOptions(modelOptions)
    const defaults = getLlmFormDefaults(props)
    const form = useForm<ILlmProviderFormValues>({
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
            <FormSelectField
                control={form.control}
                id="llm-provider-name"
                label="Provider"
                name="provider"
                options={providerOptions}
            />
            <FormTextField
                control={form.control}
                id="llm-api-key"
                inputProps={{
                    placeholder: "sk-...",
                    type: "password",
                }}
                label="API key / token"
                name="apiKey"
            />
            <FormSelectField
                control={form.control}
                id="llm-model"
                label="Model"
                name="model"
                options={llmModelOptions}
            />
            <FormTextField
                control={form.control}
                helperText="Optional custom API endpoint for enterprise routes."
                id="llm-endpoint"
                inputProps={{
                    placeholder: "https://api.openai.com/v1",
                }}
                label="Custom endpoint"
                name="endpoint"
            />
            <FormSwitchField control={form.control} label="Test after save" name="testAfterSave" />
            <FormSubmitButton isSubmitting={form.formState.isSubmitting}>
                Save LLM configuration
            </FormSubmitButton>
        </form>
    )
}
