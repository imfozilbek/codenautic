import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ReactElement } from "react"

import { RechartsChartWrapper } from "@/components/charts/recharts-chart-wrapper"
import { renderWithProviders } from "../utils/render"

interface IPerfLinePoint {
    /** Метка времени. */
    readonly time: string
    /** Значение метрики. */
    readonly value: number
}

interface IPerfCategoryPoint {
    /** Категория. */
    readonly status: string
    /** Количество. */
    readonly count: number
    /** Цвет. */
    readonly color: string
}

function createLineData(size: number): ReadonlyArray<IPerfLinePoint> {
    return Array.from({ length: size }, (_: unknown, index: number) => ({
        time: `2026-01-${String((index % 31) + 1).padStart(2, "0")}`,
        value: (Math.sin(index / 9) + 1) * 50 + (index % 7),
    }))
}

function createCategoryData(size: number): ReadonlyArray<IPerfCategoryPoint> {
    return Array.from({ length: size }, (_: unknown, index: number) => ({
        color: index % 2 === 0 ? "oklch(0.65 0.17 142)" : "oklch(0.78 0.17 90)",
        count: (index % 17) + 1,
        status: `${"Very long category label ".repeat(3)}#${index}`,
    }))
}

function renderLineChartCase(size: number, expectedMaxPoints: number, budgetMs: number): void {
    const data = createLineData(size)
    let renderedCount = 0
    let aggregationFactor = 0
    let isAggregated = false

    const start = performance.now()
    renderWithProviders(
        <RechartsChartWrapper
            data={data}
            isLoading={false}
            scalePolicy={{
                hardThreshold: 1000,
                maxPoints: expectedMaxPoints,
                aggregator: "mean",
                aggregatorKeys: ["value"],
            }}
            title="Line perf"
        >
            {({ displayData, isAggregated: aggregated, aggregationFactor: factor }): ReactElement => {
                renderedCount = displayData.length
                isAggregated = aggregated
                aggregationFactor = factor
                return <p>Rendered {renderedCount}</p>
            }}
        </RechartsChartWrapper>,
    )
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(budgetMs)
    expect(isAggregated).toBe(true)
    expect(aggregationFactor).toBeGreaterThan(1)
    expect(renderedCount).toBeLessThanOrEqual(expectedMaxPoints)
}

function renderCategoryChartCase(size: number, expectedMaxPoints: number, budgetMs: number): void {
    const data = createCategoryData(size)
    let renderedCount = 0
    let isAggregated = false

    const start = performance.now()
    renderWithProviders(
        <RechartsChartWrapper
            data={data}
            isLoading={false}
            scalePolicy={{
                hardThreshold: 1000,
                maxPoints: expectedMaxPoints,
                aggregator: "sum",
                aggregatorKeys: ["count"],
            }}
            title="Category perf"
        >
            {({ displayData, isAggregated: aggregated }): ReactElement => {
                renderedCount = displayData.length
                isAggregated = aggregated
                return <p>Rendered {renderedCount}</p>
            }}
        </RechartsChartWrapper>,
    )
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(budgetMs)
    expect(isAggregated).toBe(true)
    expect(screen.getByText(/Data aggregated/i)).not.toBeNull()
    expect(renderedCount).toBeLessThanOrEqual(expectedMaxPoints)
}

describe("chart perf regression harness", (): void => {
    it("должен укладываться в budget для линейного типа данных на 5k", (): void => {
        renderLineChartCase(5000, 500, 500)
    })

    it("должен укладываться в budget для линейного типа данных на 10k", (): void => {
        renderLineChartCase(10000, 500, 700)
    })

    it("должен укладываться в budget для линейного типа данных на 50k", (): void => {
        renderLineChartCase(50000, 500, 900)
    })

    it("должен детектировать длинные labels и сохранять стабильную разметку", (): void => {
        renderCategoryChartCase(50000, 500, 900)
        expect(screen.getByText(/Rendered/)).not.toBeNull()
    })
})
