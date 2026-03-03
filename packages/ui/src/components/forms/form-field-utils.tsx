import type { ReactNode } from "react"

/**
 * Утилита для выбора текста ошибки или helper-текста.
 *
 * @param errorMessage Сообщение ошибки.
 * @param helperText Текст-подсказка.
 * @returns Актуальный текст для снизу у поля.
 */
export function pickFieldMessage(
    errorMessage: string | undefined,
    helperText: string | undefined,
): ReactNode | null {
    if (errorMessage !== undefined && errorMessage !== "") {
        return (
            <p className="text-xs text-rose-700" role="alert">
                {errorMessage}
            </p>
        )
    }

    if (helperText === undefined || helperText === "") {
        return null
    }

    return <p className="text-xs text-slate-500">{helperText}</p>
}
