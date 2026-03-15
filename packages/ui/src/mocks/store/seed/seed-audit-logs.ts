import type {
    IAuditLogEntry,
    TAuditAction,
} from "@/lib/api/endpoints/audit-logs.endpoint"

import type { AuditLogsCollection } from "../collections/audit-logs-collection"

/**
 * Основные записи аудит-лога для mock API.
 */
const SEED_AUDIT_LOG_ENTRIES: ReadonlyArray<IAuditLogEntry> = [
    {
        action: "member.invited",
        actor: "Neo Anderson",
        details: "Invited anya@acme.dev to Platform Enablement team.",
        id: "audit-1",
        occurredAt: "2026-03-04T09:13:00Z",
        target: "team:platform-enablement",
    },
    {
        action: "role.changed",
        actor: "Trinity",
        details: "Changed role for oliver@acme.dev from viewer to developer.",
        id: "audit-2",
        occurredAt: "2026-03-04T10:02:00Z",
        target: "team:platform-ux",
    },
    {
        action: "integration.connected",
        actor: "Morpheus",
        details: "Connected Jira integration and enabled issue sync.",
        id: "audit-3",
        occurredAt: "2026-03-03T16:22:00Z",
        target: "integration:jira",
    },
    {
        action: "policy.updated",
        actor: "Neo Anderson",
        details: "Updated review policy for critical repositories.",
        id: "audit-4",
        occurredAt: "2026-03-03T13:54:00Z",
        target: "policy:code-review",
    },
    {
        action: "schedule.updated",
        actor: "System",
        details: "Rescan schedule switched to weekdays 09:00 UTC+05.",
        id: "audit-5",
        occurredAt: "2026-03-02T07:10:00Z",
        target: "scan-schedule:main",
    },
]

/**
 * Генерирует дополнительные записи аудит-лога для демо-данных.
 *
 * @returns Массив из 120 сгенерированных записей.
 */
function generateExtraAuditLogs(): ReadonlyArray<IAuditLogEntry> {
    const actors: ReadonlyArray<string> = [
        "Neo Anderson",
        "Trinity",
        "Morpheus",
        "System",
    ]
    const actions: ReadonlyArray<TAuditAction> = [
        "member.invited",
        "role.changed",
        "integration.connected",
        "policy.updated",
        "schedule.updated",
    ]

    return Array.from({ length: 120 }).map(
        (_entry, index): IAuditLogEntry => {
            const actor = actors[index % actors.length] ?? "System"
            const action = actions[index % actions.length] ?? "policy.updated"
            const day = String(1 + (index % 28)).padStart(2, "0")
            const hour = String(8 + (index % 11)).padStart(2, "0")
            const minute = String((index * 7) % 60).padStart(2, "0")

            return {
                action,
                actor,
                details: `Generated audit event ${String(index + 1)} for ${action}.`,
                id: `audit-generated-${String(index + 1)}`,
                occurredAt: `2026-02-${day}T${hour}:${minute}:00Z`,
                target: `resource:${String(index + 1)}`,
            }
        },
    )
}

/**
 * Все seed-записи аудит-лога.
 */
const ALL_SEED_AUDIT_LOGS: ReadonlyArray<IAuditLogEntry> = [
    ...SEED_AUDIT_LOG_ENTRIES,
    ...generateExtraAuditLogs(),
]

/**
 * Заполняет audit-logs коллекцию начальным набором данных.
 *
 * @param auditLogs - Коллекция audit logs для заполнения.
 */
export function seedAuditLogs(auditLogs: AuditLogsCollection): void {
    auditLogs.seed(ALL_SEED_AUDIT_LOGS)
}
