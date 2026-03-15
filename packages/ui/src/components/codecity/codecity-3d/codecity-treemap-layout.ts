import type {
    ICodeCity3DSceneFileDescriptor,
    ICodeCity3DSceneImpactedFileDescriptor,
    TCodeCityImpactType,
} from "../codecity-3d-scene"

import {
    BUILDING_FILL_RATIO,
    COMPLEXITY_TO_WIDTH_RATIO,
    DISTRICT_PADDING,
    IMPACT_NEIGHBOR_COUNT,
    LOC_TO_HEIGHT_RATIO,
    MAX_BUILDING_WIDTH,
    MIN_BUILDING_HEIGHT,
    MIN_BUILDING_WIDTH,
    MIN_DISTRICT_SPAN,
    MIN_RENDERABLE_BUILDING_DEPTH,
    MIN_RENDERABLE_BUILDING_WIDTH,
} from "./codecity-scene-constants"
import type {
    ICodeCityBuildingMesh,
    ICodeCityDistrictItem,
    ICodeCityDistrictLayout,
    ICodeCityDistrictMesh,
    ICodeCityTreemapRect,
} from "./codecity-scene-types"
import { resolveCodeCityBuildingColor } from "./codecity-visual-resolvers"

/**
 * Выделяет label района из пути файла.
 *
 * @param path Путь файла.
 * @returns Label района.
 */
function resolveDistrictLabel(path: string): string {
    const segments = path
        .split("/")
        .map((segment): string => segment.trim())
        .filter((segment): boolean => segment.length > 0)

    const firstSegment = segments.at(0)
    if (firstSegment === undefined) {
        return "root"
    }

    if (firstSegment === "src") {
        return segments.at(1) ?? "src"
    }

    return firstSegment
}

/**
 * Группирует файлы по районам и назначает вес района.
 *
 * @param files Набор файлов CodeCity.
 * @returns Районы с файлами и весами.
 */
function createDistrictItems(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCityDistrictItem> {
    const filesByDistrict = new Map<string, Array<ICodeCity3DSceneFileDescriptor>>()

    for (const file of files) {
        const districtLabel = resolveDistrictLabel(file.path)
        const districtFiles = filesByDistrict.get(districtLabel)
        if (districtFiles !== undefined) {
            districtFiles.push(file)
            continue
        }
        filesByDistrict.set(districtLabel, [file])
    }

    return Array.from(filesByDistrict.entries())
        .sort((firstDistrict, secondDistrict): number => {
            return firstDistrict[0].localeCompare(secondDistrict[0])
        })
        .map(([label, districtFiles]): ICodeCityDistrictItem => {
            const weight = districtFiles.reduce((totalWeight, file): number => {
                return totalWeight + Math.max(1, file.loc ?? 0)
            }, 0)

            return {
                files: districtFiles,
                id: label,
                label,
                weight,
            }
        })
}

/**
 * Оценивает worst aspect ratio для ряда squarified layout.
 *
 * @param areas Площади элементов ряда.
 * @param shortSide Короткая сторона текущего контейнера.
 * @returns Максимальное отклонение aspect ratio.
 */
function calculateWorstAspect(areas: ReadonlyArray<number>, shortSide: number): number {
    if (areas.length === 0) {
        return Number.POSITIVE_INFINITY
    }

    const totalArea = areas.reduce((total, currentArea): number => total + currentArea, 0)
    const maxArea = Math.max(...areas)
    const minArea = Math.min(...areas)
    const sideSquared = shortSide * shortSide
    const worstLeft = (sideSquared * maxArea) / (totalArea * totalArea)
    const worstRight = (totalArea * totalArea) / (sideSquared * Math.max(minArea, 1e-6))
    return Math.max(worstLeft, worstRight)
}

/**
 * Раскладывает ряд районов в текущий контейнер.
 *
 * @param row Районы текущего ряда.
 * @param container Текущий контейнер.
 * @param horizontal Ориентация ряда.
 * @returns Размещённый ряд и остаток контейнера.
 */
function layoutDistrictRow(
    row: ReadonlyArray<ICodeCityDistrictLayout>,
    container: ICodeCityTreemapRect,
    horizontal: boolean,
): {
    readonly placed: ReadonlyArray<ICodeCityDistrictLayout>
    readonly remaining: ICodeCityTreemapRect
} {
    const rowArea = row.reduce((totalArea, district): number => totalArea + district.area, 0)

    if (horizontal) {
        const rowDepth = rowArea / Math.max(container.width, 1e-6)
        let xCursor = container.x

        const placed = row.map((district): ICodeCityDistrictLayout => {
            const width = district.area / Math.max(rowDepth, 1e-6)
            const x = xCursor + width / 2
            xCursor += width

            return {
                ...district,
                depth: rowDepth,
                width,
                x,
                z: container.z + rowDepth / 2,
            }
        })

        return {
            placed,
            remaining: {
                depth: Math.max(0, container.depth - rowDepth),
                width: container.width,
                x: container.x,
                z: container.z + rowDepth,
            },
        }
    }

    const rowWidth = rowArea / Math.max(container.depth, 1e-6)
    let zCursor = container.z
    const placed = row.map((district): ICodeCityDistrictLayout => {
        const depth = district.area / Math.max(rowWidth, 1e-6)
        const z = zCursor + depth / 2
        zCursor += depth

        return {
            ...district,
            depth,
            width: rowWidth,
            x: container.x + rowWidth / 2,
            z,
        }
    })

    return {
        placed,
        remaining: {
            depth: container.depth,
            width: Math.max(0, container.width - rowWidth),
            x: container.x + rowWidth,
            z: container.z,
        },
    }
}

/**
 * Строит squarified treemap layout районов и центрирует его относительно (0,0).
 *
 * @param districts Районы с весами.
 * @returns Layout районов.
 */
function createDistrictLayouts(
    districts: ReadonlyArray<ICodeCityDistrictItem>,
): ReadonlyArray<ICodeCityDistrictLayout> {
    if (districts.length === 0) {
        return []
    }

    const totalWeight = districts.reduce((total, district): number => total + district.weight, 0)
    const span = Math.max(MIN_DISTRICT_SPAN, Math.sqrt(totalWeight))
    const canvasArea = span * span

    const queue = districts
        .map((district): ICodeCityDistrictLayout => {
            return {
                area: (district.weight / totalWeight) * canvasArea,
                depth: 0,
                files: district.files,
                id: district.id,
                label: district.label,
                width: 0,
                x: 0,
                z: 0,
            }
        })
        .sort((leftDistrict, rightDistrict): number => rightDistrict.area - leftDistrict.area)

    let container: ICodeCityTreemapRect = { depth: span, width: span, x: 0, z: 0 }
    let row: Array<ICodeCityDistrictLayout> = []
    const placed: Array<ICodeCityDistrictLayout> = []

    for (const district of queue) {
        const nextRow = [...row, district]
        const shortSide = Math.max(1e-6, Math.min(container.width, container.depth))
        const currentWorst = calculateWorstAspect(
            row.map((rowDistrict): number => rowDistrict.area),
            shortSide,
        )
        const nextWorst = calculateWorstAspect(
            nextRow.map((rowDistrict): number => rowDistrict.area),
            shortSide,
        )

        if (row.length === 0 || nextWorst <= currentWorst) {
            row = nextRow
            continue
        }

        const rowLayout = layoutDistrictRow(row, container, container.width >= container.depth)
        placed.push(...rowLayout.placed)
        container = rowLayout.remaining
        row = [district]
    }

    if (row.length > 0) {
        const rowLayout = layoutDistrictRow(row, container, container.width >= container.depth)
        placed.push(...rowLayout.placed)
    }

    const centerOffset = span / 2
    return placed.map((district): ICodeCityDistrictLayout => {
        return {
            ...district,
            x: district.x - centerOffset,
            z: district.z - centerOffset,
        }
    })
}

/**
 * Рассчитывает health score файла по coverage, complexity и bug frequency.
 *
 * @param file Дескриптор файла CodeCity.
 * @param totalBugCount Общее число багов файла.
 * @returns Нормализованный health score [5..100].
 */
function resolveFileHealthScore(
    file: ICodeCity3DSceneFileDescriptor,
    totalBugCount: number,
): number {
    const coverage = file.coverage ?? 62
    const complexity = file.complexity ?? 8
    const complexityPenalty = Math.min(28, complexity * 1.05)
    const bugPenalty = Math.min(25, totalBugCount * 1.4)
    const rawScore = coverage - complexityPenalty - bugPenalty + 34
    return Math.max(5, Math.min(100, rawScore))
}

/**
 * Генерирует районы CodeCity на основе paths файлов.
 *
 * @param files Набор файлов CodeCity.
 * @returns Меши районов с squarified layout.
 */
export function createCodeCityDistrictMeshes(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCityDistrictMesh> {
    const districtLayouts = createDistrictLayouts(createDistrictItems(files))

    return districtLayouts.map((district): ICodeCityDistrictMesh => {
        return {
            depth: district.depth,
            id: district.id,
            label: district.label,
            width: district.width,
            x: district.x,
            z: district.z,
        }
    })
}

/**
 * Генерирует 3D-здания по файлам репозитория.
 *
 * @param files Набор файлов CodeCity.
 * @returns Нормализованные меши зданий.
 */
export function createCodeCityBuildingMeshes(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCityBuildingMesh> {
    const districtLayouts = createDistrictLayouts(createDistrictItems(files))

    return districtLayouts.flatMap((district): ReadonlyArray<ICodeCityBuildingMesh> => {
        const districtFiles = district.files
        const columns = Math.max(1, Math.ceil(Math.sqrt(districtFiles.length)))
        const rows = Math.max(1, Math.ceil(districtFiles.length / columns))
        const usableWidth = Math.max(2, district.width - DISTRICT_PADDING * 2)
        const usableDepth = Math.max(2, district.depth - DISTRICT_PADDING * 2)
        const cellWidth = usableWidth / columns
        const cellDepth = usableDepth / rows
        const districtLeft = district.x - district.width / 2 + DISTRICT_PADDING
        const districtTop = district.z - district.depth / 2 + DISTRICT_PADDING

        return districtFiles.map((file, index): ICodeCityBuildingMesh => {
            const rowIndex = Math.floor(index / columns)
            const columnIndex = index % columns
            const fileComplexity = file.complexity ?? 0
            const fileLoc = file.loc ?? 0
            const widthByComplexity = Math.max(
                MIN_BUILDING_WIDTH,
                Math.min(MAX_BUILDING_WIDTH, fileComplexity / COMPLEXITY_TO_WIDTH_RATIO),
            )
            const maxCellWidth = cellWidth * BUILDING_FILL_RATIO
            const maxCellDepth = cellDepth * BUILDING_FILL_RATIO
            const width = Math.max(
                MIN_RENDERABLE_BUILDING_WIDTH,
                Math.min(widthByComplexity, maxCellWidth),
            )
            const depth = Math.max(MIN_RENDERABLE_BUILDING_DEPTH, maxCellDepth)
            const height = Math.max(MIN_BUILDING_HEIGHT, fileLoc / LOC_TO_HEIGHT_RATIO)
            const x = districtLeft + cellWidth * (columnIndex + 0.5)
            const z = districtTop + cellDepth * (rowIndex + 0.5)
            const recentBugCount = file.bugIntroductions?.["7d"] ?? 0
            const mediumBugCount = file.bugIntroductions?.["30d"] ?? 0
            const longTermBugCount = file.bugIntroductions?.["90d"] ?? 0
            const totalBugCount = recentBugCount + mediumBugCount + longTermBugCount
            const healthScore = resolveFileHealthScore(file, totalBugCount)

            return {
                color: resolveCodeCityBuildingColor(file.coverage),
                depth,
                districtId: district.id,
                healthScore,
                height,
                id: file.id,
                recentBugCount,
                totalBugCount,
                width,
                x,
                z,
            }
        })
    })
}

/**
 * Строит карту impact-состояний зданий: прямой impact + ripple на соседей.
 *
 * @param buildings Сгенерированные здания CodeCity.
 * @param impactedFiles Явные impact-файлы из CCR контекста.
 * @returns Карта fileId -> impact type.
 */
export function createCodeCityBuildingImpactMap(
    buildings: ReadonlyArray<ICodeCityBuildingMesh>,
    impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>,
): ReadonlyMap<string, TCodeCityImpactType> {
    const impactByFileId = new Map<string, TCodeCityImpactType>()
    for (const impactedFile of impactedFiles) {
        impactByFileId.set(impactedFile.fileId, impactedFile.impactType)
    }

    const candidateNeighborsByDistrict = new Map<string, Array<ICodeCityBuildingMesh>>()
    for (const building of buildings) {
        if (impactByFileId.has(building.id)) {
            continue
        }

        const districtNeighbors = candidateNeighborsByDistrict.get(building.districtId)
        if (districtNeighbors !== undefined) {
            districtNeighbors.push(building)
            continue
        }
        candidateNeighborsByDistrict.set(building.districtId, [building])
    }

    const impactOrigins = buildings.filter((building): boolean => {
        const impactType = impactByFileId.get(building.id)
        return impactType === "changed" || impactType === "impacted"
    })

    for (const origin of impactOrigins) {
        const districtNeighbors = candidateNeighborsByDistrict.get(origin.districtId) ?? []
        const nearestNeighbors = districtNeighbors
            .map(
                (
                    candidate,
                ): { readonly building: ICodeCityBuildingMesh; readonly distance: number } => {
                    return {
                        building: candidate,
                        distance: Math.hypot(candidate.x - origin.x, candidate.z - origin.z),
                    }
                },
            )
            .sort((leftCandidate, rightCandidate): number => {
                return leftCandidate.distance - rightCandidate.distance
            })
            .slice(0, IMPACT_NEIGHBOR_COUNT)

        for (const neighbor of nearestNeighbors) {
            if (impactByFileId.has(neighbor.building.id)) {
                continue
            }
            impactByFileId.set(neighbor.building.id, "ripple")
        }
    }

    return impactByFileId
}
