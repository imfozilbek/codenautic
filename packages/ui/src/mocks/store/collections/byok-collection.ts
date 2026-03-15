import type { IByokKeyEntry } from "@/lib/api/endpoints/byok.endpoint"

/**
 * Коллекция BYOK ключей для mock API.
 *
 * Хранит in-memory данные BYOK ключей с метаданными использования.
 * Поддерживает CRUD, rotate, toggle, seed и clear.
 */
export class ByokCollection {
    /**
     * Хранилище ключей по ID.
     */
    private keys: Map<string, IByokKeyEntry> = new Map()

    /**
     * Возвращает список всех BYOK ключей.
     *
     * @returns Массив всех ключей.
     */
    public list(): ReadonlyArray<IByokKeyEntry> {
        return Array.from(this.keys.values())
    }

    /**
     * Возвращает ключ по идентификатору.
     *
     * @param id - Идентификатор ключа.
     * @returns Ключ или undefined, если не найден.
     */
    public getById(id: string): IByokKeyEntry | undefined {
        return this.keys.get(id)
    }

    /**
     * Создаёт новый BYOK ключ.
     *
     * @param key - Данные нового ключа.
     */
    public create(key: IByokKeyEntry): void {
        this.keys.set(key.id, key)
    }

    /**
     * Удаляет BYOK ключ по идентификатору.
     *
     * @param id - Идентификатор ключа.
     * @returns true если ключ был удалён, false иначе.
     */
    public remove(id: string): boolean {
        return this.keys.delete(id)
    }

    /**
     * Ротирует секрет ключа: обновляет маскированный секрет и счётчик ротаций.
     *
     * @param id - Идентификатор ключа.
     * @param maskedSecret - Новый маскированный секрет.
     * @returns Обновлённый ключ или undefined, если не найден.
     */
    public rotate(id: string, maskedSecret: string): IByokKeyEntry | undefined {
        const existing = this.keys.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: IByokKeyEntry = {
            ...existing,
            maskedSecret,
            rotationCount: existing.rotationCount + 1,
            lastUsedAt: new Date().toISOString(),
        }

        this.keys.set(id, updated)
        return updated
    }

    /**
     * Переключает активность ключа.
     *
     * @param id - Идентификатор ключа.
     * @param isActive - Новое состояние активности.
     * @returns Обновлённый ключ или undefined, если не найден.
     */
    public toggle(id: string, isActive: boolean): IByokKeyEntry | undefined {
        const existing = this.keys.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: IByokKeyEntry = {
            ...existing,
            isActive,
        }

        this.keys.set(id, updated)
        return updated
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param keys - Массив ключей для загрузки.
     */
    public seed(keys: ReadonlyArray<IByokKeyEntry>): void {
        this.clear()

        for (const key of keys) {
            this.keys.set(key.id, key)
        }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.keys.clear()
    }
}
