import * as Sentry from "@sentry/react"
import { onCLS, onINP, onLCP, type Metric, type ReportCallback } from "web-vitals"

/**
 * Core Web Vitals, отправляемые в мониторинг.
 */
export type TCoreWebVitalName = "CLS" | "INP" | "LCP"

/**
 * Набор зависимостей для регистрации Web Vitals listeners.
 */
export interface IWebVitalsMonitoringDependencies {
    readonly onCLS: IRegisterWebVitalListener
    readonly onINP: IRegisterWebVitalListener
    readonly onLCP: IRegisterWebVitalListener
    readonly captureEvent: (event: Sentry.Event) => string
}

/**
 * Опции инициализации мониторинга Web Vitals.
 */
export interface IWebVitalsMonitoringOptions {
    readonly enabled: boolean
}

/**
 * Зависимость регистрации listener для конкретной метрики.
 */
export type IRegisterWebVitalListener = (
    report: ReportCallback,
    options?: IReadonlyWebVitalListenerOptions,
) => void

/**
 * Опции регистрации Web Vitals listener.
 */
export interface IReadonlyWebVitalListenerOptions {
    readonly reportAllChanges?: boolean
}

/**
 * Зависимости репортера метрик в Sentry.
 */
export interface IWebVitalReporterDependencies {
    readonly captureEvent: (event: Sentry.Event) => string
    readonly seenMetricKeys: Set<string>
}

const FINAL_WEB_VITALS_OPTIONS: IReadonlyWebVitalListenerOptions = {
    reportAllChanges: false,
}

let isWebVitalsMonitoringInitialized = false

/**
 * Инициализирует Web Vitals monitoring с отправкой в Sentry Performance.
 *
 * @param options Опции запуска мониторинга.
 * @param dependencies Зависимости регистрации и отправки событий.
 * @returns true, если listeners были зарегистрированы.
 */
export function initializeWebVitalsMonitoring(
    options: IWebVitalsMonitoringOptions,
    dependencies: Partial<IWebVitalsMonitoringDependencies> = {},
): boolean {
    if (options.enabled !== true) {
        return false
    }

    if (isWebVitalsMonitoringInitialized === true) {
        return false
    }

    const onCLSListener = dependencies.onCLS ?? onCLS
    const onINPListener = dependencies.onINP ?? onINP
    const onLCPListener = dependencies.onLCP ?? onLCP
    const captureEvent = dependencies.captureEvent ?? Sentry.captureEvent

    const reportWebVital = createWebVitalReporter({
        captureEvent,
        seenMetricKeys: new Set<string>(),
    })

    onCLSListener(reportWebVital, FINAL_WEB_VITALS_OPTIONS)
    onINPListener(reportWebVital, FINAL_WEB_VITALS_OPTIONS)
    onLCPListener(reportWebVital, FINAL_WEB_VITALS_OPTIONS)

    isWebVitalsMonitoringInitialized = true
    return true
}

/**
 * Создаёт callback-репортёр для отправки метрик в Sentry.
 *
 * @param dependencies Зависимости репортёра.
 * @returns Callback для `web-vitals` listeners.
 */
export function createWebVitalReporter(
    dependencies: IWebVitalReporterDependencies,
): ReportCallback {
    return (metric: Metric): void => {
        const metricKey = `${metric.name}:${metric.id}`
        if (dependencies.seenMetricKeys.has(metricKey)) {
            return
        }

        dependencies.seenMetricKeys.add(metricKey)
        dependencies.captureEvent(createWebVitalTransactionEvent(metric))
    }
}

/**
 * Формирует transaction event для Sentry Performance по метрике Web Vitals.
 *
 * @param metric Метрика Web Vitals.
 * @returns Sentry transaction event с measurement.
 */
export function createWebVitalTransactionEvent(metric: Metric): Sentry.Event {
    const measurementName = metric.name.toLowerCase()
    const timestampSeconds = Date.now() / 1_000

    return {
        type: "transaction",
        transaction: `web-vital.${measurementName}`,
        start_timestamp: timestampSeconds,
        timestamp: timestampSeconds + 0.001,
        contexts: {
            trace: {
                trace_id: createHexFingerprint(metric.id, 32),
                span_id: createHexFingerprint(`${metric.name}:${metric.id}`, 16),
                op: "ui.web-vital",
            },
        },
        tags: {
            "web_vital.name": metric.name,
            "web_vital.rating": metric.rating,
            "web_vital.navigation_type": metric.navigationType,
        },
        measurements: {
            [measurementName]: {
                value: metric.value,
                unit: resolveMeasurementUnit(metric.name as TCoreWebVitalName),
            },
        },
        extra: {
            "web_vital.id": metric.id,
            "web_vital.delta": metric.delta,
        },
        spans: [],
    }
}

/**
 * Сбрасывает внутренний флаг инициализации (используется только в тестах).
 */
export function resetWebVitalsMonitoringStateForTests(): void {
    isWebVitalsMonitoringInitialized = false
}

/**
 * Возвращает measurement unit для конкретной метрики.
 *
 * @param metricName Имя Core Web Vital метрики.
 * @returns Строковый unit для Sentry measurement.
 */
function resolveMeasurementUnit(metricName: TCoreWebVitalName): string {
    if (metricName === "CLS") {
        return ""
    }

    return "millisecond"
}

/**
 * Создаёт детерминированный hex fingerprint фиксированной длины.
 *
 * @param seed Исходная строка.
 * @param length Требуемая длина hex-строки.
 * @returns Hex fingerprint.
 */
function createHexFingerprint(seed: string, length: number): string {
    const normalizedSeed = seed.length > 0 ? seed : "0"

    let output = ""
    let index = 0

    while (output.length < length) {
        const charCode = normalizedSeed.charCodeAt(index % normalizedSeed.length)
        output += (charCode % 16).toString(16)
        index += 1
    }

    return output.slice(0, length)
}
