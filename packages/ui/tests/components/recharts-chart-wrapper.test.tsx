import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { RechartsChartWrapper } from "@/components/charts/recharts-chart-wrapper"
import { renderWithProviders } from "../utils/render"

describe("recharts chart wrapper", (): void => {
    it("рендерит loading состояние", (): void => {
        renderWithProviders(
            <RechartsChartWrapper isLoading={true} title="Chart">
                <p>chart content</p>
            </RechartsChartWrapper>,
        )

        expect(screen.queryByText("Loading chart...")).not.toBeNull()
        expect(screen.queryByText("chart content")).toBeNull()
    })

    it("when loadingText задан, then отображает кастомный текст загрузки", (): void => {
        renderWithProviders(
            <RechartsChartWrapper isLoading={true} loadingText="Загрузка графика..." title="Chart">
                <p>chart content</p>
            </RechartsChartWrapper>,
        )

        expect(screen.queryByText("Загрузка графика...")).not.toBeNull()
        expect(screen.queryByText("Loading chart...")).toBeNull()
    })

    it("рендерит контент после снятия loading", (): void => {
        renderWithProviders(
            <RechartsChartWrapper title="Chart">
                <p>chart content</p>
            </RechartsChartWrapper>,
        )

        expect(screen.queryByText("chart content")).not.toBeNull()
    })

    it("when data undefined, then children-функция получает пустые массивы", (): void => {
        let capturedRawData: ReadonlyArray<object> = []
        let capturedDisplayData: ReadonlyArray<object> = []
        let capturedIsAggregated = true
        let capturedAggregationFactor = -1

        renderWithProviders(
            <RechartsChartWrapper title="Chart">
                {({ rawData, displayData, isAggregated, aggregationFactor }) => {
                    capturedRawData = rawData
                    capturedDisplayData = displayData
                    capturedIsAggregated = isAggregated
                    capturedAggregationFactor = aggregationFactor
                    return <p>rendered</p>
                }}
            </RechartsChartWrapper>,
        )

        expect(capturedRawData).toEqual([])
        expect(capturedDisplayData).toEqual([])
        expect(capturedIsAggregated).toBe(false)
        expect(capturedAggregationFactor).toBe(1)
    })

    it("when scalePolicy enabled false, then данные не агрегируются", (): void => {
        const rows = Array.from({ length: 3000 }, (_: unknown, index: number) => ({
            value: index,
        }))

        let capturedIsAggregated = true
        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                scalePolicy={{ enabled: false }}
                title="Chart"
            >
                {({ isAggregated }) => {
                    capturedIsAggregated = isAggregated
                    return <p>content</p>
                }}
            </RechartsChartWrapper>,
        )

        expect(capturedIsAggregated).toBe(false)
    })

    it("сжимает большие наборы данных согласно policy", (): void => {
        const rows = Array.from({ length: 1000 }, (_: unknown, index: number) => ({
            label: `point-${index}`,
            value: index + 1,
        }))

        let rendered: number | null = null
        let isAggregated = false
        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                scalePolicy={{
                    hardThreshold: 100,
                    maxPoints: 20,
                    aggregatorKeys: ["value"],
                    aggregator: "sum",
                }}
            >
                {({ displayData, isAggregated: aggregated }) => {
                    rendered = displayData.length
                    isAggregated = aggregated
                    return <p>count {displayData.length}</p>
                }}
            </RechartsChartWrapper>,
        )

        expect(isAggregated).toBe(true)
        expect(rendered).not.toBeNull()
        expect(rendered).not.toBe(1000)
    })

    it("when aggregator mean, then вычисляет среднее вместо суммы", (): void => {
        const rows = Array.from({ length: 3000 }, (_: unknown, index: number) => ({
            label: `p-${index}`,
            value: 10,
        }))

        let capturedDisplayData: ReadonlyArray<{ label: string; value: number }> = []
        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                scalePolicy={{
                    hardThreshold: 100,
                    maxPoints: 50,
                    aggregatorKeys: ["value"],
                    aggregator: "mean",
                }}
            >
                {({ displayData }) => {
                    capturedDisplayData =
                        displayData as ReadonlyArray<{ label: string; value: number }>
                    return <p>ok</p>
                }}
            </RechartsChartWrapper>,
        )

        expect(capturedDisplayData.length).toBeGreaterThan(0)
        expect(capturedDisplayData.length).toBeLessThanOrEqual(50)
        const firstPoint = capturedDisplayData[0]
        expect(firstPoint).toBeDefined()
        expect(firstPoint?.value).toBe(10)
    })

    it("when aggregated, then показывает alert с информацией об агрегации и количеством точек", (): void => {
        const rows = Array.from({ length: 3000 }, (_: unknown, index: number) => ({
            value: index,
        }))

        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                scalePolicy={{ hardThreshold: 100, maxPoints: 50 }}
            >
                {({ displayData }) => <p>count {displayData.length}</p>}
            </RechartsChartWrapper>,
        )

        expect(screen.queryByText(/Data aggregated for interactive rendering/)).not.toBeNull()
        expect(screen.queryByText(/of 3000 points/)).not.toBeNull()
    })

    it("when onRequestServerAggregation задан, then показывает кнопку серверной агрегации", (): void => {
        const onRequestServerAggregation = vi.fn()
        const rows = Array.from({ length: 3000 }, (_: unknown, index: number) => ({
            value: index,
        }))

        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                onRequestServerAggregation={onRequestServerAggregation}
                scalePolicy={{ hardThreshold: 100, maxPoints: 50 }}
            >
                {({ displayData }) => <p>count {displayData.length}</p>}
            </RechartsChartWrapper>,
        )

        const serverAggButton = screen.getByRole("button", {
            name: "Request server aggregation",
        })
        fireEvent.click(serverAggButton)
        expect(onRequestServerAggregation).toHaveBeenCalledTimes(1)
    })

    it("when exportRawDataLabel задан, then показывает кастомный текст кнопки экспорта", (): void => {
        const rows = Array.from({ length: 3000 }, (_: unknown, index: number) => ({
            value: index,
        }))

        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                exportRawDataLabel="Скачать данные"
                scalePolicy={{ hardThreshold: 100, maxPoints: 50 }}
            >
                {({ displayData }) => <p>count {displayData.length}</p>}
            </RechartsChartWrapper>,
        )

        expect(screen.queryByText("Скачать данные")).not.toBeNull()
        expect(screen.queryByText("Export raw CSV")).toBeNull()
    })

    it("вызывает экспорт raw данных", (): void => {
        const rows = [
            { label: "first", value: 1 },
            { label: "second", value: 2 },
        ]
        const onExportRawData = vi.fn()

        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                isLoading={false}
                onExportRawData={onExportRawData}
                scalePolicy={{
                    hardThreshold: 1,
                    maxPoints: 1,
                }}
            >
                {({ displayData }) => <p>count {displayData.length}</p>}
            </RechartsChartWrapper>,
        )

        const exportButton = screen.getByRole("button", { name: "Export raw CSV" })
        fireEvent.click(exportButton)
        expect(onExportRawData).toHaveBeenCalledTimes(1)
        expect(onExportRawData).toHaveBeenCalledWith(rows)
    })

    it("when нет onExportRawData и данные пустые, then нажатие export ничего не делает", (): void => {
        const rows: Array<{ value: number }> = []

        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                scalePolicy={{ hardThreshold: 0, maxPoints: 0 }}
            >
                {() => <p>empty</p>}
            </RechartsChartWrapper>,
        )

        const exportButton = screen.queryByText("Export raw CSV")
        if (exportButton !== null) {
            fireEvent.click(exportButton)
        }
        expect(screen.queryByText("empty")).not.toBeNull()
    })

    it("when нет onExportRawData и есть данные, then скачивает CSV через downloadCsv", (): void => {
        const rows = Array.from({ length: 3000 }, (_: unknown, index: number) => ({
            label: `point-${index}`,
            value: index,
        }))

        const createObjectURLSpy = vi.fn().mockReturnValue("blob:test-url")
        const revokeObjectURLSpy = vi.fn()
        globalThis.URL.createObjectURL = createObjectURLSpy
        globalThis.URL.revokeObjectURL = revokeObjectURLSpy

        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                csvFileName="test-export.csv"
                csvColumns={["label", "value"]}
                scalePolicy={{ hardThreshold: 100, maxPoints: 50 }}
            >
                {({ displayData }) => <p>count {displayData.length}</p>}
            </RechartsChartWrapper>,
        )

        const exportButton = screen.getByRole("button", { name: "Export raw CSV" })
        fireEvent.click(exportButton)

        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    })

    it("when onExportRawData задан с агрегированными данными, then callback вызывается с raw данными", (): void => {
        const onExportRawData = vi.fn()
        const rows = Array.from({ length: 3000 }, (_: unknown, index: number) => ({
            value: index,
        }))

        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                onExportRawData={onExportRawData}
                scalePolicy={{ hardThreshold: 100, maxPoints: 50 }}
            >
                {({ displayData }) => <p>count {displayData.length}</p>}
            </RechartsChartWrapper>,
        )

        const exportButton = screen.getByRole("button", { name: "Export raw CSV" })
        fireEvent.click(exportButton)
        expect(onExportRawData).toHaveBeenCalledWith(rows)
    })

    it("when данные ниже hardThreshold, then агрегация не применяется", (): void => {
        const rows = Array.from({ length: 50 }, (_: unknown, index: number) => ({
            value: index,
        }))

        let capturedIsAggregated = true
        let capturedLength = 0
        renderWithProviders(
            <RechartsChartWrapper
                data={rows}
                title="Chart"
                scalePolicy={{ hardThreshold: 2000, maxPoints: 500 }}
            >
                {({ displayData, isAggregated }) => {
                    capturedIsAggregated = isAggregated
                    capturedLength = displayData.length
                    return <p>ok</p>
                }}
            </RechartsChartWrapper>,
        )

        expect(capturedIsAggregated).toBe(false)
        expect(capturedLength).toBe(50)
    })
})
