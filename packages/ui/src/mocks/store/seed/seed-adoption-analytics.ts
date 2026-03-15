import type {
    IFunnelStage,
    IWorkflowHealth,
    TAnalyticsRange,
} from "@/lib/api/endpoints/adoption-analytics.endpoint"

import type { AdoptionAnalyticsCollection } from "../collections/adoption-analytics-collection"

/**
 * Funnel stages по диапазонам.
 */
const FUNNEL_BY_RANGE: ReadonlyMap<TAnalyticsRange, readonly IFunnelStage[]> = new Map([
    [
        "7d",
        [
            { id: "connect_provider", label: "Connect provider", count: 34 },
            { id: "add_repo", label: "Add repository", count: 28 },
            { id: "first_scan", label: "First scan", count: 25 },
            { id: "first_insights", label: "First insights", count: 21 },
            { id: "first_ccr_reviewed", label: "First CCR reviewed", count: 18 },
        ],
    ],
    [
        "30d",
        [
            { id: "connect_provider", label: "Connect provider", count: 100 },
            { id: "add_repo", label: "Add repository", count: 88 },
            { id: "first_scan", label: "First scan", count: 81 },
            { id: "first_insights", label: "First insights", count: 73 },
            { id: "first_ccr_reviewed", label: "First CCR reviewed", count: 62 },
        ],
    ],
    [
        "90d",
        [
            { id: "connect_provider", label: "Connect provider", count: 260 },
            { id: "add_repo", label: "Add repository", count: 228 },
            { id: "first_scan", label: "First scan", count: 209 },
            { id: "first_insights", label: "First insights", count: 191 },
            { id: "first_ccr_reviewed", label: "First CCR reviewed", count: 171 },
        ],
    ],
])

/**
 * Workflow health по диапазонам.
 */
const HEALTH_BY_RANGE: ReadonlyMap<TAnalyticsRange, readonly IWorkflowHealth[]> = new Map([
    [
        "7d",
        [
            {
                health: "healthy",
                stage: "Provider setup",
                summary: "Most teams finish provider setup within one session.",
            },
            {
                health: "needs_attention",
                stage: "First scan",
                summary: "Some scans delayed by queue contention during peak hours.",
            },
            {
                health: "needs_attention",
                stage: "First CCR reviewed",
                summary:
                    "Review completion is improving but still below target threshold.",
            },
        ],
    ],
    [
        "30d",
        [
            {
                health: "healthy",
                stage: "Provider setup",
                summary: "Most teams finish provider setup within one session.",
            },
            {
                health: "needs_attention",
                stage: "First scan",
                summary: "Some scans delayed by queue contention during peak hours.",
            },
            {
                health: "needs_attention",
                stage: "First CCR reviewed",
                summary:
                    "Review completion is improving but still below target threshold.",
            },
        ],
    ],
    [
        "90d",
        [
            {
                health: "healthy",
                stage: "Provider setup",
                summary: "Stable completion rate and low setup latency.",
            },
            {
                health: "needs_attention",
                stage: "First scan",
                summary:
                    "Drop-offs increase on large repositories with slow first scan.",
            },
            {
                health: "at_risk",
                stage: "First CCR reviewed",
                summary:
                    "Final step has lower conversion due to triage ownership delays.",
            },
        ],
    ],
])

/**
 * Активные пользователи по диапазонам.
 */
const ACTIVE_USERS_BY_RANGE: ReadonlyMap<TAnalyticsRange, number> = new Map([
    ["7d", 31],
    ["30d", 72],
    ["90d", 184],
])

/**
 * Time to first value по диапазонам.
 */
const TTFV_BY_RANGE: ReadonlyMap<TAnalyticsRange, string> = new Map([
    ["7d", "20h"],
    ["30d", "1d 9h"],
    ["90d", "2d 4h"],
])

/**
 * Заполняет adoption analytics коллекцию начальным набором данных.
 *
 * @param collection - Коллекция adoption analytics для заполнения.
 */
export function seedAdoptionAnalytics(collection: AdoptionAnalyticsCollection): void {
    collection.seed({
        funnelByRange: FUNNEL_BY_RANGE,
        healthByRange: HEALTH_BY_RANGE,
        activeUsersByRange: ACTIVE_USERS_BY_RANGE,
        ttfvByRange: TTFV_BY_RANGE,
    })
}
