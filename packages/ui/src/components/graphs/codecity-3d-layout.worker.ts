import type { ICodeCity3DSceneFileDescriptor } from "./codecity-3d-scene"

interface ICodeCityBuildingMesh {
    readonly districtId: string
    readonly id: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
    readonly height: number
    readonly color: string
}

interface ICodeCityDistrictMesh {
    readonly id: string
    readonly label: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
}

interface ICodeCityTreemapRect {
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
}

interface ICodeCityDistrictItem {
    readonly id: string
    readonly label: string
    readonly weight: number
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

interface ICodeCityDistrictLayout extends ICodeCityDistrictMesh {
    readonly area: number
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

interface ICodeCityLayoutWorkerRequest {
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

interface ICodeCityLayoutWorkerResponse {
    readonly type: "layout"
    readonly buildings: ReadonlyArray<ICodeCityBuildingMesh>
    readonly districts: ReadonlyArray<ICodeCityDistrictMesh>
}

const MIN_BUILDING_WIDTH = 1
const MAX_BUILDING_WIDTH = 3.4
const MIN_RENDERABLE_BUILDING_WIDTH = 0.6
const MIN_RENDERABLE_BUILDING_DEPTH = 0.6
const MIN_BUILDING_HEIGHT = 1.2
const COMPLEXITY_TO_WIDTH_RATIO = 8
const LOC_TO_HEIGHT_RATIO = 24
const DISTRICT_PADDING = 1.1
const BUILDING_FILL_RATIO = 0.72
const MIN_DISTRICT_SPAN = 24

/**
 * Преобразует coverage файла в цвет здания.
 *
 * @param coverage Покрытие файла тестами в процентах.
 * @returns Hex-цвет для материала здания.
 */
function resolveCodeCityBuildingColor(coverage: number | undefined): string {
    if (coverage === undefined) {
        return "#facc15"
    }
    if (coverage >= 85) {
        return "#22c55e"
    }
    if (coverage >= 65) {
        return "#14b8a6"
    }
    if (coverage >= 45) {
        return "#fb923c"
    }
    return "#ef4444"
}

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
 * Генерирует районы CodeCity на основе paths файлов.
 *
 * @param files Набор файлов CodeCity.
 * @returns Меши районов с squarified layout.
 */
function createCodeCityDistrictMeshes(
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
function createCodeCityBuildingMeshes(
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

            return {
                color: resolveCodeCityBuildingColor(file.coverage),
                depth,
                districtId: district.id,
                height,
                id: file.id,
                width,
                x,
                z,
            }
        })
    })
}

/**
 * Вычисляет complete layout для 3D CodeCity внутри worker-потока.
 *
 * @param files Набор файлов для layout.
 * @returns Районы и здания для рендера.
 */
export function computeCodeCityLayout(files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>): {
    readonly buildings: ReadonlyArray<ICodeCityBuildingMesh>
    readonly districts: ReadonlyArray<ICodeCityDistrictMesh>
} {
    return {
        buildings: createCodeCityBuildingMeshes(files),
        districts: createCodeCityDistrictMeshes(files),
    }
}

const workerScope = globalThis as unknown as {
    addEventListener?: (
        eventName: "message",
        listener: (event: MessageEvent<ICodeCityLayoutWorkerRequest>) => void,
    ) => void
    postMessage?: (message: ICodeCityLayoutWorkerResponse) => void
}

if (typeof workerScope.addEventListener === "function" && typeof workerScope.postMessage === "function") {
    workerScope.addEventListener("message", (event): void => {
        const layout = computeCodeCityLayout(event.data.files)
        workerScope.postMessage?.({
            buildings: layout.buildings,
            districts: layout.districts,
            type: "layout",
        })
    })
}

export type { ICodeCityBuildingMesh, ICodeCityDistrictMesh }
