import type { IAuditLogEntry } from "@/lib/api/endpoints/audit-logs.endpoint"

/**
 * Коллекция audit logs для mock API.
 *
 * Хранит in-memory записи аудит-лога.
 * Поддерживает фильтрацию по актору, действию и диапазону дат.
 */
export class AuditLogsCollection {
    /**
     * Записи аудит-лога.
     */
    private entries: IAuditLogEntry[] = []

    /**
     * Возвращает все записи.
     *
     * @returns Массив записей аудит-лога.
     */
    public getAll(): ReadonlyArray<IAuditLogEntry> {
        return [...this.entries]
    }

    /**
     * Возвращает отфильтрованные записи.
     *
     * @param actor - Фильтр по актору (undefined = все).
     * @param action - Фильтр по действию (undefined = все).
     * @param dateFrom - Нижняя граница даты YYYY-MM-DD (undefined = без ограничения).
     * @param dateTo - Верхняя граница даты YYYY-MM-DD (undefined = без ограничения).
     * @returns Отфильтрованные записи.
     */
    public getFiltered(
        actor?: string,
        action?: string,
        dateFrom?: string,
        dateTo?: string,
    ): ReadonlyArray<IAuditLogEntry> {
        return this.entries.filter((entry): boolean => {
            const actorMatches =
                actor === undefined ||
                actor.length === 0 ||
                actor === "all" ||
                entry.actor === actor
            const actionMatches =
                action === undefined ||
                action.length === 0 ||
                action === "all" ||
                entry.action === action

            const occurredAtMs = new Date(entry.occurredAt).getTime()
            const fromMatches =
                dateFrom === undefined ||
                dateFrom.length === 0 ||
                occurredAtMs >= new Date(`${dateFrom}T00:00:00.000Z`).getTime()
            const toMatches =
                dateTo === undefined ||
                dateTo.length === 0 ||
                occurredAtMs <= new Date(`${dateTo}T23:59:59.999Z`).getTime()

            return actorMatches && actionMatches && fromMatches && toMatches
        })
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param entries - Начальные записи.
     */
    public seed(entries: ReadonlyArray<IAuditLogEntry>): void {
        this.clear()
        this.entries = [...entries]
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.entries = []
    }
}
