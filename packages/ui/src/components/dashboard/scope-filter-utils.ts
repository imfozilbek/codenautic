import type { Key } from "@heroui/react"

/**
 * Создаёт обработчик изменения scope-фильтра для HeroUI v3 Select.
 * Устраняет дублирование идентичной логики извлечения значения из Key.
 *
 * @param callback Callback для обновления scope-значения.
 * @returns Обработчик onSelectionChange для HeroUI Select.
 */
export function createScopeChangeHandler<T extends string>(
    callback: (value: T) => void,
): (key: Key | null) => void {
    return (key: Key | null): void => {
        if (key === null) {
            return
        }
        callback(String(key) as T)
    }
}
