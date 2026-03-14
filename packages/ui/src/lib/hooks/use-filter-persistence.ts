import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"

import {
    getWindowLocalStorage,
    safeStorageGetJson,
    safeStorageRemove,
    safeStorageSet,
} from "@/lib/utils/safe-storage"

/** Параметры хука persistence фильтров. */
export interface IUseFilterPersistenceOptions<TValue> {
    /** Значение фильтров по умолчанию. */
    readonly defaultValue: TValue
    /** Ключ в localStorage. */
    readonly storageKey: string
}

/** Результат хука persistence фильтров. */
export interface IUseFilterPersistenceResult<TValue> {
    /** Текущее значение фильтров. */
    readonly value: TValue
    /** Обновление фильтров. */
    readonly setValue: Dispatch<SetStateAction<TValue>>
    /** Сброс фильтров к default и очистка localStorage. */
    readonly reset: () => void
}

function readPersistedValue<TValue>(options: IUseFilterPersistenceOptions<TValue>): TValue {
    return safeStorageGetJson<TValue>(
        getWindowLocalStorage(),
        options.storageKey,
        options.defaultValue,
    )
}

function persistValue(storageKey: string, value: string): boolean {
    return safeStorageSet(getWindowLocalStorage(), storageKey, value)
}

function clearPersistedValue(storageKey: string): boolean {
    return safeStorageRemove(getWindowLocalStorage(), storageKey)
}

/**
 * Хук для сохранения filter state в localStorage.
 *
 * @param options - ключ и значение по умолчанию.
 * @returns Значение фильтра, setter и reset.
 */
export function useFilterPersistence<TValue>(
    options: IUseFilterPersistenceOptions<TValue>,
): IUseFilterPersistenceResult<TValue> {
    const [value, setValue] = useState<TValue>(() => readPersistedValue(options))
    const serializedValue = useMemo((): string => JSON.stringify(value), [value])

    useEffect((): void => {
        persistValue(options.storageKey, serializedValue)
    }, [options.storageKey, serializedValue])

    const reset = (): void => {
        setValue(options.defaultValue)
        clearPersistedValue(options.storageKey)
    }

    return {
        value,
        setValue,
        reset,
    }
}
