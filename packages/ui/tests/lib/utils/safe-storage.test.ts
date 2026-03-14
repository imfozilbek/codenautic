import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    getWindowLocalStorage,
    getWindowSessionStorage,
    safeStorageGet,
    safeStorageGetJson,
    safeStorageRemove,
    safeStorageSet,
    safeStorageSetJson,
} from "@/lib/utils/safe-storage"

function createMockStorage(): Storage {
    const store = new Map<string, string>()
    return {
        getItem: (key: string): string | null => store.get(key) ?? null,
        setItem: (key: string, value: string): void => {
            store.set(key, value)
        },
        removeItem: (key: string): void => {
            store.delete(key)
        },
        clear: (): void => {
            store.clear()
        },
        get length(): number {
            return store.size
        },
        key: (_index: number): string | null => null,
    }
}

function createThrowingStorage(): Storage {
    return {
        getItem: (): string | null => {
            throw new DOMException("SecurityError")
        },
        setItem: (): void => {
            throw new DOMException("QuotaExceededError")
        },
        removeItem: (): void => {
            throw new DOMException("SecurityError")
        },
        clear: (): void => {
            throw new DOMException("SecurityError")
        },
        get length(): number {
            return 0
        },
        key: (): string | null => null,
    }
}

describe("safeStorageGet", (): void => {
    it("when storage has value, then returns it", (): void => {
        const storage = createMockStorage()
        storage.setItem("key", "value")

        expect(safeStorageGet(storage, "key")).toBe("value")
    })

    it("when storage has no value, then returns undefined", (): void => {
        const storage = createMockStorage()

        expect(safeStorageGet(storage, "missing")).toBeUndefined()
    })

    it("when storage is undefined, then returns undefined", (): void => {
        expect(safeStorageGet(undefined, "key")).toBeUndefined()
    })

    it("when storage throws, then returns undefined", (): void => {
        const storage = createThrowingStorage()

        expect(safeStorageGet(storage, "key")).toBeUndefined()
    })
})

describe("safeStorageSet", (): void => {
    it("when storage is writable, then writes value and returns true", (): void => {
        const storage = createMockStorage()

        const result = safeStorageSet(storage, "key", "value")

        expect(result).toBe(true)
        expect(storage.getItem("key")).toBe("value")
    })

    it("when storage is undefined, then returns false", (): void => {
        expect(safeStorageSet(undefined, "key", "value")).toBe(false)
    })

    it("when storage throws QuotaExceededError, then returns false", (): void => {
        const storage = createThrowingStorage()

        expect(safeStorageSet(storage, "key", "value")).toBe(false)
    })
})

describe("safeStorageRemove", (): void => {
    it("when key exists, then removes it and returns true", (): void => {
        const storage = createMockStorage()
        storage.setItem("key", "value")

        const result = safeStorageRemove(storage, "key")

        expect(result).toBe(true)
        expect(storage.getItem("key")).toBeNull()
    })

    it("when storage is undefined, then returns false", (): void => {
        expect(safeStorageRemove(undefined, "key")).toBe(false)
    })

    it("when storage throws, then returns false", (): void => {
        const storage = createThrowingStorage()

        expect(safeStorageRemove(storage, "key")).toBe(false)
    })
})

describe("safeStorageGetJson", (): void => {
    it("when storage has valid JSON, then returns parsed value", (): void => {
        const storage = createMockStorage()
        storage.setItem("data", '{"count":42}')

        const result = safeStorageGetJson(storage, "data", { count: 0 })

        expect(result).toEqual({ count: 42 })
    })

    it("when storage has invalid JSON, then returns fallback", (): void => {
        const storage = createMockStorage()
        storage.setItem("data", "{broken}")

        const fallback = { count: 0 }
        const result = safeStorageGetJson(storage, "data", fallback)

        expect(result).toBe(fallback)
    })

    it("when key is missing, then returns fallback", (): void => {
        const storage = createMockStorage()
        const fallback = [1, 2, 3]

        expect(safeStorageGetJson(storage, "missing", fallback)).toBe(fallback)
    })

    it("when storage is undefined, then returns fallback", (): void => {
        expect(safeStorageGetJson(undefined, "key", "default")).toBe("default")
    })
})

describe("safeStorageSetJson", (): void => {
    it("when value is serializable, then writes JSON and returns true", (): void => {
        const storage = createMockStorage()

        const result = safeStorageSetJson(storage, "data", { count: 42 })

        expect(result).toBe(true)
        expect(storage.getItem("data")).toBe('{"count":42}')
    })

    it("when value has circular reference, then returns false", (): void => {
        const storage = createMockStorage()
        const circular: Record<string, unknown> = {}
        circular.self = circular

        expect(safeStorageSetJson(storage, "data", circular)).toBe(false)
    })

    it("when storage is undefined, then returns false", (): void => {
        expect(safeStorageSetJson(undefined, "key", { a: 1 })).toBe(false)
    })

    it("when storage throws on write, then returns false", (): void => {
        const storage = createThrowingStorage()

        expect(safeStorageSetJson(storage, "key", { a: 1 })).toBe(false)
    })
})

describe("getWindowLocalStorage", (): void => {
    beforeEach((): void => {
        vi.restoreAllMocks()
    })

    it("when window exists, then returns localStorage", (): void => {
        const result = getWindowLocalStorage()

        expect(result).toBeDefined()
    })
})

describe("getWindowSessionStorage", (): void => {
    beforeEach((): void => {
        vi.restoreAllMocks()
    })

    it("when window exists, then returns sessionStorage", (): void => {
        const result = getWindowSessionStorage()

        expect(result).toBeDefined()
    })
})
