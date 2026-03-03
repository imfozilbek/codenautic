import type { ReactElement } from "react"

import { Link } from "@tanstack/react-router"

import { Alert, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { type IMetricGridMetric, MetricsGrid } from "@/components/dashboard/metrics-grid"

type TRepositoryRisk = "critical" | "high" | "low"
type THighlight = "danger" | "warning" | "success"

interface IArchitectureSummary {
    /** Компонент архитектуры. */
    readonly area: string
    /** Оценка риска (low/high/critical). */
    readonly risk: TRepositoryRisk
    /** Короткое описание текущего состояния. */
    readonly summary: string
}

interface ITechStackItem {
    /** Название технологии. */
    readonly name: string
    /** Версия (если указана). */
    readonly version: string
    /** Описание применённости. */
    readonly note: string
}

interface IRepositoryOverviewProfile {
    /** Уникальный идентификатор (`owner/repo`). */
    readonly id: string
    /** Владелец репозитория. */
    readonly owner: string
    /** Имя репозитория. */
    readonly name: string
    /** Основная ветка. */
    readonly branch: string
    /** Время последнего скана. */
    readonly lastScanAt: string
    /** Количество проанализированных файлов. */
    readonly filesScanned: number
    /** Количество найденных инцидентов по качеству. */
    readonly totalFindings: number
    /** Уровень health score по последнему скану. */
    readonly healthScore: number
    /** Архитектурное резюме по слоям. */
    readonly architectureSummary: ReadonlyArray<IArchitectureSummary>
    /** Ключевые KPI. */
    readonly keyMetrics: ReadonlyArray<IMetricGridMetric>
    /** Используемый стек. */
    readonly techStack: ReadonlyArray<ITechStackItem>
}

type TRepositoryOverviewProps = Readonly<{ repositoryId: string }>

const REPOSITORY_OVERVIEWS: ReadonlyArray<IRepositoryOverviewProfile> = [
    {
        architectureSummary: [
            {
                area: "API gateway",
                risk: "low",
                summary:
                    "Входящий слой разделяет traffic и выполняет базовую auth-схему " +
                    "через OIDC без регрессионных точек.",
            },
            {
                area: "Workers",
                risk: "high",
                summary:
                    "Найдены циклические зависимости между job-координатором и queue adapter; " +
                    "требует выделить контракт.",
            },
            {
                area: "Data layer",
                risk: "low",
                summary: "Слой хранения стабилен, покрытие миграций выше 80%.",
            },
        ],
        branch: "main",
        filesScanned: 1240,
        healthScore: 72,
        id: "platform-team/api-gateway",
        keyMetrics: [
            {
                caption: "Последняя проверка показала 3 critical item",
                id: "critical-issues",
                label: "Critical issues",
                trendDirection: "up",
                trendLabel: "-1",
                value: "3",
            },
            {
                caption: "Изменения в architecture debt",
                id: "architecture-debt",
                label: "Architecture debt score",
                trendDirection: "up",
                trendLabel: "+6%",
                value: "18",
            },
            {
                caption: "Риск-файлов по линтингу и тайпингу",
                id: "typed-files",
                label: "Type-covered files",
                trendDirection: "neutral",
                trendLabel: "Stable",
                value: "1120",
            },
            {
                caption: "Текущий уровень уведомлений",
                id: "notification-latency",
                label: "Median latency",
                trendDirection: "down",
                trendLabel: "-12%",
                value: "0.9s",
            },
        ],
        lastScanAt: "2026-01-01T10:40:00Z",
        name: "api-gateway",
        owner: "platform-team",
        techStack: [
            {
                name: "Node.js",
                note: "Runtime: сервисная обвязка API",
                version: "20.11",
            },
            {
                name: "Express",
                note: "HTTP API и middleware",
                version: "4.19",
            },
            {
                name: "PostgreSQL",
                note: "Persistent storage",
                version: "16",
            },
        ],
        totalFindings: 3,
    },
    {
        architectureSummary: [
            {
                area: "Frontend shell",
                risk: "low",
                summary:
                    "Модульный подход сохранен, критические цепочки " +
                    "в UI не перегружены.",
            },
            {
                area: "State",
                risk: "high",
                summary:
                    "Обнаружен общий глобальный state store, возможен shared mutation баг " +
                    "при параллельных сканах.",
            },
            {
                area: "Build",
                risk: "low",
                summary:
                    "CI pipeline детерминированен, flaky tests отсутствуют " +
                    "в последних 7 днях.",
            },
        ],
        branch: "main",
        filesScanned: 640,
        healthScore: 88,
        id: "frontend-team/ui-dashboard",
        keyMetrics: [
            {
                caption: "Новые предупреждения после обновления ui",
                id: "quality",
                label: "Quality warnings",
                trendDirection: "down",
                trendLabel: "-4%",
                value: "5",
            },
            {
                caption: "Сигналы по accessibility",
                id: "a11y",
                label: "A11Y checks",
                trendDirection: "neutral",
                trendLabel: "Stable",
                value: "14",
            },
            {
                caption: "Показатель тестового покрытия",
                id: "coverage",
                label: "Test coverage",
                trendDirection: "up",
                trendLabel: "+3%",
                value: "73%",
            },
            {
                caption: "Последний scan window",
                id: "scan-window",
                label: "Scan window",
                trendDirection: "neutral",
                trendLabel: "1m 43s",
                value: "103s",
            },
        ],
        lastScanAt: "2026-01-01T09:10:00Z",
        name: "ui-dashboard",
        owner: "frontend-team",
        techStack: [
            {
                name: "React",
                note: "Framework + stateful modules",
                version: "18.3",
            },
            {
                name: "TypeScript",
                note: "Строгая типизация хуков",
                version: "5.4",
            },
            {
                name: "HeroUI",
                note: "Сетка, карточки, таблицы и chips",
                version: "3.x",
            },
        ],
        totalFindings: 5,
    },
    {
        architectureSummary: [
            {
                area: "Worker runner",
                risk: "critical",
                summary:
                    "Обнаружены гонки данных между job queue и retry manager; требуется " +
                    "отдельный lock mechanism.",
            },
            {
                area: "Persistence",
                risk: "high",
                summary:
                    "Точки записи в Redis не идемпотентны; " +
                    "возможны дублирующиеся задачи.",
            },
            {
                area: "Monitoring",
                risk: "low",
                summary: "Метрики в хорошем состоянии, alert policy покрывает " +
                    "SLO на 95p latency.",
            },
        ],
        branch: "release",
        filesScanned: 910,
        healthScore: 61,
        id: "backend-core/payment-worker",
        keyMetrics: [
            {
                caption: "Кол-во фоновый задач, упавших в очередь",
                id: "failed-jobs",
                label: "Failed jobs",
                trendDirection: "up",
                trendLabel: "+12%",
                value: "9",
            },
            {
                caption: "Средняя задержка worker response",
                id: "worker-latency",
                label: "Worker latency",
                trendDirection: "down",
                trendLabel: "-8%",
                value: "1.8s",
            },
            {
                caption: "Параллельные воркеры",
                id: "active-workers",
                label: "Active workers",
                trendDirection: "neutral",
                trendLabel: "8",
                value: "8",
            },
            {
                caption: "Нагрузочный стресс при ночных пайплайнах",
                id: "stress-events",
                label: "Stress events",
                trendDirection: "up",
                trendLabel: "+2",
                value: "7",
            },
        ],
        lastScanAt: "2026-01-01T07:50:00Z",
        name: "payment-worker",
        owner: "backend-core",
        techStack: [
            {
                name: "NestJS",
                note: "Worker handlers и lifecycle hooks",
                version: "10.0",
            },
            {
                name: "Redis",
                note: "Кэш и distributed locks",
                version: "7.2",
            },
            {
                name: "Docker",
                note: "Deployment и local environment",
                version: "24.0",
            },
        ],
        totalFindings: 11,
    },
]

const FALLBACK_ARCHITECTURE_SUMMARY: ReadonlyArray<IArchitectureSummary> = [
    {
        area: "Repository overview",
        risk: "critical",
        summary:
            "Информация по репозиторию отсутствует, требуется " +
            "повторно запустить скан.",
    },
]

function clampScore(rawScore: number): number {
    if (rawScore < 0) {
        return 0
    }

    if (rawScore > 100) {
        return 100
    }

    return rawScore
}

function mapRiskToChipColor(risk: TRepositoryRisk): THighlight {
    if (risk === "low") {
        return "success"
    }

    if (risk === "high") {
        return "warning"
    }

    return "danger"
}

function mapRiskToLabel(risk: TRepositoryRisk): string {
    if (risk === "low") {
        return "low"
    }

    if (risk === "high") {
        return "high"
    }

    return "critical"
}

function getRepositoryOverviewById(repositoryId: string): IRepositoryOverviewProfile | undefined {
    return REPOSITORY_OVERVIEWS.find((entry): boolean => entry.id === repositoryId)
}

function formatOverviewTimestamp(raw: string): string {
    const date = new Date(raw)
    if (Number.isNaN(date.getTime()) === true) {
        return "—"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        year: "numeric",
    })
}

function resolveHealthChipColor(score: number): THighlight {
    if (score >= 85) {
        return "success"
    }

    if (score >= 70) {
        return "warning"
    }

    return "danger"
}

function resolveHealthLabel(score: number): string {
    if (score >= 85) {
        return "Healthy"
    }

    if (score >= 70) {
        return "Degraded"
    }

    return "At risk"
}

function RepositoryHealthScore(props: { score: number }): ReactElement {
    const score = clampScore(props.score)
    const chipColor = resolveHealthChipColor(score)
    const progressColor =
        chipColor === "success"
            ? "bg-emerald-500"
            : chipColor === "warning"
              ? "bg-amber-500"
              : "bg-rose-500"

    return (
        <section
            aria-label="Repository health score"
            className="rounded-lg border border-slate-200 p-3"
        >
            <div className="flex items-end justify-between">
                <p className="text-sm font-semibold text-slate-700">Health score</p>
                <Chip color={chipColor} size="sm">
                    {resolveHealthLabel(score)}
                </Chip>
            </div>
            <div className="mt-3">
                <div className="mb-1 text-3xl font-semibold text-slate-900">{score}</div>
                <div
                    aria-label={`Health score ${score}`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={score}
                    className="h-2.5 w-full rounded-full bg-slate-200"
                    role="meter"
                >
                    <span
                        className={`block h-2.5 rounded-full ${progressColor}`}
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>
        </section>
    )
}

function TechnologyStackList(props: { stack: ReadonlyArray<ITechStackItem> }): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-slate-900">Tech stack</p>
            </CardHeader>
            <CardBody className="space-y-3">
                {props.stack.map((entry): ReactElement => (
                    <div className="space-y-0.5" key={`${entry.name}-${entry.version}`}>
                        <p className="text-sm font-semibold text-slate-900">
                            {entry.name} <span className="font-normal">{entry.version}</span>
                        </p>
                        <p className="text-sm text-slate-600">{entry.note}</p>
                    </div>
                ))}
            </CardBody>
        </Card>
    )
}

function ArchitectureSummaryList(props: {
    lines: ReadonlyArray<IArchitectureSummary>
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-slate-900">Architecture summary</p>
            </CardHeader>
            <CardBody className="space-y-3">
                {props.lines.map((line): ReactElement => {
                    const chipColor = mapRiskToChipColor(line.risk)
                    return (
                        <section
                            className="rounded-lg border border-slate-200 p-3"
                            key={line.area}
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <Chip color={chipColor} size="sm">
                                    {mapRiskToLabel(line.risk)}
                                </Chip>
                                <p className="text-sm font-semibold text-slate-900">
                                    {line.area}
                                </p>
                            </div>
                            <p className="text-sm text-slate-600">{line.summary}</p>
                        </section>
                    )
                })}
            </CardBody>
        </Card>
    )
}

function RepositoryOverviewNotFound(props: { repositoryId: string }): ReactElement {
    return (
        <section className="space-y-3">
            <Alert color="warning">Скан-результат репозитория не найден</Alert>
                <p className="text-sm text-slate-700">
                    Не найдено overview для ID:{" "}
                    <span className="font-semibold">{props.repositoryId}</span>.
                </p>
            <Link className="text-sm underline underline-offset-4" to="/repositories">
                К списку репозиториев
            </Link>
        </section>
    )
}

/**
 * Подробный dashboard по одному репозиторию после скана.
 *
 * @param props Идентификатор репозитория.
 * @returns Страница с метриками, архитектурным резюме и health score.
 */
export function RepositoryOverviewPage(props: TRepositoryOverviewProps): ReactElement {
    const repository = getRepositoryOverviewById(props.repositoryId)
    if (repository === undefined) {
        return <RepositoryOverviewNotFound repositoryId={props.repositoryId} />
    }

    const fallbackSummary =
        repository.architectureSummary.length === 0
            ? FALLBACK_ARCHITECTURE_SUMMARY
            : repository.architectureSummary

    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <p className="text-sm text-slate-500">Post-scan dashboard</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                    {repository.owner}/{repository.name}
                </h1>
                <p className="text-sm text-slate-600">
                    Отображение health score, архитектуры и ключевых метрик после последнего
                    сканирования.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Scan snapshot</p>
                </CardHeader>
                <CardBody className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm text-slate-700">Branch: {repository.branch}</p>
                        <p className="text-sm text-slate-700">
                            Last scan: {formatOverviewTimestamp(repository.lastScanAt)}
                        </p>
                        <p className="text-sm text-slate-700">
                            Scanned files: {repository.filesScanned}
                        </p>
                        <p className="text-sm text-slate-700">
                            Total findings: {repository.totalFindings}
                        </p>
                    </div>
                    <RepositoryHealthScore score={repository.healthScore} />
                </CardBody>
            </Card>

            <section aria-label="Key metrics">
                <MetricsGrid metrics={repository.keyMetrics} />
            </section>

            <div className="grid gap-4 md:grid-cols-2">
                <ArchitectureSummaryList lines={fallbackSummary} />
                <TechnologyStackList stack={repository.techStack} />
            </div>
        </section>
    )
}
