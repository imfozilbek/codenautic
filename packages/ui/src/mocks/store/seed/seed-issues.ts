import type {
    IIssue,
    TIssueSeverity,
    TIssueStatus,
} from "@/lib/api/endpoints/issues.endpoint"

import type { IssuesCollection } from "../collections/issues-collection"

/**
 * Начальный набор issues (4 ручных + 26 генерируемых = 30 штук).
 */
const SEED_ISSUES_DEFAULT: ReadonlyArray<IIssue> = [
    {
        detectedAt: "2026-01-12T07:11:00Z",
        filePath: "src/api/repository.ts",
        id: "ISS-101",
        message: "Unhandled error path near data parser",
        owner: "Neo",
        repository: "platform-team/api-gateway",
        severity: "critical",
        status: "open",
        title: "Possible unguarded parse fallback",
    },
    {
        detectedAt: "2026-01-14T13:32:00Z",
        filePath: "src/components/chat-panel.tsx",
        id: "ISS-102",
        message: "Potential DOM injection in dynamic markdown renderer",
        owner: "Trinity",
        repository: "frontend-team/ui-dashboard",
        severity: "high",
        status: "in_progress",
        title: "Dynamic markdown requires re-check",
    },
    {
        detectedAt: "2026-01-17T09:21:00Z",
        filePath: "src/workers/scan.ts",
        id: "ISS-103",
        message: "High churn + low review ratio in queue handler",
        owner: "Morpheus",
        repository: "backend-core/payment-worker",
        severity: "medium",
        status: "fixed",
        title: "Scan queue stability issue",
    },
    {
        detectedAt: "2026-01-18T16:58:00Z",
        filePath: "src/pages/reviews.tsx",
        id: "ISS-104",
        message: "Unstable key usage in virtualized list",
        owner: "Cypher",
        repository: "frontend-team/ui-dashboard",
        severity: "low",
        status: "dismissed",
        title: "Virtualization key fallback",
    },
]

/**
 * Генерирует дополнительный набор issues (26 штук).
 *
 * @returns Массив генерируемых issues.
 */
function generateExtraIssues(): ReadonlyArray<IIssue> {
    const repoOptions: ReadonlyArray<string> = [
        "platform-team/api-gateway",
        "frontend-team/ui-dashboard",
        "backend-core/payment-worker",
    ]
    const severityOptions: ReadonlyArray<TIssueSeverity> = [
        "critical",
        "high",
        "medium",
        "low",
    ]
    const statusOptions: ReadonlyArray<TIssueStatus> = [
        "open",
        "in_progress",
        "fixed",
        "dismissed",
    ]

    return Array.from({ length: 26 }, (_entry, index): IIssue => {
        const repository =
            repoOptions[index % repoOptions.length] ?? "platform-team/api-gateway"
        const severity = severityOptions[index % severityOptions.length] ?? "medium"
        const status = statusOptions[index % statusOptions.length] ?? "open"

        return {
            detectedAt: `2026-01-${String(19 + index).padStart(2, "0")}T11:00:00Z`,
            filePath: `src/services/module-${String(index)}.ts`,
            id: `ISS-${String(index + 105)}`,
            message: `Auto-discovered pattern in module ${String(index)}`,
            owner: `Owner ${String(index % 6)}`,
            repository,
            severity,
            status,
            title: `Generated issue ${String(index)}`,
        }
    })
}

/**
 * Полный набор seed issues (30 штук).
 */
const SEED_ISSUES: ReadonlyArray<IIssue> = [
    ...SEED_ISSUES_DEFAULT,
    ...generateExtraIssues(),
]

/**
 * Заполняет issues-коллекцию начальным набором данных.
 *
 * @param issues Коллекция issues для заполнения.
 */
export function seedIssues(issues: IssuesCollection): void {
    issues.seed(SEED_ISSUES)
}
