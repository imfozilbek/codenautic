import { type ReactElement } from "react"
import { Button } from "@/components/ui"
import { type ButtonProps } from "@/components/ui/button"

/**
 * Свойства кнопки сабмита формы.
 */
export interface IFormSubmitButtonProps {
    /** Текст по умолчанию. */
    readonly children: string
    /** Текст, пока форма отправляется. */
    readonly submittingText?: string
    /** Заблокирована ли кнопка. */
    readonly disabled?: boolean
    /** Идет ли отправка формы. */
    readonly isSubmitting?: boolean
    /** Дополнительные props HeroUI Button. */
    readonly buttonProps?: Omit<ButtonProps, "type" | "children">
}

/**
 * Блок submit-кнопки с поддержкой состояния отправки.
 *
 * @param props Конфигурация кнопки.
 * @returns Кнопка для сабмита формы с UX состояния loading.
 */
export function FormSubmitButton(props: IFormSubmitButtonProps): ReactElement {
    const isDisabled = props.disabled === true || props.isSubmitting === true

    return (
        <Button
            {...props.buttonProps}
            aria-busy={props.isSubmitting === true}
            isDisabled={isDisabled}
            isLoading={props.isSubmitting === true}
            type="submit"
        >
            {props.isSubmitting === true && props.submittingText !== undefined
                ? props.submittingText
                : props.children}
        </Button>
    )
}
