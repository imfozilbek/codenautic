import type {
    IReport,
    IReportSectionDistribution,
    IReportTrendPoint,
} from "@/lib/api/endpoints/reports.endpoint"

import type { ReportsCollection } from "../collections/reports-collection"

/**
 * Начальный набор отчётов для seed.
 */
const SEED_REPORTS: ReadonlyArray<IReport> = [
    {
        id: "report-001",
        title: "Architecture Weekly Snapshot",
        type: "architecture",
        format: "pdf",
        status: "completed",
        createdAt: "2026-03-01",
        sections: ["executive-summary", "architecture-drift"],
    },
    {
        id: "report-002",
        title: "Delivery Throughput Pulse",
        type: "delivery",
        format: "html",
        status: "completed",
        createdAt: "2026-03-03",
        sections: ["executive-summary", "delivery-flow"],
    },
    {
        id: "report-003",
        title: "Quality Regression Radar",
        type: "quality",
        format: "pdf",
        status: "failed",
        createdAt: "2026-03-05",
        sections: ["risk-hotspots"],
    },
    {
        id: "report-004",
        title: "Architecture Drift Mid-Sprint",
        type: "architecture",
        format: "png",
        status: "queued",
        createdAt: "2026-03-06",
        sections: ["architecture-drift", "risk-hotspots"],
    },
]

/**
 * Точки тренда для viewer-графика.
 */
const SEED_TRENDS: ReadonlyArray<IReportTrendPoint> = [
    {
        period: "Week 1",
        riskScore: 72,
        deliveryVelocity: 39,
    },
    {
        period: "Week 2",
        riskScore: 66,
        deliveryVelocity: 43,
    },
    {
        period: "Week 3",
        riskScore: 58,
        deliveryVelocity: 48,
    },
    {
        period: "Week 4",
        riskScore: 51,
        deliveryVelocity: 52,
    },
]

/**
 * Распределение по секциям для viewer-графика.
 */
const SEED_DISTRIBUTION: ReadonlyArray<IReportSectionDistribution> = [
    {
        section: "Architecture",
        value: 34,
    },
    {
        section: "Delivery",
        value: 28,
    },
    {
        section: "Risk",
        value: 22,
    },
    {
        section: "Quality",
        value: 16,
    },
]

/**
 * Заполняет коллекцию отчётов начальным набором данных.
 *
 * Загружает 4 отчёта, 4 точки тренда и 4 точки распределения.
 *
 * @param reports - Коллекция отчётов для заполнения.
 */
export function seedReports(reports: ReportsCollection): void {
    reports.seed({
        reports: SEED_REPORTS,
        trends: SEED_TRENDS,
        distribution: SEED_DISTRIBUTION,
    })
}
