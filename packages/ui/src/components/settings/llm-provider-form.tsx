import { type ReactElement } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
    FormSelectField,
    FormSubmitButton,
    FormSwitchField,
    FormTextField,
    type IFormSelectOption,
} from "@/components/forms"
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

/**
 * Страница-форма настройки LLM провайдера.
 *
 * @param props Конфигурация.
 * @returns Форма с выбором provider, моделью и ключом.
 */
export function LlmProviderForm(props: ILlmProviderFormProps): ReactElement {
    const providers = props.providers.length > 0 ? props.providers : [LLM_PROVIDER_OPTIONS[0]]
    const modelOptions = props.modelOptions.length > 0 ? props.modelOptions : [LLM_MODEL_OPTIONS[0]]
    const providerOptions: ReadonlyArray<IFormSelectOption> = providers.map(
        (item): IFormSelectOption => ({
            label: item,
            value: item,
        }),
    )
    const llmModelOptions: ReadonlyArray<IFormSelectOption> = modelOptions.map(
        (item): IFormSelectOption => ({
            label: item,
            value: item,
        }),
    )
    const form = useForm<ILlmProviderFormValues>({
        defaultValues: {
            apiKey: props.initialValues?.apiKey ?? "",
            endpoint: props.initialValues?.endpoint,
            model: props.initialValues?.model ?? modelOptions[0]!,
            provider: props.initialValues?.provider ?? providers[0]!,
            testAfterSave: props.initialValues?.testAfterSave === true,
        },
        resolver: zodResolver(llmProviderFormSchema),
    })

    const handleSubmit = form.handleSubmit((values): void => {
        props.onSubmit(values)
    })

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
