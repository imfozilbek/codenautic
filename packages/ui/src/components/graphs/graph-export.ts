import type { IGraphEdge, IGraphLayoutNode } from "@/components/graphs/xyflow-graph-layout"

import { GRAPH_EXPORT_PALETTE } from "@/lib/constants/graph-colors"

interface IGraphSvgBounds {
    readonly height: number
    readonly minX: number
    readonly minY: number
    readonly width: number
}

interface IGraphPngCanvasSize {
    readonly height: number
    readonly width: number
}

const MAX_PNG_EXPORT_DIMENSION = 4096
const MAX_PNG_EXPORT_PIXELS = 16_777_216

/**
 * Escape helper для безопасной подстановки текста в SVG.
 *
 * @param value Исходный текст.
 * @returns Экранированный текст.
 */
function escapeSvgText(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
}

/**
 * Создаёт безопасный filename без пробелов/спецсимволов.
 *
 * @param title Заголовок графа.
 * @returns Нормализованное имя.
 */
export function buildGraphExportFileName(title: string): string {
    const normalized = title
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/(^-+|-+$)/g, "")
    if (normalized.length === 0) {
        return "graph-export"
    }
    return normalized
}

/**
 * Загружает blob в виде файла.
 *
 * @param fileName Имя файла с расширением.
 * @param payload Данные.
 */
function downloadBlob(fileName: string, payload: Blob): void {
    const objectUrl = URL.createObjectURL(payload)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = fileName
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
}

/**
 * Вычисляет внешние границы графа на основе layout-узлов.
 *
 * @param nodes Узлы с позициями.
 * @returns Геометрические границы.
 */
function resolveGraphBounds(nodes: ReadonlyArray<IGraphLayoutNode>): IGraphSvgBounds {
    const minX = Math.min(...nodes.map((node): number => node.position.x))
    const minY = Math.min(...nodes.map((node): number => node.position.y))
    const maxX = Math.max(...nodes.map((node): number => node.position.x + node.width))
    const maxY = Math.max(...nodes.map((node): number => node.position.y + node.height))
    return {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY,
    }
}

/**
 * Ограничивает размер PNG-холста безопасными лимитами по стороне и числу пикселей.
 *
 * @param width Исходная ширина SVG-рендера.
 * @param height Исходная высота SVG-рендера.
 * @returns Размер canvas для PNG-экспорта.
 */
export function resolveGraphPngCanvasSize(width: number, height: number): IGraphPngCanvasSize {
    if (
        Number.isFinite(width) === false ||
        Number.isFinite(height) === false ||
        width <= 0 ||
        height <= 0
    ) {
        throw new Error("Unable to resolve PNG export canvas size")
    }

    const normalizedWidth = Math.max(1, Math.floor(width))
    const normalizedHeight = Math.max(1, Math.floor(height))
    const totalPixels = normalizedWidth * normalizedHeight

    if (
        normalizedWidth <= MAX_PNG_EXPORT_DIMENSION &&
        normalizedHeight <= MAX_PNG_EXPORT_DIMENSION &&
        totalPixels <= MAX_PNG_EXPORT_PIXELS
    ) {
        return {
            height: normalizedHeight,
            width: normalizedWidth,
        }
    }

    const dimensionScale = Math.min(
        MAX_PNG_EXPORT_DIMENSION / normalizedWidth,
        MAX_PNG_EXPORT_DIMENSION / normalizedHeight,
        1,
    )
    const pixelScale = Math.min(1, Math.sqrt(MAX_PNG_EXPORT_PIXELS / totalPixels))
    const scale = Math.max(
        1 / Math.max(normalizedWidth, normalizedHeight),
        Math.min(dimensionScale, pixelScale),
    )

    return {
        height: Math.max(1, Math.floor(normalizedHeight * scale)),
        width: Math.max(1, Math.floor(normalizedWidth * scale)),
    }
}

/**
 * Формирует SVG-представление graph layout (узлы + связи).
 *
 * @param title Заголовок графа.
 * @param nodes Узлы графа с layout-позициями.
 * @param edges Рёбра графа.
 * @returns Текст SVG.
 */
export function buildGraphSvg(
    title: string,
    nodes: ReadonlyArray<IGraphLayoutNode>,
    edges: ReadonlyArray<IGraphEdge>,
): string {
    const EMPTY_CANVAS_WIDTH = 640
    const EMPTY_CANVAS_HEIGHT = 320
    const graphPadding = 24
    const headerHeight = 52

    if (nodes.length === 0) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${EMPTY_CANVAS_WIDTH}" height="${EMPTY_CANVAS_HEIGHT}" viewBox="0 0 ${EMPTY_CANVAS_WIDTH} ${EMPTY_CANVAS_HEIGHT}">
  <rect width="${EMPTY_CANVAS_WIDTH}" height="${EMPTY_CANVAS_HEIGHT}" fill="${GRAPH_EXPORT_PALETTE.graphLayout.emptyBackground}" />
  <text x="${EMPTY_CANVAS_WIDTH / 2}" y="${EMPTY_CANVAS_HEIGHT / 2}" text-anchor="middle" fill="${GRAPH_EXPORT_PALETTE.graphLayout.emptyText}" font-size="16" font-family="Arial, sans-serif">No graph data</text>
</svg>`
    }

    const bounds = resolveGraphBounds(nodes)
    const graphWidth = Math.max(bounds.width + graphPadding * 2, 480)
    const graphHeight = Math.max(bounds.height + graphPadding * 2 + headerHeight, 320)
    const nodeById = new Map<string, IGraphLayoutNode>()
    for (const node of nodes) {
        nodeById.set(node.id, node)
    }

    const edgeSvg = edges
        .map((edge): string => {
            const sourceNode = nodeById.get(edge.source)
            const targetNode = nodeById.get(edge.target)
            if (sourceNode === undefined || targetNode === undefined) {
                return ""
            }

            const sourceX = sourceNode.position.x - bounds.minX + graphPadding + sourceNode.width
            const sourceY =
                sourceNode.position.y -
                bounds.minY +
                graphPadding +
                sourceNode.height / 2 +
                headerHeight
            const targetX = targetNode.position.x - bounds.minX + graphPadding
            const targetY =
                targetNode.position.y -
                bounds.minY +
                graphPadding +
                targetNode.height / 2 +
                headerHeight
            const midX = (sourceX + targetX) / 2
            const midY = (sourceY + targetY) / 2
            const edgeLabel = edge.label === undefined ? "" : escapeSvgText(edge.label)
            const edgeLabelSvg =
                edgeLabel.length === 0
                    ? ""
                    : `<text x="${midX}" y="${midY - 6}" text-anchor="middle" fill="${GRAPH_EXPORT_PALETTE.graphLayout.edgeLabel}" font-size="10" font-family="Arial, sans-serif">${edgeLabel}</text>`

            return `
  <line x1="${sourceX}" y1="${sourceY}" x2="${targetX}" y2="${targetY}" stroke="${GRAPH_EXPORT_PALETTE.graphLayout.edgeStroke}" stroke-width="2" stroke-linecap="round" />
  ${edgeLabelSvg}`
        })
        .join("\n")

    const nodeSvg = nodes
        .map((node): string => {
            const x = node.position.x - bounds.minX + graphPadding
            const y = node.position.y - bounds.minY + graphPadding + headerHeight
            const label = escapeSvgText(node.label)
            return `
  <g>
    <rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="12" fill="${GRAPH_EXPORT_PALETTE.graphLayout.nodeFill}" stroke="${GRAPH_EXPORT_PALETTE.graphLayout.nodeStroke}" stroke-width="1.5" />
    <text x="${x + 12}" y="${y + 24}" fill="${GRAPH_EXPORT_PALETTE.graphLayout.nodeLabel}" font-size="12" font-family="Arial, sans-serif">${label}</text>
  </g>`
        })
        .join("\n")

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${graphWidth}" height="${graphHeight}" viewBox="0 0 ${graphWidth} ${graphHeight}">
  <rect width="${graphWidth}" height="${graphHeight}" fill="${GRAPH_EXPORT_PALETTE.graphLayout.background}" />
  <text x="${graphPadding}" y="32" fill="${GRAPH_EXPORT_PALETTE.graphLayout.titleText}" font-size="18" font-family="Arial, sans-serif">${escapeSvgText(title)}</text>
${edgeSvg}
${nodeSvg}
</svg>`
}

/**
 * Экспортирует граф как SVG.
 *
 * @param title Заголовок графа.
 * @param nodes Узлы layout.
 * @param edges Рёбра.
 * @returns Promise завершения операции.
 */
export function exportGraphAsSvg(
    title: string,
    nodes: ReadonlyArray<IGraphLayoutNode>,
    edges: ReadonlyArray<IGraphEdge>,
): void {
    const payload = buildGraphSvg(title, nodes, edges)
    const fileName = `${buildGraphExportFileName(title)}.svg`
    const blob = new Blob([payload], { type: "image/svg+xml;charset=utf-8" })
    downloadBlob(fileName, blob)
}

/**
 * Экспортирует граф как PNG через промежуточный SVG.
 *
 * @param title Заголовок графа.
 * @param nodes Узлы layout.
 * @param edges Рёбра.
 * @returns Promise завершения операции.
 */
export async function exportGraphAsPng(
    title: string,
    nodes: ReadonlyArray<IGraphLayoutNode>,
    edges: ReadonlyArray<IGraphEdge>,
): Promise<void> {
    const svgPayload = buildGraphSvg(title, nodes, edges)
    const svgBlob = new Blob([svgPayload], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const nextImage = new Image()
            nextImage.onload = (): void => {
                resolve(nextImage)
            }
            nextImage.onerror = (): void => {
                reject(new Error("Unable to load generated SVG image"))
            }
            nextImage.src = svgUrl
        })

        const canvasSize = resolveGraphPngCanvasSize(image.width, image.height)
        const canvas = document.createElement("canvas")
        canvas.width = canvasSize.width
        canvas.height = canvasSize.height
        const context = canvas.getContext("2d")
        if (context === null) {
            throw new Error("Unable to get 2d context")
        }
        context.drawImage(image, 0, 0, canvasSize.width, canvasSize.height)

        const pngBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob): void => {
                if (blob === null) {
                    reject(new Error("Unable to convert canvas to PNG"))
                    return
                }
                resolve(blob)
            }, "image/png")
        })

        const fileName = `${buildGraphExportFileName(title)}.png`
        downloadBlob(fileName, pngBlob)
    } finally {
        URL.revokeObjectURL(svgUrl)
    }
}

/**
 * Экспортирует агрегированное представление графа как JSON.
 *
 * @param title Заголовок графа.
 * @param payload Данные для сериализации.
 */
export function exportGraphAsJson(title: string, payload: unknown): void {
    const fileName = `${buildGraphExportFileName(title)}.json`
    const serializedPayload = JSON.stringify(payload, null, 2)
    const blob = new Blob([serializedPayload], {
        type: "application/json;charset=utf-8",
    })
    downloadBlob(fileName, blob)
}
