import type { ITriageItem } from "@/lib/api/endpoints/triage.endpoint"

import type { TriageCollection } from "../collections/triage-collection"

/**
 * Начальный набор triage items для mock API (5 штук).
 */
const SEED_TRIAGE_ITEMS: ReadonlyArray<ITriageItem> = [
    {
        category: "assigned_ccr",
        deepLink: "/reviews/412",
        dueAt: "2026-03-04T11:00:00Z",
        escalationLevel: "none",
        id: "MW-1001",
        isRead: false,
        owner: "me",
        repository: "repo-ui",
        severity: "high",
        slaMinutes: 120,
        status: "in_progress",
        timestamp: "2026-03-04T10:10:00Z",
        title: "CCR #412 needs final response",
    },
    {
        category: "critical_issue",
        deepLink: "/issues",
        dueAt: "2026-03-04T10:30:00Z",
        escalationLevel: "warn",
        id: "MW-1002",
        isRead: false,
        owner: "team",
        repository: "repo-core",
        severity: "critical",
        slaMinutes: 60,
        status: "unassigned",
        timestamp: "2026-03-04T09:42:00Z",
        title: "Tenant boundary regression in auth middleware",
    },
    {
        category: "inbox_notification",
        deepLink: "/settings-notifications",
        dueAt: "2026-03-04T11:20:00Z",
        escalationLevel: "none",
        id: "MW-1003",
        isRead: true,
        owner: "me",
        repository: "repo-ui",
        severity: "medium",
        slaMinutes: 240,
        status: "assigned",
        timestamp: "2026-03-04T08:30:00Z",
        title: "Notification digest pending confirmation",
    },
    {
        category: "stuck_job",
        deepLink: "/settings-jobs",
        dueAt: "2026-03-04T10:20:00Z",
        escalationLevel: "warn",
        id: "MW-1004",
        isRead: false,
        owner: "unassigned",
        repository: "repo-api",
        severity: "high",
        slaMinutes: 45,
        status: "blocked",
        timestamp: "2026-03-04T08:15:00Z",
        title: "Scan worker stuck on queue heartbeat",
    },
    {
        category: "pending_approval",
        deepLink: "/reviews/409",
        dueAt: "2026-03-04T10:45:00Z",
        escalationLevel: "none",
        id: "MW-1005",
        isRead: false,
        owner: "team",
        repository: "repo-api",
        severity: "high",
        slaMinutes: 90,
        status: "assigned",
        timestamp: "2026-03-04T07:58:00Z",
        title: "Approval pending for CCR #409",
    },
]

/**
 * Заполняет triage-коллекцию начальным набором данных.
 *
 * @param triage Коллекция triage для заполнения.
 */
export function seedTriage(triage: TriageCollection): void {
    triage.seed(SEED_TRIAGE_ITEMS)
}
