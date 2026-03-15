import type { IBillingSnapshot, IPlanHistoryEntry } from "@/lib/api/endpoints/billing.endpoint"

import type { BillingCollection } from "../collections/billing-collection"

/**
 * Начальный snapshot биллинга для mock API.
 */
const SEED_BILLING_SNAPSHOT: IBillingSnapshot = {
    plan: "pro",
    status: "active",
}

/**
 * Начальная история изменений плана для mock API.
 */
const SEED_HISTORY: ReadonlyArray<IPlanHistoryEntry> = [
    {
        action: "plan_change",
        actor: "System",
        id: "BILL-2001",
        occurredAt: "2026-03-03T16:12:00Z",
        outcome: "Upgraded from starter to pro",
    },
    {
        action: "status_change",
        actor: "Neo Anderson",
        id: "BILL-2002",
        occurredAt: "2026-03-02T10:40:00Z",
        outcome: "Set status to trial for workspace onboarding",
    },
]

/**
 * Заполняет billing-коллекцию начальным набором данных.
 *
 * @param billing - Коллекция billing для заполнения.
 */
export function seedBilling(billing: BillingCollection): void {
    billing.seed(SEED_BILLING_SNAPSHOT, SEED_HISTORY)
}
