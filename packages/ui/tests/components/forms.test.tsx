import {screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {ReactElement} from "react"
import type {SubmitHandler} from "react-hook-form"
import {useForm} from "react-hook-form"
import {describe, expect, it, vi} from "vitest"

import {FormPasswordField, FormSubmitButton, FormTextField} from "@/components/forms"
import {renderWithProviders} from "../utils/render"

interface IFormValues {
    email: string
    password: string
}

function TextFieldFormHarness({
    onSubmit,
}: {
    readonly onSubmit: SubmitHandler<IFormValues>
}): ReactElement {
    const form = useForm<IFormValues>({
        defaultValues: {
            email: "",
            password: "",
        },
    })

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
            <FormSubmitButton submittingText="Отправка..." isSubmitting={false}>
                Отправить
            </FormSubmitButton>
        </form>
    )
}

function PasswordFieldHarness(): ReactElement {
    const form = useForm<IFormValues>({
        defaultValues: {
            email: "",
            password: "initial-pass",
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

describe("form components", (): void => {
    it("валидирует текстовое поле и отправляет данные формы", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()

        renderWithProviders(<TextFieldFormHarness onSubmit={onSubmit} />)

        const emailInput = screen.getByRole("textbox", {name: "Email"})
        await user.type(emailInput, "bad")

        const submitButton = screen.getByRole("button", {name: "Отправить"})
        await user.click(submitButton)

        expect(screen.getByText("Минимум 6 символов")).toBeInTheDocument()
        expect(onSubmit).not.toHaveBeenCalled()

        await user.clear(emailInput)
        await user.type(emailInput, "alice@example.com")
        await user.click(submitButton)

        await waitFor((): void => {
            expect(onSubmit).toHaveBeenCalledTimes(1)
        })
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "alice@example.com",
            }),
            expect.anything(),
        )
    })

    it("переключает видимость пароля в password field", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<PasswordFieldHarness />)

        const input = screen.getByLabelText("Password") as HTMLInputElement
        const showButton = screen.getByRole("button", {name: "Show password text"})

        expect(input.type).toBe("password")
        expect(input.value).toBe("initial-pass")

        await user.click(showButton)
        expect(screen.getByRole("button", {name: "Hide password text"})).toBeInTheDocument()
        expect(input.type).toBe("text")

        await user.click(screen.getByRole("button", {name: "Hide password text"}))
        expect(screen.getByRole("button", {name: "Show password text"})).toBeInTheDocument()
        expect(input.type).toBe("password")
    })

    it("показывает loading-состояние на submit-кнопке", (): void => {
        renderWithProviders(
            <form>
                <FormSubmitButton isSubmitting={true} submittingText="Сохраняем...">
                    Сохранить
                </FormSubmitButton>
            </form>,
        )

        const button = screen.getByRole("button", {name: "Сохраняем..."})
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute("aria-busy", "true")
        expect(button.textContent).toBe("Сохраняем...")
    })
})
