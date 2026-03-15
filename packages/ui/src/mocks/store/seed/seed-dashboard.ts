import type { DashboardCollection } from "../collections/dashboard-collection"
import type { IDashboardSeedData } from "../collections/dashboard-collection"

/**
 * Seed-данные dashboard: KPI-метрики, распределения, активность,
 * flow-метрики, использование токенов, рабочая очередь, временная шкала.
 */
const SEED_DATA: IDashboardSeedData = {
    metrics: [
        {
            range: "1d",
            items: [
                {
                    id: "ccr-open",
                    label: "Open CCR",
                    value: "19",
                    caption: "Critical + warnings included",
                    trendDirection: "up",
                    trendLabel: "+8%",
                },
                {
                    id: "reviews-complete",
                    label: "CCR reviewed",
                    value: "44",
                    caption: "Auto/manual accepted",
                    trendDirection: "up",
                    trendLabel: "+5%",
                },
                {
                    id: "suggestions",
                    label: "Suggestions emitted",
                    value: "420",
                    caption: "Median quality score 82",
                    trendDirection: "neutral",
                    trendLabel: "Stable",
                },
                {
                    id: "jobs-health",
                    label: "Active jobs",
                    value: "2",
                    caption: "1 degraded",
                    trendDirection: "down",
                    trendLabel: "-1",
                },
            ],
        },
        {
            range: "7d",
            items: [
                {
                    id: "ccr-open",
                    label: "Open CCR",
                    value: "19",
                    caption: "Critical + warnings included",
                    trendDirection: "up",
                    trendLabel: "+8%",
                },
                {
                    id: "reviews-complete",
                    label: "CCR reviewed",
                    value: "44",
                    caption: "Auto/manual accepted",
                    trendDirection: "up",
                    trendLabel: "+5%",
                },
                {
                    id: "suggestions",
                    label: "Suggestions emitted",
                    value: "420",
                    caption: "Median quality score 82",
                    trendDirection: "neutral",
                    trendLabel: "Stable",
                },
                {
                    id: "jobs-health",
                    label: "Active jobs",
                    value: "2",
                    caption: "1 degraded",
                    trendDirection: "down",
                    trendLabel: "-1",
                },
            ],
        },
        {
            range: "30d",
            items: [
                {
                    id: "ccr-open",
                    label: "Open CCR",
                    value: "41",
                    caption: "Critical + warnings included",
                    trendDirection: "up",
                    trendLabel: "+8%",
                },
                {
                    id: "reviews-complete",
                    label: "CCR reviewed",
                    value: "128",
                    caption: "Auto/manual accepted",
                    trendDirection: "up",
                    trendLabel: "+5%",
                },
                {
                    id: "suggestions",
                    label: "Suggestions emitted",
                    value: "1,210",
                    caption: "Median quality score 82",
                    trendDirection: "neutral",
                    trendLabel: "Stable",
                },
                {
                    id: "jobs-health",
                    label: "Active jobs",
                    value: "5",
                    caption: "1 degraded",
                    trendDirection: "down",
                    trendLabel: "-1",
                },
            ],
        },
        {
            range: "90d",
            items: [
                {
                    id: "ccr-open",
                    label: "Open CCR",
                    value: "41",
                    caption: "Critical + warnings included",
                    trendDirection: "up",
                    trendLabel: "+8%",
                },
                {
                    id: "reviews-complete",
                    label: "CCR reviewed",
                    value: "128",
                    caption: "Auto/manual accepted",
                    trendDirection: "up",
                    trendLabel: "+5%",
                },
                {
                    id: "suggestions",
                    label: "Suggestions emitted",
                    value: "1,210",
                    caption: "Median quality score 82",
                    trendDirection: "neutral",
                    trendLabel: "Stable",
                },
                {
                    id: "jobs-health",
                    label: "Active jobs",
                    value: "5",
                    caption: "1 degraded",
                    trendDirection: "down",
                    trendLabel: "-1",
                },
            ],
        },
    ],
    statusDistribution: [
        {
            range: "1d",
            items: [
                { status: "approved", count: 42, color: "oklch(0.65 0.17 142)" },
                { status: "queued", count: 12, color: "oklch(0.78 0.17 90)" },
                { status: "in_progress", count: 7, color: "oklch(0.68 0.16 260)" },
                { status: "rejected", count: 4, color: "oklch(0.64 0.2 29)" },
            ],
        },
        {
            range: "7d",
            items: [
                { status: "approved", count: 122, color: "oklch(0.65 0.17 142)" },
                { status: "queued", count: 38, color: "oklch(0.78 0.17 90)" },
                { status: "in_progress", count: 26, color: "oklch(0.68 0.16 260)" },
                { status: "rejected", count: 19, color: "oklch(0.64 0.2 29)" },
                { status: "new", count: 11, color: "oklch(0.72 0.12 230)" },
            ],
        },
        {
            range: "30d",
            items: [
                { status: "approved", count: 122, color: "oklch(0.65 0.17 142)" },
                { status: "queued", count: 38, color: "oklch(0.78 0.17 90)" },
                { status: "in_progress", count: 26, color: "oklch(0.68 0.16 260)" },
                { status: "rejected", count: 19, color: "oklch(0.64 0.2 29)" },
                { status: "new", count: 11, color: "oklch(0.72 0.12 230)" },
            ],
        },
        {
            range: "90d",
            items: [
                { status: "approved", count: 122, color: "oklch(0.65 0.17 142)" },
                { status: "queued", count: 38, color: "oklch(0.78 0.17 90)" },
                { status: "in_progress", count: 26, color: "oklch(0.68 0.16 260)" },
                { status: "rejected", count: 19, color: "oklch(0.64 0.2 29)" },
                { status: "new", count: 11, color: "oklch(0.72 0.12 230)" },
            ],
        },
    ],
    teamActivity: [
        {
            range: "1d",
            items: [
                { developer: "Neo", ccrMerged: 3 },
                { developer: "Trinity", ccrMerged: 2 },
                { developer: "Morpheus", ccrMerged: 2 },
                { developer: "Niobe", ccrMerged: 1 },
            ],
        },
        {
            range: "7d",
            items: [
                { developer: "Neo", ccrMerged: 11 },
                { developer: "Trinity", ccrMerged: 9 },
                { developer: "Morpheus", ccrMerged: 7 },
                { developer: "Niobe", ccrMerged: 5 },
            ],
        },
        {
            range: "30d",
            items: [
                { developer: "Neo", ccrMerged: 28 },
                { developer: "Trinity", ccrMerged: 22 },
                { developer: "Morpheus", ccrMerged: 18 },
                { developer: "Niobe", ccrMerged: 14 },
                { developer: "Cypher", ccrMerged: 12 },
            ],
        },
        {
            range: "90d",
            items: [
                { developer: "Neo", ccrMerged: 74 },
                { developer: "Trinity", ccrMerged: 61 },
                { developer: "Morpheus", ccrMerged: 55 },
                { developer: "Niobe", ccrMerged: 41 },
                { developer: "Cypher", ccrMerged: 33 },
                { developer: "Switch", ccrMerged: 29 },
            ],
        },
    ],
    flowMetrics: [
        {
            range: "1d",
            items: [
                { deliveryCapacity: 18, flowEfficiency: 62, window: "08:00" },
                { deliveryCapacity: 21, flowEfficiency: 65, window: "10:00" },
                { deliveryCapacity: 19, flowEfficiency: 63, window: "12:00" },
                { deliveryCapacity: 23, flowEfficiency: 67, window: "14:00" },
                { deliveryCapacity: 24, flowEfficiency: 68, window: "16:00" },
            ],
        },
        {
            range: "7d",
            items: [
                { deliveryCapacity: 44, flowEfficiency: 59, window: "D1" },
                { deliveryCapacity: 47, flowEfficiency: 61, window: "D2" },
                { deliveryCapacity: 51, flowEfficiency: 63, window: "D3" },
                { deliveryCapacity: 52, flowEfficiency: 64, window: "D4" },
                { deliveryCapacity: 54, flowEfficiency: 66, window: "D5" },
                { deliveryCapacity: 55, flowEfficiency: 67, window: "D6" },
                { deliveryCapacity: 57, flowEfficiency: 68, window: "D7" },
            ],
        },
        {
            range: "30d",
            items: [
                { deliveryCapacity: 72, flowEfficiency: 58, window: "W1" },
                { deliveryCapacity: 81, flowEfficiency: 61, window: "W2" },
                { deliveryCapacity: 85, flowEfficiency: 63, window: "W3" },
                { deliveryCapacity: 89, flowEfficiency: 66, window: "W4" },
            ],
        },
        {
            range: "90d",
            items: [
                { deliveryCapacity: 248, flowEfficiency: 54, window: "M1" },
                { deliveryCapacity: 263, flowEfficiency: 57, window: "M2" },
                { deliveryCapacity: 277, flowEfficiency: 60, window: "M3" },
            ],
        },
    ],
    tokenUsageByModel: [
        {
            range: "1d",
            items: [
                { model: "gpt-4o-mini", tokens: 145_000 },
                { model: "claude-3-7-sonnet", tokens: 98_000 },
                { model: "gpt-4.1-mini", tokens: 73_000 },
            ],
        },
        {
            range: "7d",
            items: [
                { model: "gpt-4o-mini", tokens: 620_000 },
                { model: "claude-3-7-sonnet", tokens: 430_000 },
                { model: "gpt-4.1-mini", tokens: 370_000 },
            ],
        },
        {
            range: "30d",
            items: [
                { model: "gpt-4o-mini", tokens: 2_380_000 },
                { model: "claude-3-7-sonnet", tokens: 1_920_000 },
                { model: "gpt-4.1-mini", tokens: 1_540_000 },
                { model: "mistral-small-latest", tokens: 760_000 },
            ],
        },
        {
            range: "90d",
            items: [
                { model: "gpt-4o-mini", tokens: 6_910_000 },
                { model: "claude-3-7-sonnet", tokens: 5_220_000 },
                { model: "gpt-4.1-mini", tokens: 4_160_000 },
                { model: "mistral-small-latest", tokens: 2_010_000 },
            ],
        },
    ],
    tokenUsageTrend: [
        {
            range: "1d",
            items: [
                { costUsd: 26, period: "08:00" },
                { costUsd: 31, period: "10:00" },
                { costUsd: 34, period: "12:00" },
                { costUsd: 33, period: "14:00" },
                { costUsd: 37, period: "16:00" },
            ],
        },
        {
            range: "7d",
            items: [
                { costUsd: 97, period: "D1" },
                { costUsd: 102, period: "D2" },
                { costUsd: 108, period: "D3" },
                { costUsd: 114, period: "D4" },
                { costUsd: 119, period: "D5" },
                { costUsd: 121, period: "D6" },
                { costUsd: 126, period: "D7" },
            ],
        },
        {
            range: "30d",
            items: [
                { costUsd: 410, period: "W1" },
                { costUsd: 452, period: "W2" },
                { costUsd: 467, period: "W3" },
                { costUsd: 493, period: "W4" },
            ],
        },
        {
            range: "90d",
            items: [
                { costUsd: 1_150, period: "M1" },
                { costUsd: 1_289, period: "M2" },
                { costUsd: 1_362, period: "M3" },
            ],
        },
    ],
    workQueue: [
        {
            id: "critical-ccr",
            title: "CCR queue",
            description: "12 pending. Click to review queue and continue workflow.",
            route: "/reviews",
        },
        {
            id: "impact-graph",
            title: "Impact / Graph",
            description: "Signals suggest drift in architecture health by +12%.",
            route: "/",
        },
        {
            id: "provider-health",
            title: "Provider health",
            description: "Provider key usage limit reached in current period.",
            route: "/settings-llm-providers",
        },
        {
            id: "drift-deploy",
            title: "Ops drill-down",
            description: "Repo onboarding delayed for team runtime.",
            route: "/settings",
        },
    ],
    timeline: [
        {
            id: "tl-1",
            time: "16:10",
            title: "Code scan finished",
            description: "Repository core scanned: 3 high-impact findings cleared.",
            details: "Repository core scanned: 3 high-impact findings cleared.",
            group: "Today",
        },
        {
            id: "tl-2",
            time: "16:03",
            title: "New CCR queued",
            description: "repo/frontend: performance regression review added.",
            details: "repo/frontend: performance regression review added.",
            group: "Today",
        },
        {
            id: "tl-3",
            time: "15:48",
            title: "LLM provider health check",
            description: "OpenAI latency spike detected; fallback provider enabled.",
            details: "OpenAI latency spike detected; fallback provider enabled.",
            group: "Today",
        },
    ],
}

/**
 * Заполняет DashboardCollection seed-данными.
 *
 * Мигрирует все данные из dashboard-mock-data.ts в коллекцию.
 *
 * @param collection Коллекция dashboard для заполнения.
 */
export function seedDashboard(collection: DashboardCollection): void {
    collection.seed(SEED_DATA)
}
