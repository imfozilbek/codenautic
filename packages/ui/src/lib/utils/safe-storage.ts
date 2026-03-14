/**
 * Safe browser storage utilities.
 * Wraps localStorage/sessionStorage operations with try/catch
 * to handle QuotaExceededError and SecurityError gracefully.
 */

/**
 * Safely reads a string value from browser storage.
 *
 * @param storage - The Storage instance (localStorage or sessionStorage).
 * @param key - The storage key to read.
 * @returns The stored value, or `undefined` if absent or inaccessible.
 */
export function safeStorageGet(storage: Storage | undefined, key: string): string | undefined {
    if (storage === undefined) {
        return undefined
    }
    try {
        return storage.getItem(key) ?? undefined
    } catch {
        return undefined
    }
}

/**
 * Safely writes a string value to browser storage.
 *
 * @param storage - The Storage instance (localStorage or sessionStorage).
 * @param key - The storage key to write.
 * @param value - The string value to store.
 * @returns `true` if the write succeeded, `false` otherwise.
 */
export function safeStorageSet(storage: Storage | undefined, key: string, value: string): boolean {
    if (storage === undefined) {
        return false
    }
    try {
        storage.setItem(key, value)
        return true
    } catch {
        return false
    }
}

/**
 * Safely removes a value from browser storage.
 *
 * @param storage - The Storage instance (localStorage or sessionStorage).
 * @param key - The storage key to remove.
 * @returns `true` if removal succeeded, `false` otherwise.
 */
export function safeStorageRemove(storage: Storage | undefined, key: string): boolean {
    if (storage === undefined) {
        return false
    }
    try {
        storage.removeItem(key)
        return true
    } catch {
        return false
    }
}

/**
 * Safely reads and parses a JSON value from browser storage.
 *
 * @param storage - The Storage instance.
 * @param key - The storage key.
 * @param fallback - Value returned when reading or parsing fails.
 * @returns Parsed value or the fallback.
 */
export function safeStorageGetJson<T>(storage: Storage | undefined, key: string, fallback: T): T {
    const raw = safeStorageGet(storage, key)
    if (raw === undefined) {
        return fallback
    }
    try {
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

/**
 * Safely serializes and writes a JSON value to browser storage.
 *
 * @param storage - The Storage instance.
 * @param key - The storage key.
 * @param value - The value to serialize and store.
 * @returns `true` if the write succeeded, `false` otherwise.
 */
export function safeStorageSetJson(
    storage: Storage | undefined,
    key: string,
    value: unknown,
): boolean {
    try {
        const serialized = JSON.stringify(value)
        return safeStorageSet(storage, key, serialized)
    } catch {
        return false
    }
}

/**
 * Returns the window localStorage if available, or `undefined`.
 *
 * @returns localStorage or `undefined` in SSR/restricted contexts.
 */
export function getWindowLocalStorage(): Storage | undefined {
    if (typeof window === "undefined") {
        return undefined
    }
    try {
        return window.localStorage
    } catch {
        return undefined
    }
}

/**
 * Returns the window sessionStorage if available, or `undefined`.
 *
 * @returns sessionStorage or `undefined` in SSR/restricted contexts.
 */
export function getWindowSessionStorage(): Storage | undefined {
    if (typeof window === "undefined") {
        return undefined
    }
    try {
        return window.sessionStorage
    } catch {
        return undefined
    }
}
