import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

const DEFAULT_HEIGHT = 260
const SVG_WIDTH = 360
const SVG_HEIGHT = 220
const PADDING_LEFT = 32
const PADDING_RIGHT = 20
const PADDING_TOP = 20
const PADDING_BOTTOM = 32

interface IScatterPoint {
    readonly churn: number
    readonly complexity: number
    readonly fileId: string
    readonly fileName: string
}

export interface IChurnComplexityScatterFileDescriptor {
    readonly id: string
    readonly path: string
    readonly churn?: number
    readonly complexity?: number
}

export interface IChurnComplexityScatterProps {
    readonly files: ReadonlyArray<IChurnComplexityScatterFileDescriptor>
    readonly selectedFileId?: string
    readonly onFileSelect?: (fileId: string) => void
    readonly title?: string
    readonly height?: number
}

function resolveFileName(path: string): string {
    const normalizedPath = path.trim().replaceAll("\\", "/")
    const separatorIndex = normalizedPath.lastIndexOf("/")

    if (separatorIndex === -1) {
        return normalizedPath
    }

    return normalizedPath.slice(separatorIndex + 1)
}

function resolveMetric(value: number | undefined): number | undefined {
    if (typeof value !== "number" || Number.isFinite(value) === false || value < 0) {
        return undefined
    }

    return value
}

function resolvePoints(
    files: ReadonlyArray<IChurnComplexityScatterFileDescriptor>,
): ReadonlyArray<IScatterPoint> {
    const points: IScatterPoint[] = []

    for (const file of files) {
        const churn = resolveMetric(file.churn)
        const complexity = resolveMetric(file.complexity)
        if (churn === undefined || complexity === undefined) {
            continue
        }

        points.push({
            churn,
            complexity,
            fileId: file.id,
            fileName: resolveFileName(file.path),
        })
    }

    return points
}

function resolveScaleMax(points: ReadonlyArray<IScatterPoint>): {
    readonly x: number
    readonly y: number
} {
    if (points.length === 0) {
        return { x: 1, y: 1 }
    }

    let maxX = 1
    let maxY = 1

    for (const point of points) {
        if (point.churn > maxX) {
            maxX = point.churn
        }
        if (point.complexity > maxY) {
            maxY = point.complexity
        }
    }

    return { x: maxX, y: maxY }
}

function mapX(value: number, maxValue: number): number {
    const plotWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT
    return PADDING_LEFT + (value / maxValue) * plotWidth
}

function mapY(value: number, maxValue: number): number {
    const plotHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM
    return SVG_HEIGHT - PADDING_BOTTOM - (value / maxValue) * plotHeight
}

/**
 * Side-panel scatter visualizing churn vs complexity with clickable points.
 */
export function ChurnComplexityScatter(props: IChurnComplexityScatterProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const title = props.title ?? t("code-city:churnComplexity.defaultTitle")
    const height = props.height ?? DEFAULT_HEIGHT
    const points = resolvePoints(props.files)

    if (points.length === 0) {
        return (
            <div aria-label={title} className="rounded-md border border-default-200 p-3">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-foreground-500">
                    {t("code-city:churnComplexity.emptyState")}
                </p>
            </div>
        )
    }

    const scaleMax = resolveScaleMax(points)
    const centerX = mapX(scaleMax.x / 2, scaleMax.x)
    const centerY = mapY(scaleMax.y / 2, scaleMax.y)
    const selectedPoint = points.find((point): boolean => point.fileId === props.selectedFileId)

    const handlePointSelect = (fileId: string): void => {
        props.onFileSelect?.(fileId)
    }

    return (
        <div aria-label={title} className="space-y-2 rounded-md border border-default-200 p-3">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-foreground-500">
                {t("code-city:churnComplexity.description")}
            </p>
            <svg
                aria-label={t("code-city:churnComplexity.ariaLabelScatter")}
                className="w-full"
                style={{ height }}
                viewBox={`0 0 ${String(SVG_WIDTH)} ${String(SVG_HEIGHT)}`}
            >
                <rect
                    fill="hsl(var(--nextui-colors-default-50))"
                    height={SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM}
                    rx={6}
                    width={SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                    x={PADDING_LEFT}
                    y={PADDING_TOP}
                />
                <line
                    stroke="hsl(var(--nextui-colors-defaultBorder))"
                    strokeDasharray="5 4"
                    x1={centerX}
                    x2={centerX}
                    y1={PADDING_TOP}
                    y2={SVG_HEIGHT - PADDING_BOTTOM}
                />
                <line
                    stroke="hsl(var(--nextui-colors-defaultBorder))"
                    strokeDasharray="5 4"
                    x1={PADDING_LEFT}
                    x2={SVG_WIDTH - PADDING_RIGHT}
                    y1={centerY}
                    y2={centerY}
                />
                <text
                    fill="hsl(var(--nextui-colors-foreground-500))"
                    fontSize="10"
                    x={PADDING_LEFT}
                    y={14}
                >
                    {t("code-city:churnComplexity.highComplexity")}
                </text>
                <text
                    fill="hsl(var(--nextui-colors-foreground-500))"
                    fontSize="10"
                    x={SVG_WIDTH - PADDING_RIGHT - 72}
                    y={14}
                >
                    {t("code-city:churnComplexity.lowComplexity")}
                </text>
                <text
                    fill="hsl(var(--nextui-colors-foreground-500))"
                    fontSize="10"
                    x={PADDING_LEFT}
                    y={SVG_HEIGHT - 10}
                >
                    {t("code-city:churnComplexity.lowChurn")}
                </text>
                <text
                    fill="hsl(var(--nextui-colors-foreground-500))"
                    fontSize="10"
                    x={SVG_WIDTH - PADDING_RIGHT - 58}
                    y={SVG_HEIGHT - 10}
                >
                    {t("code-city:churnComplexity.highChurn")}
                </text>
                {points.map((point): ReactElement => {
                    const isSelected = props.selectedFileId === point.fileId
                    const cx = mapX(point.churn, scaleMax.x)
                    const cy = mapY(point.complexity, scaleMax.y)

                    return (
                        <g
                            aria-label={t("code-city:churnComplexity.ariaLabelPoint", {
                                fileName: point.fileName,
                            })}
                            className="cursor-pointer"
                            data-selected={isSelected ? "true" : "false"}
                            key={point.fileId}
                            onClick={(): void => {
                                handlePointSelect(point.fileId)
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event): void => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    handlePointSelect(point.fileId)
                                }
                            }}
                        >
                            <circle
                                cx={cx}
                                cy={cy}
                                fill={isSelected ? "hsl(12, 94%, 52%)" : "hsl(215, 86%, 56%)"}
                                r={isSelected ? 6 : 4}
                                stroke="hsl(var(--nextui-colors-background))"
                                strokeWidth={isSelected ? 2 : 1}
                            />
                        </g>
                    )
                })}
            </svg>
            <p
                aria-label={t("code-city:churnComplexity.ariaLabelQuadrants")}
                className="text-xs text-foreground-500"
            >
                {t("code-city:churnComplexity.quadrantsDescription")}
            </p>
            {selectedPoint === undefined ? (
                <p className="text-xs text-foreground-500">
                    {t("code-city:churnComplexity.noPointSelected")}
                </p>
            ) : (
                <p className="text-xs text-foreground-500">
                    {t("code-city:churnComplexity.selectedPoint", {
                        fileName: selectedPoint.fileName,
                        churn: selectedPoint.churn,
                        complexity: selectedPoint.complexity,
                    })}
                </p>
            )}
        </div>
    )
}

export type { IScatterPoint }
