import type { IFileDependencyNode } from "@/components/dependency-graphs/file-dependency-graph"

import {
    DEFAULT_RESCAN_VALUES,
    FILE_ISSUE_HEATMAP_COUNTS,
    RESCAN_FREQUENCY_OPTIONS,
    WEEKDAYS_TO_LABELS,
} from "./repository-overview-constants"
import type {
    IRescanScheduleValues,
    THighlight,
    TRepositoryRisk,
    TRescanScheduleMode,
} from "./repository-overview-types"

/**
 * Ограничивает score в диапазоне 0..100.
 *
 * @param rawScore Исходное числовое значение.
 * @returns Значение в пределах [0, 100].
 */
export function clampScore(rawScore: number): number {
    if (rawScore < 0) {
        return 0
    }

    if (rawScore > 100) {
        return 100
    }

    return rawScore
}

/**
 * Маппит уровень риска в цвет Chip-компонента.
 *
 * @param risk Уровень риска.
 * @returns Цветовая подсветка.
 */
export function mapRiskToChipColor(risk: TRepositoryRisk): THighlight {
    if (risk === "low") {
        return "success"
    }

    if (risk === "high") {
        return "warning"
    }

    return "danger"
}

/**
 * Маппит уровень риска в текстовую метку.
 *
 * @param risk Уровень риска.
 * @returns Человекочитаемая метка.
 */
export function mapRiskToLabel(risk: TRepositoryRisk): string {
    if (risk === "low") {
        return "low"
    }

    if (risk === "high") {
        return "high"
    }

    return "critical"
}

/**
 * Преобразует необработанное значение количества issues в безопасное число.
 *
 * @param value Возможное числовое значение.
 * @returns Целое число >= 0.
 */
export function resolveIssueCountValue(value?: number): number {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return 0
    }

    return Math.floor(value)
}

/**
 * Дополняет файлы зависимостей данными о количестве issues для CodeCity treemap.
 *
 * @param files Массив файловых узлов.
 * @returns Массив узлов с добавленным полем issueCount.
 */
export function resolveCodeCityTreemapFiles(
    files: ReadonlyArray<IFileDependencyNode>,
): ReadonlyArray<IFileDependencyNode & { issueCount: number }> {
    return files.map((file): IFileDependencyNode & { issueCount: number } => ({
        ...file,
        issueCount: resolveIssueCountValue(FILE_ISSUE_HEATMAP_COUNTS[file.id]),
    }))
}

/**
 * Форматирует ISO-timestamp в локализованную строку.
 *
 * @param raw ISO-строка даты.
 * @returns Отформатированная дата или дефис при невалидном значении.
 */
export function formatOverviewTimestamp(raw: string): string {
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

/**
 * Создаёт массив чисел от 0 до limit-1.
 *
 * @param limit Верхняя граница (не включительно).
 * @returns Массив последовательных чисел.
 */
export function createRangeValues(limit: number): ReadonlyArray<number> {
    const values: number[] = []
    for (let index = 0; index < limit; index += 1) {
        values.push(index)
    }
    return values
}

/**
 * Дополняет числовое значение до двух символов ведущим нулём.
 *
 * @param value Число для форматирования.
 * @returns Строка из двух символов.
 */
export function padCronValue(value: number): string {
    return String(value).padStart(2, "0")
}

/**
 * Парсит строковое значение cron-поля в число с валидацией диапазона.
 *
 * @param value Строковое значение.
 * @param min Минимально допустимое значение.
 * @param max Максимально допустимое значение.
 * @param fallback Значение по умолчанию при ошибке парсинга.
 * @returns Распарсенное число или fallback.
 */
export function parseCronNumber(value: string, min: number, max: number, fallback: number): number {
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed) === true || parsed < min || parsed > max) {
        return fallback
    }
    return parsed
}

/**
 * Проверяет, является ли cron-выражение ручным режимом.
 *
 * @param cronExpression Cron-строка.
 * @returns true если это "manual".
 */
export function isCronManual(cronExpression: string): boolean {
    return cronExpression.trim() === "manual"
}

/**
 * Парсит cron-выражение в структуру значений расписания.
 *
 * @param cronExpression Cron-строка.
 * @returns Структура значений расписания.
 */
export function createRescanScheduleFromCron(cronExpression: string): IRescanScheduleValues {
    if (isCronManual(cronExpression)) {
        return DEFAULT_RESCAN_VALUES
    }

    const values = cronExpression
        .trim()
        .split(/\s+/)
        .filter((value): boolean => value.length > 0)
    if (values.length !== 5) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            mode: "custom",
            customCron: cronExpression.trim(),
        }
    }

    const minuteToken = values[0] ?? "0"
    const hourToken = values[1] ?? "0"
    const weekDayToken = values[4] ?? "0"
    const minute = parseCronNumber(minuteToken, 0, 59, 0)
    const hour = parseCronNumber(hourToken, 0, 23, 0)
    const weekDay = parseCronNumber(weekDayToken, 0, 6, 0)
    const isHourPattern =
        values[1] === "*" && values[2] === "*" && values[3] === "*" && values[4] === "*"

    if (isHourPattern === true) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            customCron: "",
            mode: "hourly",
            minute,
        }
    }

    const isDailyPattern = values[2] === "*" && values[3] === "*" && values[4] === "*"
    if (isDailyPattern === true) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            customCron: "",
            hour,
            mode: "daily",
            minute,
        }
    }

    const isWeeklyPattern = values[2] === "*" && values[3] === "*"
    if (isWeeklyPattern === true) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            customCron: "",
            hour,
            mode: "weekly",
            minute,
            weekday: weekDay,
        }
    }

    return {
        ...DEFAULT_RESCAN_VALUES,
        customCron: cronExpression.trim(),
        mode: "custom",
    }
}

/**
 * Конвертирует значения расписания в cron-выражение.
 *
 * @param values Структура расписания.
 * @returns Cron-строка.
 */
export function createCronExpressionFromReschedule(values: IRescanScheduleValues): string {
    if (values.mode === "manual") {
        return "manual"
    }

    if (values.mode === "hourly") {
        return `${values.minute} * * * *`
    }

    if (values.mode === "daily") {
        return `${values.minute} ${values.hour} * * *`
    }

    if (values.mode === "weekly") {
        return `${values.minute} ${values.hour} * * ${values.weekday}`
    }

    if (values.customCron.trim().length === 0) {
        return "manual"
    }

    return values.customCron.trim().replace(/\s+/g, " ")
}

/**
 * Формирует человекочитаемое описание расписания.
 *
 * @param values Структура расписания.
 * @returns Описание на русском языке.
 */
export function getRescanSummaryLabel(values: IRescanScheduleValues): string {
    if (values.mode === "manual") {
        return "По требованию"
    }

    if (values.mode === "hourly") {
        return `Ежечасно в :${padCronValue(values.minute)}`
    }

    if (values.mode === "daily") {
        return `Ежедневно в ${padCronValue(values.hour)}:${padCronValue(values.minute)}`
    }

    if (values.mode === "weekly") {
        const weekdayLabel = WEEKDAYS_TO_LABELS[values.weekday]
        return `Еженедельно, ${weekdayLabel} в ${padCronValue(values.hour)}:${padCronValue(values.minute)}`
    }

    if (values.customCron.trim().length === 0) {
        return "Кастомный cron не задан"
    }

    return `Кастомный cron: ${values.customCron.trim()}`
}

/**
 * Type guard для режима расписания рескана.
 *
 * @param value Строковое значение для проверки.
 * @returns true если значение является допустимым режимом.
 */
export function isRescanScheduleMode(value: string): value is TRescanScheduleMode {
    return RESCAN_FREQUENCY_OPTIONS.some((entry): boolean => entry.value === value)
}

/**
 * Маппит health score в цвет Chip-компонента.
 *
 * @param score Числовое значение health score.
 * @returns Цветовая подсветка.
 */
export function resolveHealthChipColor(score: number): THighlight {
    if (score >= 85) {
        return "success"
    }

    if (score >= 70) {
        return "warning"
    }

    return "danger"
}

/**
 * Маппит health score в текстовую метку статуса.
 *
 * @param score Числовое значение health score.
 * @returns Метка статуса.
 */
export function resolveHealthLabel(score: number): string {
    if (score >= 85) {
        return "Healthy"
    }

    if (score >= 70) {
        return "Degraded"
    }

    return "At risk"
}
