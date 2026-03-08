import { type ReactElement, type ReactNode, useMemo } from "react"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"

type TChartPoint = object
type TChartKey<TPoint extends TChartPoint> = Extract<keyof TPoint, string>

type TRechartsScaleAggregator = "sum" | "mean"

type TRechartsChildrenRenderer<TPoint extends TChartPoint> =
    | ReactNode
    | ((props: IRechartsChartRenderContext<TPoint>) => ReactNode)

interface IRechartsChartScalePolicy<TPoint extends TChartPoint> {
    /** Включена ли агрегация. */
    readonly enabled?: boolean
    /** Порог для включения downsampling (>= threshold начинает сжиматься). */
    readonly hardThreshold?: number
    /** Максимум точек после агрегации. */
    readonly maxPoints?: number
    /** Какие поля учитывать при агрегации. */
    readonly aggregatorKeys?: ReadonlyArray<TChartKey<TPoint>>
    /** Метод агрегирования. */
    readonly aggregator?: TRechartsScaleAggregator
}

interface IRechartsChartRenderContext<TPoint extends TChartPoint> {
    /** Исходные точки, до downsampling/агрегации. */
    readonly rawData: ReadonlyArray<TPoint>
    /** Точки, которые реально рендерятся. */
    readonly displayData: ReadonlyArray<TPoint>
    /** Включена ли агрегация. */
    readonly isAggregated: boolean
    /** Во сколько раз уменьшен объём данных. */
    readonly aggregationFactor: number
}

interface IRechartsChartScaleResult<TPoint extends TChartPoint> {
    /** Данные, которые рендерит график. */
    readonly data: ReadonlyArray<TPoint>
    /** Включена ли агрегация. */
    readonly isAggregated: boolean
    /** Во сколько раз уменьшен объём данных. */
    readonly aggregationFactor: number
}

/**
 * Пропсы generic обертки для Recharts-виджетов.
 *
 * @template TPoint тип точки графика.
 */
export interface IRechartsChartWrapperProps<TPoint extends TChartPoint = object> {
    /** Заголовок виджета. */
    readonly title: string
    /** Исходные точки для графика. */
    readonly data?: ReadonlyArray<TPoint>
    /** Политика downsampling/scale. */
    readonly scalePolicy?: IRechartsChartScalePolicy<TPoint>
    /** Состояние ожидания данных/инициализации. */
    readonly isLoading?: boolean
    /** Текст-заглушка во время загрузки. */
    readonly loadingText?: string
    /** Название CSV-файла при скачивании raw данных. */
    readonly csvFileName?: string
    /** Поля для формирования CSV. */
    readonly csvColumns?: ReadonlyArray<TChartKey<TPoint>>
    /** Кастомный экспорт raw данных. */
    readonly onExportRawData?: (rawData: ReadonlyArray<TPoint>) => void
    /** Текст кнопки экспорта. */
    readonly exportRawDataLabel?: string
    /** Кнопка запроса серверной агрегации (для больших диапазонов). */
    readonly onRequestServerAggregation?: () => void
    /** Графический контент. */
    readonly children: TRechartsChildrenRenderer<TPoint>
}

function isValidNumeric(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value)
}

function detectNumericKeys<TPoint extends TChartPoint>(
    point: TPoint,
): ReadonlyArray<TChartKey<TPoint>> {
    return Object.keys(point).filter((rawKey): rawKey is TChartKey<TPoint> => {
        const pointRecord = point as Record<string, unknown>
        const value = pointRecord[rawKey]
        return isValidNumeric(value)
    })
}

function scaleChartData<TPoint extends TChartPoint>(
    data: ReadonlyArray<TPoint>,
    scalePolicy: IRechartsChartScalePolicy<TPoint> | undefined,
): IRechartsChartScaleResult<TPoint> {
    const policy = scalePolicy ?? {}
    const isEnabled = policy.enabled !== false
    const hardThreshold = policy.hardThreshold ?? 2000
    const maxPoints = policy.maxPoints ?? 500

    if (isEnabled === false || data.length <= hardThreshold || data.length <= maxPoints) {
        return {
            data,
            isAggregated: false,
            aggregationFactor: 1,
        }
    }

    const bucketSize = Math.ceil(data.length / maxPoints)
    if (bucketSize <= 1) {
        return {
            data,
            isAggregated: false,
            aggregationFactor: 1,
        }
    }

    const firstPoint = data[0]
    const defaultAggregatorKeys = firstPoint === undefined ? [] : detectNumericKeys(firstPoint)
    const aggregatorKeys = policy.aggregatorKeys ?? defaultAggregatorKeys
    const aggregator = policy.aggregator ?? "sum"

    const scaledData: TPoint[] = []
    for (let index = 0; index < data.length; index += bucketSize) {
        const segment = data.slice(index, index + bucketSize)
        const segmentLength = segment.length
        const aggregated = { ...segment[0] } as TPoint

        if (segmentLength > 1 && aggregatorKeys.length > 0) {
            for (const key of aggregatorKeys) {
                let total = 0
                let numericCount = 0

                for (const point of segment) {
                    const value = readPointValue(point, key)
                    if (isValidNumeric(value)) {
                        total += value
                        numericCount += 1
                    }
                }

                if (numericCount > 0) {
                    writePointValue(
                        aggregated,
                        key,
                        aggregator === "mean" ? total / segmentLength : total,
                    )
                }
            }
        }

        scaledData.push(aggregated)
    }

    return {
        data: scaledData,
        isAggregated: true,
        aggregationFactor: Math.ceil(data.length / scaledData.length),
    }
}

function convertToCsvCell(value: unknown): string {
    if (value === null || value === undefined) {
        return ""
    }

    if (typeof value === "string") {
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
            return `"${value.replaceAll('"', '""')}"`
        }

        return value
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value)
    }

    return JSON.stringify(value)
}

function convertToCsv<TPoint extends TChartPoint>(
    rawData: ReadonlyArray<TPoint>,
    csvColumns: ReadonlyArray<TChartKey<TPoint>> | undefined,
): string {
    if (rawData.length === 0) {
        return ""
    }

    const firstPoint = rawData[0]
    if (firstPoint === undefined) {
        return ""
    }

    const columns =
        csvColumns ?? (Object.keys(firstPoint) as unknown as ReadonlyArray<TChartKey<TPoint>>)
    const header = columns.map((column): string => String(column)).join(",")
    const rows = rawData.map((point) =>
        columns.map((column): string => convertToCsvCell(readPointValue(point, column))).join(","),
    )

    return `${header}\n${rows.join("\n")}`
}

function downloadCsv<TPoint extends TChartPoint>(
    rawData: ReadonlyArray<TPoint>,
    csvColumns: ReadonlyArray<TChartKey<TPoint>> | undefined,
    csvFileName: string | undefined,
): void {
    const payload = convertToCsv(rawData, csvColumns)
    const blob = new Blob([payload], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = csvFileName ?? "chart-raw-data.csv"
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Универсальная карточка для Recharts-компонентов.
 *
 * @param props Конфигурация.
 * @returns Карточный блок с состоянием loading и theme-friendly стилями.
 */
export function RechartsChartWrapper<TPoint extends TChartPoint>(
    props: IRechartsChartWrapperProps<TPoint>,
): ReactElement {
    const scaleResult = useMemo((): IRechartsChartScaleResult<TPoint> => {
        if (props.data === undefined) {
            return {
                data: [],
                isAggregated: false,
                aggregationFactor: 1,
            }
        }

        return scaleChartData(props.data, props.scalePolicy)
    }, [props.data, props.scalePolicy])

    const handleExportRawData = (): void => {
        if (props.onExportRawData === undefined) {
            if (props.data === undefined || props.data.length === 0) {
                return
            }

            downloadCsv(props.data, props.csvColumns, props.csvFileName)
            return
        }

        if (props.data !== undefined) {
            props.onExportRawData(props.data)
        }
    }

    const content = (() => {
        if (typeof props.children === "function") {
            return props.children({
                aggregationFactor: scaleResult.aggregationFactor,
                displayData: scaleResult.data,
                isAggregated: scaleResult.isAggregated,
                rawData: props.data ?? [],
            })
        }

        return props.children
    })()

    return (
        <Card>
            <CardHeader>
                <h3 className="text-base font-semibold text-foreground">{props.title}</h3>
            </CardHeader>
            <CardBody>
                {props.isLoading === true ? (
                    <p className="text-sm text-muted-foreground">
                        {props.loadingText ?? "Loading chart..."}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {scaleResult.isAggregated === true ? (
                            <Alert color="warning">
                                <div className="space-y-2">
                                    <p className="text-sm">
                                        Data aggregated for interactive rendering. Showing{" "}
                                        {scaleResult.data.length} of{" "}
                                        {props.data === undefined ? 0 : props.data.length} points.{" "}
                                        Aggregation factor: {scaleResult.aggregationFactor}x.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {props.onRequestServerAggregation === undefined ? null : (
                                            <Button
                                                color="warning"
                                                onPress={props.onRequestServerAggregation}
                                                size="sm"
                                                variant="flat"
                                            >
                                                Request server aggregation
                                            </Button>
                                        )}
                                        <Button
                                            onPress={handleExportRawData}
                                            size="sm"
                                            variant="light"
                                        >
                                            {props.exportRawDataLabel ?? "Export raw CSV"}
                                        </Button>
                                    </div>
                                </div>
                            </Alert>
                        ) : null}
                        {content}
                    </div>
                )}
            </CardBody>
        </Card>
    )
}

function readPointValue<TPoint extends TChartPoint>(
    point: TPoint,
    key: TChartKey<TPoint>,
): unknown {
    const pointRecord = point as Record<string, unknown>
    return pointRecord[key]
}

function writePointValue<TPoint extends TChartPoint>(
    point: TPoint,
    key: TChartKey<TPoint>,
    value: number,
): void {
    const pointRecord = point as Record<string, unknown>
    pointRecord[key] = value
}
