import { toast } from "@heroui/react"

interface IToastApi {
    /** Успешное уведомление. */
    readonly success: (message: string) => void
    /** Информационное уведомление. */
    readonly info: (message: string) => void
    /** Предупреждение. */
    readonly warning: (message: string) => void
    /** Ошибка. */
    readonly danger: (message: string) => void
    /** Legacy error alias. */
    readonly error?: (message: string) => void
}

const toastApi = toast as IToastApi

/**
 * Показать toast-success в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastSuccess(message: string): void {
    toastApi.success(message)
}

/**
 * Показать toast-info в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastInfo(message: string): void {
    toastApi.info(message)
}

/**
 * Показать toast-warning в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastWarning(message: string): void {
    toastApi.warning(message)
}

/**
 * Показать toast-error в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastError(message: string): void {
    if (toastApi.danger !== undefined) {
        toastApi.danger(message)
        return
    }

    if (toastApi.error !== undefined) {
        toastApi.error(message)
    }
}
