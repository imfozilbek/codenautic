import { describe, expect, it, vi } from "vitest"
import type { Metric, MetricType } from "web-vitals"

import {
    createWebVitalReporter,
    createWebVitalTransactionEvent,
    initializeWebVitalsMonitoring,
    resetWebVitalsMonitoringStateForTests,
    type IWebVitalsMonitoringDependencies,
} from "@/lib/monitoring/web-vitals"

/**
 * Создаёт минимальный metric объект для тестов web-vitals.
 *
 * @param name Имя метрики.
 * @param overrides Частичное переопределение полей.
 * @returns Metric-объект для отчёта.
 */
function createMetric(name: Metric["name"], overrides: Partial<Metric> = {}): MetricType {
    return {
        name,
        value: 123.45,
        rating: "good",
        delta: 1.1,
        id: `${name}-id-1`,
        navigationType: "navigate",
        entries: [],
        ...overrides,
    } as MetricType
}

/**
 * Создаёт dependency mocks для инициализации Web Vitals monitoring.
 *
 * @returns Набор register/capture mock-функций.
 */
function createMonitoringDependenciesMocks(): {
    readonly dependencies: IWebVitalsMonitoringDependencies
    readonly onCLS: ReturnType<typeof vi.fn>
    readonly onINP: ReturnType<typeof vi.fn>
    readonly onLCP: ReturnType<typeof vi.fn>
    readonly captureEvent: ReturnType<typeof vi.fn>
} {
    const onCLS = vi.fn()
    const onINP = vi.fn()
    const onLCP = vi.fn()
    const captureEvent = vi.fn(() => "event-id")

    return {
        dependencies: {
            onCLS,
            onINP,
            onLCP,
            captureEvent,
        },
        onCLS,
        onINP,
        onLCP,
        captureEvent,
    }
}

interface IReadonlyWebVitalMeasurement {
    readonly value: number
    readonly unit: string
}

interface IReadonlyWebVitalTransactionPayload {
    readonly type: string
    readonly transaction: string
    readonly measurements: Record<string, IReadonlyWebVitalMeasurement>
}

/**
 * Возвращает зарегистрированный reporter callback из mock register-функции.
 *
 * @param registerListenerMock Mock функции регистрации (`onCLS/onINP/onLCP`).
 * @param listenerName Имя listener для сообщения об ошибке.
 * @returns Reporter callback.
 */
function getRegisteredReporter(
    registerListenerMock: ReturnType<typeof vi.fn>,
    listenerName: string,
): (metric: MetricType) => void {
    const reporterCandidate = registerListenerMock.mock.calls[0]?.[0] as unknown
    if (typeof reporterCandidate !== "function") {
        throw new Error(`Ожидался зарегистрированный reporter для ${listenerName}`)
    }
    return reporterCandidate as (metric: MetricType) => void
}

/**
 * Возвращает отправленный payload из mock `captureEvent`.
 *
 * @param captureEventMock Mock функции отправки событий.
 * @param callIndex Индекс вызова captureEvent.
 * @returns Transaction payload.
 */
function getCapturedPayload(
    captureEventMock: ReturnType<typeof vi.fn>,
    callIndex: number,
): IReadonlyWebVitalTransactionPayload {
    const payload = captureEventMock.mock.calls[callIndex]?.[0] as
        | IReadonlyWebVitalTransactionPayload
        | undefined
    if (payload === undefined) {
        throw new Error(`Ожидался capture payload с индексом ${callIndex}`)
    }
    return payload
}

/**
 * Возвращает measurement по ключу или бросает ошибку, если ключ отсутствует.
 *
 * @param payload Transaction payload.
 * @param measurementName Ключ measurement (`cls`, `inp`, `lcp`).
 * @returns Measurement значение.
 */
function getMeasurement(
    payload: IReadonlyWebVitalTransactionPayload,
    measurementName: "cls" | "inp" | "lcp",
): IReadonlyWebVitalMeasurement {
    const measurement = payload.measurements[measurementName]
    if (measurement === undefined) {
        throw new Error(`Ожидалась measurement ${measurementName}`)
    }
    return measurement
}

describe("web vitals monitoring", (): void => {
    it("не инициализирует listeners при disabled режиме", (): void => {
        resetWebVitalsMonitoringStateForTests()

        const { dependencies, onCLS, onINP, onLCP } = createMonitoringDependenciesMocks()

        const initialized = initializeWebVitalsMonitoring(
            {
                enabled: false,
            },
            dependencies,
        )

        expect(initialized).toBe(false)
        expect(onCLS).not.toHaveBeenCalled()
        expect(onINP).not.toHaveBeenCalled()
        expect(onLCP).not.toHaveBeenCalled()
    })

    it("инициализирует listeners один раз и блокирует повторную регистрацию", (): void => {
        resetWebVitalsMonitoringStateForTests()

        const { dependencies, onCLS, onINP, onLCP } = createMonitoringDependenciesMocks()

        const firstInit = initializeWebVitalsMonitoring(
            {
                enabled: true,
            },
            dependencies,
        )
        const secondInit = initializeWebVitalsMonitoring(
            {
                enabled: true,
            },
            dependencies,
        )

        expect(firstInit).toBe(true)
        expect(secondInit).toBe(false)

        expect(onCLS).toHaveBeenCalledTimes(1)
        expect(onINP).toHaveBeenCalledTimes(1)
        expect(onLCP).toHaveBeenCalledTimes(1)
        expect(onCLS).toHaveBeenCalledWith(expect.any(Function), {
            reportAllChanges: false,
        })
    })

    it("отправляет LCP/INP/CLS как Sentry transaction events", (): void => {
        resetWebVitalsMonitoringStateForTests()

        const { dependencies, onCLS, onINP, onLCP, captureEvent } =
            createMonitoringDependenciesMocks()

        initializeWebVitalsMonitoring(
            {
                enabled: true,
            },
            dependencies,
        )

        const clsReporter = getRegisteredReporter(onCLS, "onCLS")
        const inpReporter = getRegisteredReporter(onINP, "onINP")
        const lcpReporter = getRegisteredReporter(onLCP, "onLCP")

        clsReporter(createMetric("CLS", { id: "cls-1", value: 0.07 }))
        inpReporter(createMetric("INP", { id: "inp-1", value: 185 }))
        lcpReporter(createMetric("LCP", { id: "lcp-1", value: 2200 }))

        expect(captureEvent).toHaveBeenCalledTimes(3)

        const firstCallPayload = getCapturedPayload(captureEvent, 0)
        const secondCallPayload = getCapturedPayload(captureEvent, 1)
        const thirdCallPayload = getCapturedPayload(captureEvent, 2)

        expect(firstCallPayload.type).toBe("transaction")
        expect(firstCallPayload.transaction).toBe("web-vital.cls")
        const clsMeasurement = getMeasurement(firstCallPayload, "cls")
        const inpMeasurement = getMeasurement(secondCallPayload, "inp")
        const lcpMeasurement = getMeasurement(thirdCallPayload, "lcp")

        expect(clsMeasurement.value).toBe(0.07)
        expect(clsMeasurement.unit).toBe("")
        expect(inpMeasurement.unit).toBe("millisecond")
        expect(lcpMeasurement.unit).toBe("millisecond")
    })

    it("не отправляет дубликаты одной и той же метрики", (): void => {
        const seenMetricKeys = new Set<string>()
        const captureEvent = vi.fn(() => "event-id")
        const reportWebVital = createWebVitalReporter({
            captureEvent,
            seenMetricKeys,
        })

        reportWebVital(createMetric("LCP", { id: "dup-id" }))
        reportWebVital(createMetric("LCP", { id: "dup-id", value: 1500 }))

        expect(captureEvent).toHaveBeenCalledTimes(1)
        expect(seenMetricKeys.has("LCP:dup-id")).toBe(true)
    })

    it("формирует transaction payload с trace/context/tags/measurements", (): void => {
        const payload = createWebVitalTransactionEvent(
            createMetric("INP", {
                id: "inp-42",
                navigationType: "reload",
                rating: "needs-improvement",
                value: 210,
                delta: 11,
            }),
        )

        const traceContext = payload.contexts?.trace as {
            readonly trace_id: string
            readonly span_id: string
            readonly op: string
        }
        const tags = payload.tags as Record<string, string>
        const measurements = payload.measurements as Record<
            string,
            {
                readonly value: number
                readonly unit: string
            }
        >
        const extra = payload.extra as Record<string, unknown>

        expect(payload.type).toBe("transaction")
        expect(payload.transaction).toBe("web-vital.inp")
        expect(traceContext.trace_id.length).toBe(32)
        expect(traceContext.span_id.length).toBe(16)
        expect(traceContext.op).toBe("ui.web-vital")
        expect(tags["web_vital.name"]).toBe("INP")
        expect(tags["web_vital.rating"]).toBe("needs-improvement")
        expect(tags["web_vital.navigation_type"]).toBe("reload")
        const inpMeasurement = measurements.inp
        if (inpMeasurement === undefined) {
            throw new Error("Ожидалась INP measurement")
        }
        expect(inpMeasurement.value).toBe(210)
        expect(inpMeasurement.unit).toBe("millisecond")
        expect(extra["web_vital.id"]).toBe("inp-42")
        expect(extra["web_vital.delta"]).toBe(11)
    })

    it("генерирует deterministic trace ids даже при пустом metric id", (): void => {
        const payload = createWebVitalTransactionEvent(
            createMetric("CLS", {
                id: "",
            }),
        )

        const traceContext = payload.contexts?.trace as {
            readonly trace_id: string
            readonly span_id: string
        }

        expect(traceContext.trace_id).toBe("00000000000000000000000000000000")
        expect(traceContext.span_id.length).toBe(16)
    })
})
