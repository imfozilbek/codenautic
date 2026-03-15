import type {
    IBillingSnapshot,
    IPlanHistoryEntry,
    TPlanHistoryAction,
    TPlanName,
    TBillingStatus,
} from "@/lib/api/endpoints/billing.endpoint"

/**
 * Коллекция billing для mock API.
 *
 * Хранит in-memory данные snapshot биллинга и историю изменений.
 * Поддерживает обновление плана/статуса, seed и clear.
 */
export class BillingCollection {
    /**
     * Текущий snapshot биллинга.
     */
    private snapshot: IBillingSnapshot = { plan: "starter", status: "trial" }

    /**
     * История изменений.
     */
    private history: IPlanHistoryEntry[] = []

    /**
     * Счётчик для генерации уникальных ID.
     */
    private idCounter: number = 0

    /**
     * Возвращает текущий snapshot.
     *
     * @returns Текущий snapshot биллинга.
     */
    public getSnapshot(): IBillingSnapshot {
        return this.snapshot
    }

    /**
     * Возвращает историю изменений.
     *
     * @returns Массив записей истории.
     */
    public getHistory(): ReadonlyArray<IPlanHistoryEntry> {
        return [...this.history]
    }

    /**
     * Обновляет план и/или статус и добавляет запись в историю.
     *
     * @param plan - Новый план (опционально).
     * @param status - Новый статус (опционально).
     * @returns Обновлённый snapshot.
     */
    public updatePlan(plan?: TPlanName, status?: TBillingStatus): IBillingSnapshot {
        const nextPlan = plan ?? this.snapshot.plan
        const nextStatus = status ?? this.snapshot.status

        const actionType: TPlanHistoryAction =
            nextPlan !== this.snapshot.plan ? "plan_change" : "status_change"

        this.snapshot = { plan: nextPlan, status: nextStatus }

        this.idCounter += 1
        const entry: IPlanHistoryEntry = {
            action: actionType,
            actor: "Current operator",
            id: `BILL-${String(this.idCounter).padStart(4, "0")}`,
            occurredAt: new Date().toISOString(),
            outcome: `Applied ${nextPlan} / ${nextStatus} successfully`,
        }
        this.history.unshift(entry)

        return this.snapshot
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param snapshot - Начальный snapshot.
     * @param history - Начальная история.
     */
    public seed(
        snapshot: IBillingSnapshot,
        history: ReadonlyArray<IPlanHistoryEntry>,
    ): void {
        this.clear()
        this.snapshot = snapshot
        this.history = [...history]
        this.idCounter = history.length
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.snapshot = { plan: "starter", status: "trial" }
        this.history = []
        this.idCounter = 0
    }
}
