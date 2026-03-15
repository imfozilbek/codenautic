import type {
    ITriageItem,
    TTriageAction,
    TTriageScope,
} from "@/lib/api/endpoints/triage.endpoint"

/** Параметры фильтрации списка triage items. */
export interface ITriageFilterParams {
    /** Scope фильтрации (mine/team/repo). */
    readonly scope?: TTriageScope
}

/**
 * Коллекция triage items для mock API.
 *
 * Хранит in-memory данные triage hub.
 * Поддерживает фильтрацию по scope, действия, seed и clear.
 */
export class TriageCollection {
    /**
     * Хранилище triage items по ID.
     */
    private items: Map<string, ITriageItem> = new Map()

    /**
     * Возвращает отфильтрованный список triage items.
     *
     * @param params Параметры фильтрации.
     * @returns Массив triage items, соответствующих фильтрам.
     */
    public listItems(params: ITriageFilterParams = {}): ReadonlyArray<ITriageItem> {
        const all = Array.from(this.items.values())

        if (params.scope === undefined) {
            return all
        }

        return all.filter((item): boolean => {
            if (params.scope === "mine") {
                return item.owner === "me"
            }
            if (params.scope === "team") {
                return item.owner === "team" || item.owner === "me"
            }
            return item.repository === "repo-api" || item.repository === "repo-core"
        })
    }

    /**
     * Возвращает triage item по идентификатору.
     *
     * @param id Идентификатор triage item.
     * @returns Triage item или undefined, если не найден.
     */
    public getItemById(id: string): ITriageItem | undefined {
        return this.items.get(id)
    }

    /**
     * Выполняет действие над triage item и возвращает обновлённую запись.
     *
     * @param id Идентификатор triage item.
     * @param action Действие для выполнения.
     * @returns Обновлённый triage item или undefined, если не найден.
     */
    public performAction(id: string, action: TTriageAction): ITriageItem | undefined {
        const existing = this.items.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated = applyTriageAction(existing, action)
        this.items.set(id, updated)
        return updated
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param items Массив triage items для загрузки.
     */
    public seed(items: ReadonlyArray<ITriageItem>): void {
        this.clear()

        for (const item of items) {
            this.items.set(item.id, item)
        }
    }

    /**
     * Полностью очищает коллекцию triage items.
     */
    public clear(): void {
        this.items.clear()
    }
}

/**
 * Применяет действие к triage item и возвращает обновлённую копию.
 *
 * @param item Исходный triage item.
 * @param action Действие.
 * @returns Обновлённый triage item.
 */
function applyTriageAction(item: ITriageItem, action: TTriageAction): ITriageItem {
    if (action === "assign_to_me") {
        return {
            ...item,
            owner: "me",
            status: item.status === "unassigned" ? "assigned" : item.status,
        }
    }
    if (action === "mark_read") {
        return { ...item, isRead: true }
    }
    if (action === "snooze") {
        return { ...item, status: "snoozed" }
    }
    if (action === "start_work") {
        return {
            ...item,
            owner: item.owner === "unassigned" ? "me" : item.owner,
            status: "in_progress",
        }
    }
    if (action === "mark_done") {
        return { ...item, status: "done" }
    }
    if (action === "escalate") {
        return {
            ...item,
            escalationLevel: item.escalationLevel === "none" ? "warn" : "critical",
            status: item.status === "done" ? item.status : "blocked",
        }
    }
    return item
}
