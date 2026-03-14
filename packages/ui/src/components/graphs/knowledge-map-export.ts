import { buildGraphExportFileName } from "@/components/graphs/graph-export"
import { GRAPH_EXPORT_PALETTE } from "@/lib/constants/graph-colors"

/**
 * Максимум строк легенды для каждой секции в SVG-экспорте knowledge map.
 */
const MAX_EXPORT_LEGEND_ROWS = 8

/**
 * Метаданные knowledge map snapshot.
 */
export interface IKnowledgeMapExportMetadata {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Отображаемый лейбл репозитория. */
    readonly repositoryLabel: string
    /** Активная метрика city. */
    readonly metricLabel: string
    /** ISO-время генерации snapshot. */
    readonly generatedAt: string
    /** Количество файлов в активном профиле. */
    readonly totalFiles: number
    /** Количество контрибьюторов в knowledge map. */
    readonly totalContributors: number
}

/**
 * Элемент легенды ownership.
 */
export interface IKnowledgeMapExportOwnerLegendEntry {
    /** Имя контрибьютора. */
    readonly ownerName: string
    /** Цвет ownership-маркера. */
    readonly color: string
    /** Количество файлов владельца. */
    readonly fileCount: number
}

/**
 * Элемент district-level bus factor риска.
 */
export interface IKnowledgeMapExportDistrictRiskEntry {
    /** Лейбл district/module. */
    readonly districtLabel: string
    /** Значение bus factor. */
    readonly busFactor: number
    /** Текстовый уровень риска. */
    readonly riskLabel: string
}

/**
 * Элемент knowledge silo summary.
 */
export interface IKnowledgeMapExportSiloEntry {
    /** Лейбл silo. */
    readonly siloLabel: string
    /** Risk score silo. */
    readonly riskScore: number
    /** Количество контрибьюторов в silo. */
    readonly contributorCount: number
    /** Количество файлов в silo. */
    readonly fileCount: number
}

/**
 * Полная модель экспорта knowledge map.
 */
export interface IKnowledgeMapExportModel {
    /** Метаданные snapshot. */
    readonly metadata: IKnowledgeMapExportMetadata
    /** Legend для ownership. */
    readonly owners: ReadonlyArray<IKnowledgeMapExportOwnerLegendEntry>
    /** Сводка bus factor рисков по district. */
    readonly districts: ReadonlyArray<IKnowledgeMapExportDistrictRiskEntry>
    /** Сводка knowledge silos. */
    readonly silos: ReadonlyArray<IKnowledgeMapExportSiloEntry>
}

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
 * Нормализует цвет legend entry для SVG.
 *
 * @param color Исходный цвет.
 * @returns Безопасный цвет.
 */
function normalizeSvgColor(color: string): string {
    if (/^#[0-9a-f]{3,8}$/i.test(color)) {
        return color
    }
    return GRAPH_EXPORT_PALETTE.knowledgeMap.fallbackColor
}

/**
 * Загружает blob в виде файла.
 *
 * @param fileName Имя файла с расширением.
 * @param payload Данные для загрузки.
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
 * Формирует имя файла экспорта knowledge map.
 *
 * @param repositoryLabel Лейбл репозитория.
 * @returns Нормализованное имя файла.
 */
export function buildKnowledgeMapExportFileName(repositoryLabel: string): string {
    return `${buildGraphExportFileName(repositoryLabel)}-knowledge-map`
}

/**
 * Формирует SVG snapshot knowledge map с legend + metadata.
 *
 * @param model Модель export snapshot.
 * @returns Текст SVG.
 */
export function buildKnowledgeMapExportSvg(model: IKnowledgeMapExportModel): string {
    const canvasWidth = 1040
    const canvasHeight = 720
    const headerTitle = `Knowledge Map Snapshot — ${model.metadata.repositoryLabel}`
    const metadataRows: ReadonlyArray<string> = [
        `Repository ID: ${model.metadata.repositoryId}`,
        `Metric: ${model.metadata.metricLabel}`,
        `Generated at: ${model.metadata.generatedAt}`,
        `Total files: ${String(model.metadata.totalFiles)}`,
        `Contributors: ${String(model.metadata.totalContributors)}`,
    ]

    const ownerRows = model.owners.slice(0, MAX_EXPORT_LEGEND_ROWS)
    const districtRows = model.districts.slice(0, MAX_EXPORT_LEGEND_ROWS)
    const siloRows = model.silos.slice(0, MAX_EXPORT_LEGEND_ROWS)

    const metadataTextSvg = metadataRows
        .map((row, index): string => {
            return `<text x="44" y="${String(116 + index * 24)}" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.metadataText}" font-size="14" font-family="Arial, sans-serif">${escapeSvgText(row)}</text>`
        })
        .join("\n")

    const ownerLegendSvg = ownerRows
        .map((owner, index): string => {
            const y = 306 + index * 30
            return `<g>
  <rect x="44" y="${String(y - 12)}" width="14" height="14" rx="3" fill="${normalizeSvgColor(owner.color)}" />
  <text x="68" y="${String(y)}" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle}" font-size="13" font-family="Arial, sans-serif">${escapeSvgText(owner.ownerName)} • files ${String(owner.fileCount)}</text>
</g>`
        })
        .join("\n")

    const districtRiskSvg = districtRows
        .map((district, index): string => {
            const y = 306 + index * 30
            return `<text x="550" y="${String(y)}" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle}" font-size="13" font-family="Arial, sans-serif">${escapeSvgText(district.districtLabel)} • bus factor ${String(district.busFactor)} • ${escapeSvgText(district.riskLabel)}</text>`
        })
        .join("\n")

    const siloSummarySvg = siloRows
        .map((silo, index): string => {
            const y = 586 + index * 22
            return `<text x="44" y="${String(y)}" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.metadataText}" font-size="12" font-family="Arial, sans-serif">${escapeSvgText(silo.siloLabel)} • risk ${String(silo.riskScore)} • contributors ${String(silo.contributorCount)} • files ${String(silo.fileCount)}</text>`
        })
        .join("\n")

    const metadataPayload = escapeSvgText(JSON.stringify(model))

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${String(canvasWidth)}" height="${String(canvasHeight)}" viewBox="0 0 ${String(canvasWidth)} ${String(canvasHeight)}">
  <rect width="${String(canvasWidth)}" height="${String(canvasHeight)}" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.background}" />
  <metadata>${metadataPayload}</metadata>

  <text x="44" y="58" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.headerTitle}" font-size="28" font-family="Arial, sans-serif">${escapeSvgText(headerTitle)}</text>
  <text x="44" y="84" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.subtitle}" font-size="14" font-family="Arial, sans-serif">Exported for architecture documentation</text>

  <rect x="28" y="98" width="486" height="154" rx="12" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionFill}" stroke="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionStroke}" />
  <text x="44" y="132" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle}" font-size="16" font-family="Arial, sans-serif">Metadata</text>
${metadataTextSvg}

  <rect x="28" y="274" width="486" height="254" rx="12" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionFill}" stroke="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionStroke}" />
  <text x="44" y="306" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle}" font-size="16" font-family="Arial, sans-serif">Legend — Ownership</text>
${ownerLegendSvg}

  <rect x="534" y="274" width="478" height="254" rx="12" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionFill}" stroke="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionStroke}" />
  <text x="550" y="306" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle}" font-size="16" font-family="Arial, sans-serif">Legend — Bus Factor Risk</text>
${districtRiskSvg}

  <rect x="28" y="548" width="984" height="148" rx="12" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionFill}" stroke="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionStroke}" />
  <text x="44" y="572" fill="${GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle}" font-size="16" font-family="Arial, sans-serif">Knowledge Silos</text>
${siloSummarySvg}
</svg>`
}

/**
 * Экспортирует knowledge map snapshot в SVG.
 *
 * @param model Модель export snapshot.
 */
export function exportKnowledgeMapAsSvg(model: IKnowledgeMapExportModel): void {
    const payload = buildKnowledgeMapExportSvg(model)
    const fileName = `${buildKnowledgeMapExportFileName(model.metadata.repositoryLabel)}.svg`
    const blob = new Blob([payload], {
        type: "image/svg+xml;charset=utf-8",
    })
    downloadBlob(fileName, blob)
}

/**
 * Экспортирует knowledge map snapshot в PNG через промежуточный SVG.
 *
 * @param model Модель export snapshot.
 * @returns Promise завершения операции.
 */
export async function exportKnowledgeMapAsPng(model: IKnowledgeMapExportModel): Promise<void> {
    const svgPayload = buildKnowledgeMapExportSvg(model)
    const svgBlob = new Blob([svgPayload], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const nextImage = new Image()
            nextImage.onload = (): void => {
                resolve(nextImage)
            }
            nextImage.onerror = (): void => {
                reject(new Error("Unable to load generated knowledge map SVG image"))
            }
            nextImage.src = svgUrl
        })

        const canvas = document.createElement("canvas")
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext("2d")
        if (context === null) {
            throw new Error("Unable to get 2d context")
        }
        context.drawImage(image, 0, 0)

        const pngBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob): void => {
                if (blob === null) {
                    reject(new Error("Unable to convert knowledge map canvas to PNG"))
                    return
                }
                resolve(blob)
            }, "image/png")
        })

        const fileName = `${buildKnowledgeMapExportFileName(model.metadata.repositoryLabel)}.png`
        downloadBlob(fileName, pngBlob)
    } finally {
        URL.revokeObjectURL(svgUrl)
    }
}
