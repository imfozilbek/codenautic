import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { FormEvent, ReactElement } from "react"
import { useForm } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"

import {
    FormCheckboxField,
    FormNumberField,
    FormPasswordField,
    FormRadioGroupField,
    FormSelectField,
    FormSubmitButton,
    FormSwitchField,
    FormTextField,
    FormTextareaField,
} from "@/components/forms"
import { renderWithProviders } from "../utils/render"

interface IFormValues {
    description: string
    email: string
    enableFeature: boolean
    issueLimit: number
    mode: "relaxed" | "strict"
    password: string
    provider: string
    sendNotifications: boolean
}

interface ITextFieldHarnessProps {
    readonly onSubmit: (values: IFormValues) => void
}

function TextFieldHarness(props: ITextFieldHarnessProps): ReactElement {
    const form = useForm<IFormValues>({
        defaultValues: {
            description: "",
            email: "",
            enableFeature: false,
            issueLimit: 1,
            mode: "relaxed",
            password: "",
            provider: "openai",
            sendNotifications: false,
        },
    })

    const submitForm = (event: FormEvent<HTMLFormElement>): void => {
        void form.handleSubmit((values): void => {
            props.onSubmit(values)
        })(event)
    }

    return (
        <form onSubmit={submitForm}>
            <FormTextField<IFormValues, "email">
                control={form.control}
                helperText="Введите корпоративный email"
                label="Email"
                name="email"
                rules={{
                    minLength: {
                        message: "Минимум 6 символов",
                        value: 6,
                    },
                    required: "Обязательное поле",
                }}
            />
            <FormSubmitButton isSubmitting={false} submittingText="Отправка...">
                Отправить
            </FormSubmitButton>
        </form>
    )
}

interface IPasswordHarnessProps {
    readonly passwordDefault: string
}

function PasswordHarness(props: IPasswordHarnessProps): ReactElement {
    const form = useForm<IFormValues>({
        defaultValues: {
            description: "",
            email: "",
            enableFeature: false,
            issueLimit: 1,
            mode: "relaxed",
            password: props.passwordDefault,
            provider: "openai",
            sendNotifications: false,
        },
    })

    return (
        <FormPasswordField<IFormValues, "password">
            control={form.control}
            label="Password"
            name="password"
        />
    )
}

interface IFormSubmitCaptureProps {
    readonly onSubmit: (values: IFormValues) => void
}

function FullFormHarness(props: IFormSubmitCaptureProps): ReactElement {
    const form = useForm<IFormValues>({
        defaultValues: {
            description: "",
            email: "",
            enableFeature: false,
            issueLimit: 1,
            mode: "relaxed",
            password: "",
            provider: "openai",
            sendNotifications: false,
        },
    })

    const submitForm = (event: FormEvent<HTMLFormElement>): void => {
        void form.handleSubmit((values): void => {
            props.onSubmit(values)
        })(event)
    }

    return (
        <form onSubmit={submitForm}>
            <FormTextField<IFormValues, "email">
                control={form.control}
                helperText="Корпоративный email"
                label="Email"
                name="email"
                rules={{
                    pattern: {
                        message: "Неверный формат email",
                        value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                    },
                    required: "Email обязателен",
                }}
            />
            <FormPasswordField<IFormValues, "password">
                control={form.control}
                label="Password"
                name="password"
                rules={{
                    minLength: {
                        message: "Пароль слишком короткий",
                        value: 8,
                    },
                    required: "Пароль обязателен",
                }}
            />
            <FormTextareaField<IFormValues, "description">
                control={form.control}
                label="Описание"
                name="description"
                rules={{
                    required: "Описание обязательно",
                }}
            />
            <FormSelectField<IFormValues, "provider">
                control={form.control}
                label="Поставщик"
                name="provider"
                options={[
                    {
                        label: "OpenAI",
                        value: "openai",
                    },
                    {
                        label: "Anthropic",
                        value: "anthropic",
                    },
                    {
                        description: "Локальная модель",
                        label: "Ollama",
                        value: "ollama",
                    },
                ]}
                rules={{
                    required: "Выберите поставщика",
                }}
            />
            <FormNumberField<IFormValues, "issueLimit">
                control={form.control}
                label="Лимит задач"
                name="issueLimit"
                inputProps={{
                    min: 1,
                }}
                rules={{
                    min: {
                        message: "Лимит не может быть меньше 1",
                        value: 1,
                    },
                    required: "Лимит обязателен",
                }}
            />
            <FormCheckboxField<IFormValues, "enableFeature">
                control={form.control}
                label="Включить функцию"
                name="enableFeature"
            />
            <FormSwitchField<IFormValues, "sendNotifications">
                control={form.control}
                label="Уведомления"
                name="sendNotifications"
            />
            <FormRadioGroupField<IFormValues, "mode">
                control={form.control}
                label="Режим"
                name="mode"
                options={[
                    {
                        label: "Строгий",
                        value: "strict",
                    },
                    {
                        label: "Свободный",
                        value: "relaxed",
                    },
                ]}
                rules={{
                    required: "Выберите режим",
                }}
            />
            <FormSubmitButton isSubmitting={false} submittingText="Сохраняем...">
                Сохранить
            </FormSubmitButton>
        </form>
    )
}

describe("form components", (): void => {
    it("валидирует текстовое поле и отправляет данные формы", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()

        renderWithProviders(<TextFieldHarness onSubmit={onSubmit} />)

        const emailInput = screen.getByRole("textbox", { name: "Email" })
        const submitButton = screen.getByRole("button", { name: "Отправить" })

        await user.type(emailInput, "bad")
        await user.click(submitButton)

        expect(screen.queryByText("Минимум 6 символов")).not.toBeNull()
        expect(onSubmit).not.toHaveBeenCalled()

        await user.clear(emailInput)
        await user.type(emailInput, "alice@example.com")
        await user.click(submitButton)

        await waitFor((): void => {
            expect(screen.queryByText("Минимум 6 символов")).toBeNull()
        })
        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it("переключает видимость пароля в password field", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<PasswordHarness passwordDefault="initial-pass" />)

        const input = screen.getByLabelText<HTMLInputElement>("Password")
        const showButton = screen.getByRole("button", { name: "Show password text" })

        expect(input.type).toBe("password")
        expect(input.value).toBe("initial-pass")

        await user.click(showButton)
        expect(screen.queryByRole("button", { name: "Hide password text" })).not.toBeNull()
        expect(input.type).toBe("text")

        await user.click(screen.getByRole("button", { name: "Hide password text" }))
        expect(screen.queryByRole("button", { name: "Show password text" })).not.toBeNull()
        expect(input.type).toBe("password")
    })

    it("обрабатывает полный набор формы и отправляет значения", async (): Promise<void> => {
        const user = userEvent.setup()
        let submittedValues: IFormValues | undefined

        renderWithProviders(
            <FullFormHarness
                onSubmit={(values): void => {
                    submittedValues = values
                }}
            />,
        )

        const descriptionInput = screen.getByRole("textbox", { name: "Описание" })
        const emailInput = screen.getByRole("textbox", { name: "Email" })
        const passwordInput = screen.getByLabelText<HTMLInputElement>("Password")
        const issueLimitInput = screen.getByRole("spinbutton", {
            name: "Лимит задач",
        })
        const featureCheckbox = screen.getByRole("checkbox", { name: "Включить функцию" })
        const notificationsSwitch = screen.getByRole("switch", { name: "Уведомления" })
        const strictModeRadio = screen.getByRole("radio", { name: "Строгий" })
        const submitButton = screen.getByRole("button", { name: "Сохранить" })

        await user.type(emailInput, "bad")
        await user.type(passwordInput, "short")
        await user.type(descriptionInput, "Описание")
        await user.clear(issueLimitInput)
        await user.type(issueLimitInput, "5")
        await user.click(featureCheckbox)
        await user.click(notificationsSwitch)
        await user.click(strictModeRadio)
        await user.click(submitButton)

        expect(submittedValues).toBeUndefined()

        await user.clear(emailInput)
        await user.type(emailInput, "alice@example.com")
        await user.clear(passwordInput)
        await user.type(passwordInput, "long-password")
        await user.click(submitButton)

        await waitFor((): void => {
            expect(submittedValues).not.toBeUndefined()
        })
        expect(submittedValues).toMatchObject({
            description: "Описание",
            email: "alice@example.com",
            enableFeature: true,
            issueLimit: 15,
            mode: "strict",
            password: "long-password",
            provider: "openai",
            sendNotifications: true,
        })
    })

    it("показывает loading-состояние на submit-кнопке", (): void => {
        renderWithProviders(
            <form>
                <FormSubmitButton isSubmitting={true} submittingText="Сохраняем...">
                    Сохранить
                </FormSubmitButton>
            </form>,
        )

        const button = screen.getByRole<HTMLButtonElement>("button", {
            name: "Сохраняем...",
        })
        expect(button.disabled).toBe(true)
        expect(button.textContent).toBe("Сохраняем...")
    })
})
