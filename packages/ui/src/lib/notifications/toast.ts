import { toast } from "@heroui/react"

/**
 * Показать toast-success в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastSuccess(message: string): void {
    toast.success(message)
}

/**
 * Показать toast-info в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastInfo(message: string): void {
    toast.info(message)
}

/**
 * Показать toast-warning в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastWarning(message: string): void {
    toast.warning(message)
}

/**
 * Показать toast-error в едином HeroUI-слое.
 *
 * @param message Текст уведомления.
 */
export function showToastError(message: string): void {
    toast.error(message)
}
