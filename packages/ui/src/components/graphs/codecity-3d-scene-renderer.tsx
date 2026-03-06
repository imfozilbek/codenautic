import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import { Line, OrbitControls, Text } from "@react-three/drei"
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import {
    Color,
    InstancedMesh,
    Matrix4,
    MeshBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    Vector3,
} from "three"

import type {
    ICodeCity3DCausalCouplingDescriptor,
    ICodeCity3DSceneImpactedFileDescriptor,
    ICodeCity3DSceneFileDescriptor,
    TCodeCityCausalCouplingType,
    TCodeCityCameraPreset,
    TCodeCityImpactType,
} from "./codecity-3d-scene"

interface ICodeCity3DSceneRendererProps {
    readonly cameraPreset: TCodeCityCameraPreset
    readonly causalCouplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor>
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
    readonly impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>
    readonly navigationChainFileIds: ReadonlyArray<string>
    readonly navigationActiveFileId?: string
    readonly selectedFileId?: string
    readonly onBuildingHover?: (fileId: string | undefined) => void
    readonly onBuildingSelect?: (fileId: string | undefined) => void
}

/**
 * Подготовленная геометрия здания в 3D CodeCity.
 */
export interface ICodeCityBuildingMesh {
    readonly districtId: string
    readonly id: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
    readonly height: number
    readonly color: string
    readonly healthScore: number
    readonly recentBugCount: number
    readonly totalBugCount: number
}

/**
 * Геометрия района (district) в 3D CodeCity.
 */
export interface ICodeCityDistrictMesh {
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

interface IOrbitControlsLike {
    readonly target: Vector3
    update: () => void
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
const CAMERA_LERP_FACTOR = 0.12
const IMPACT_NEIGHBOR_COUNT = 2
const HIGH_QUALITY_MAX_BUILDINGS = 220
const MEDIUM_QUALITY_MAX_BUILDINGS = 480
const LOW_QUALITY_MAX_BUILDINGS = 900
const PERFORMANCE_SAMPLE_WINDOW_SECONDS = 1
const TARGET_FPS = 60
const WARNING_FPS = TARGET_FPS - 10
const CRITICAL_FPS = TARGET_FPS - 22
const CAUSAL_ARC_BASE_LIFT = 1.8
const CAUSAL_ARC_SEGMENTS = 20
const MAX_CAUSAL_ARCS_HIGH_QUALITY = 42
const MAX_CAUSAL_ARCS_LOW_QUALITY = 16
const MAX_BUG_EMISSION_CLOUDS = 80

type TVec3 = readonly [number, number, number]
type TCodeCityBuildingImpactState = TCodeCityImpactType | "none"
type TCodeCityRenderQuality = "high" | "medium" | "low"

interface ICameraPresetTarget {
    readonly position: TVec3
    readonly focus: TVec3
}

interface ICodeCityBuildingImpactProfile {
    readonly emissive: string
    readonly baseIntensity: number
    readonly pulseAmplitude: number
    readonly pulseSpeed: number
    readonly rippleLift: number
}

interface ICodeCityRenderBudget {
    readonly quality: TCodeCityRenderQuality
    readonly useInstancing: boolean
    readonly maxInteractiveBuildings: number
    readonly dpr: [number, number]
    readonly cullingRadius: number
}

interface ICodeCityCausalArc {
    readonly sourceFileId: string
    readonly targetFileId: string
    readonly couplingType: TCodeCityCausalCouplingType
    readonly color: string
    readonly strength: number
    readonly start: TVec3
    readonly control: TVec3
    readonly end: TVec3
    readonly particleSpeed: number
}

interface IBugEmissionSettings {
    readonly color: string
    readonly particleCount: number
    readonly pulseStrength: number
}

interface ICodeCityDistrictHealthAura {
    readonly districtId: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
    readonly healthScore: number
    readonly color: string
    readonly pulseSpeed: number
}

interface ICodeCityLayoutWorkerRequest {
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

interface ICodeCityLayoutWorkerResponse {
    readonly type: "layout"
    readonly buildings: ReadonlyArray<ICodeCityBuildingMesh>
    readonly districts: ReadonlyArray<ICodeCityDistrictMesh>
}

/**
 * Создаёт layout worker для расчёта геометрии CodeCity в фоне.
 *
 * @returns Экземпляр Worker или `undefined`, если инициализация недоступна.
 */
export function createCodeCityLayoutWorker(): Worker | undefined {
    if (typeof Worker === "undefined") {
        return undefined
    }

    try {
        return new Worker(new URL("./codecity-3d-layout.worker.ts", import.meta.url), {
            type: "module",
        })
    } catch {
        return undefined
    }
}

const BASE_CAMERA_PRESETS: Readonly<Record<TCodeCityCameraPreset, ICameraPresetTarget>> = {
    "bird-eye": {
        focus: [0, 0, 0],
        position: [30, 26, 30],
    },
    "focus-on-building": {
        focus: [0, 0, 0],
        position: [24, 20, 22],
    },
    "street-level": {
        focus: [0, 2, 0],
        position: [10, 7, 15],
    },
}

/**
 * Возвращает цвет causal-дуги по типу coupling-связи.
 *
 * @param couplingType Категория причинной связи.
 * @returns Hex-цвет линии и particle-flow.
 */
export function resolveCodeCityCausalArcColor(
    couplingType: TCodeCityCausalCouplingType,
): string {
    if (couplingType === "dependency") {
        return "#fb923c"
    }
    if (couplingType === "ownership") {
        return "#22c55e"
    }
    return "#38bdf8"
}

/**
 * Строит causal-дуги для 3D overlay: связь между зданиями с контрольной точкой и скоростью particle-flow.
 *
 * @param buildings Сгенерированные здания.
 * @param couplings Causal coupling связи.
 * @returns Набор дуг для рендера.
 */
export function createCodeCityCausalArcs(
    buildings: ReadonlyArray<ICodeCityBuildingMesh>,
    couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor>,
): ReadonlyArray<ICodeCityCausalArc> {
    const buildingById = new Map<string, ICodeCityBuildingMesh>()
    for (const building of buildings) {
        buildingById.set(building.id, building)
    }

    const arcs: Array<ICodeCityCausalArc> = []
    for (const coupling of couplings) {
        const source = buildingById.get(coupling.sourceFileId)
        const target = buildingById.get(coupling.targetFileId)
        if (source === undefined || target === undefined) {
            continue
        }
        if (source.id === target.id) {
            continue
        }

        const normalizedStrength = Math.max(0.15, Math.min(1, coupling.strength))
        const start: TVec3 = [source.x, source.height + 0.16, source.z]
        const end: TVec3 = [target.x, target.height + 0.16, target.z]
        const planarDistance = Math.hypot(source.x - target.x, source.z - target.z)
        const lift = CAUSAL_ARC_BASE_LIFT + Math.min(8, planarDistance * 0.28)
        const control: TVec3 = [
            (start[0] + end[0]) / 2,
            Math.max(start[1], end[1]) + lift,
            (start[2] + end[2]) / 2,
        ]

        arcs.push({
            color: resolveCodeCityCausalArcColor(coupling.couplingType),
            control,
            couplingType: coupling.couplingType,
            end,
            particleSpeed: 0.25 + normalizedStrength * 0.55,
            sourceFileId: source.id,
            start,
            strength: normalizedStrength,
            targetFileId: target.id,
        })
    }

    return arcs
}

function interpolateQuadraticBezierPoint(
    start: TVec3,
    control: TVec3,
    end: TVec3,
    t: number,
): TVec3 {
    const inverse = 1 - t
    const x = inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0]
    const y = inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1]
    const z = inverse * inverse * start[2] + 2 * inverse * t * control[2] + t * t * end[2]
    return [x, y, z]
}

function sampleQuadraticBezierPath(
    start: TVec3,
    control: TVec3,
    end: TVec3,
): ReadonlyArray<TVec3> {
    const sampled: Array<TVec3> = []
    for (let segment = 0; segment <= CAUSAL_ARC_SEGMENTS; segment += 1) {
        const ratio = segment / CAUSAL_ARC_SEGMENTS
        sampled.push(interpolateQuadraticBezierPoint(start, control, end, ratio))
    }
    return sampled
}

/**
 * Строит breadcrumb trail в 3D пространстве по file-id цепочке root cause.
 *
 * @param buildings Доступные здания города.
 * @param chainFileIds Последовательность file-id из causal chain.
 * @returns Точки breadcrumb trail поверх зданий.
 */
export function createCodeCityNavigationTrail(
    buildings: ReadonlyArray<ICodeCityBuildingMesh>,
    chainFileIds: ReadonlyArray<string>,
): ReadonlyArray<TVec3> {
    const buildingById = new Map<string, ICodeCityBuildingMesh>()
    for (const building of buildings) {
        buildingById.set(building.id, building)
    }

    return chainFileIds
        .map((fileId): ICodeCityBuildingMesh | undefined => buildingById.get(fileId))
        .filter((building): building is ICodeCityBuildingMesh => building !== undefined)
        .map((building): TVec3 => {
            return [building.x, building.height + 0.35, building.z]
        })
}

/**
 * Рассчитывает бюджет рендера CodeCity по количеству зданий и наблюдаемому FPS.
 *
 * @param buildingCount Количество зданий в текущем snapshot.
 * @param sampledFps Сэмпл FPS за окно рендера.
 * @returns Профиль качества (LOD, instancing, dpr, culling).
 */
export function resolveCodeCityRenderBudget(
    buildingCount: number,
    sampledFps: number | undefined,
): ICodeCityRenderBudget {
    let quality: TCodeCityRenderQuality = "high"

    if (buildingCount > MEDIUM_QUALITY_MAX_BUILDINGS) {
        quality = "low"
    } else if (buildingCount > HIGH_QUALITY_MAX_BUILDINGS) {
        quality = "medium"
    }

    if (sampledFps !== undefined) {
        if (sampledFps < CRITICAL_FPS) {
            quality = "low"
        } else if (sampledFps < WARNING_FPS && quality === "high") {
            quality = "medium"
        }
    }

    if (quality === "high") {
        return {
            cullingRadius: LOW_QUALITY_MAX_BUILDINGS,
            dpr: [1, 1.5],
            maxInteractiveBuildings: LOW_QUALITY_MAX_BUILDINGS,
            quality,
            useInstancing: false,
        }
    }

    if (quality === "medium") {
        return {
            cullingRadius: 210,
            dpr: [0.95, 1.25],
            maxInteractiveBuildings: 180,
            quality,
            useInstancing: true,
        }
    }

    return {
        cullingRadius: 150,
        dpr: [0.75, 1],
        maxInteractiveBuildings: 100,
        quality,
        useInstancing: true,
    }
}

/**
 * Преобразует coverage файла в цвет здания.
 *
 * @param coverage Покрытие файла тестами в процентах.
 * @returns Hex-цвет для материала здания.
 */
export function resolveCodeCityBuildingColor(coverage: number | undefined): string {
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
 * Определяет параметры bug-emission эффекта по bug frequency файла.
 *
 * @param totalBugCount Общий объём bug events.
 * @param recentBugCount Объём багов за последние 7 дней.
 * @returns Профиль цвета, числа частиц и силы pulse.
 */
export function resolveCodeCityBugEmissionSettings(
    totalBugCount: number,
    recentBugCount: number,
): IBugEmissionSettings {
    if (totalBugCount >= 9) {
        return {
            color: "#ef4444",
            particleCount: 6,
            pulseStrength: recentBugCount > 0 ? 1 : 0.4,
        }
    }
    if (totalBugCount >= 5) {
        return {
            color: "#f97316",
            particleCount: 4,
            pulseStrength: recentBugCount > 0 ? 0.9 : 0.3,
        }
    }
    return {
        color: "#facc15",
        particleCount: 2,
        pulseStrength: recentBugCount > 0 ? 0.75 : 0.2,
    }
}

function resolveFileHealthScore(file: ICodeCity3DSceneFileDescriptor, totalBugCount: number): number {
    const coverage = file.coverage ?? 62
    const complexity = file.complexity ?? 8
    const complexityPenalty = Math.min(28, complexity * 1.05)
    const bugPenalty = Math.min(25, totalBugCount * 1.4)
    const rawScore = coverage - complexityPenalty - bugPenalty + 34
    return Math.max(5, Math.min(100, rawScore))
}

/**
 * Нормализует цвет health aura: red (degrading) -> green (healthy).
 *
 * @param healthScore Нормализованный health score района.
 * @returns HSL-цвет для district aura.
 */
export function resolveCodeCityHealthAuraColor(healthScore: number): string {
    const normalized = Math.max(0, Math.min(100, healthScore))
    const hue = (normalized / 100) * 120
    return `hsl(${String(Math.round(hue))} 86% 55%)`
}

/**
 * Вычисляет health aura профиль для каждого района и готовит данные для animated glow.
 *
 * @param districts Районы города.
 * @param buildings Список зданий с health-метаданными.
 * @returns Массив district aura descriptors.
 */
export function createCodeCityDistrictHealthAuras(
    districts: ReadonlyArray<ICodeCityDistrictMesh>,
    buildings: ReadonlyArray<ICodeCityBuildingMesh>,
): ReadonlyArray<ICodeCityDistrictHealthAura> {
    const buildingsByDistrict = new Map<string, Array<ICodeCityBuildingMesh>>()
    for (const building of buildings) {
        const districtBuildings = buildingsByDistrict.get(building.districtId)
        if (districtBuildings !== undefined) {
            districtBuildings.push(building)
            continue
        }
        buildingsByDistrict.set(building.districtId, [building])
    }

    return districts.map((district): ICodeCityDistrictHealthAura => {
        const districtBuildings = buildingsByDistrict.get(district.id) ?? []
        const averageHealth =
            districtBuildings.length === 0
                ? 50
                : districtBuildings.reduce((sum, building): number => {
                    return sum + building.healthScore
                }, 0) / districtBuildings.length
        return {
            color: resolveCodeCityHealthAuraColor(averageHealth),
            depth: district.depth,
            districtId: district.id,
            healthScore: averageHealth,
            pulseSpeed: 1.4 + (100 - averageHealth) / 120,
            width: district.width,
            x: district.x,
            z: district.z,
        }
    })
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
            .map((candidate): { readonly building: ICodeCityBuildingMesh; readonly distance: number } => {
                return {
                    building: candidate,
                    distance: Math.hypot(candidate.x - origin.x, candidate.z - origin.z),
                }
            })
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

/**
 * Возвращает visual-профиль здания по impact-состоянию.
 *
 * @param impactState Текущее состояние impact-подсветки.
 * @returns Параметры emissive/pulse/ripple анимации.
 */
export function resolveCodeCityBuildingImpactProfile(
    impactState: TCodeCityBuildingImpactState,
): ICodeCityBuildingImpactProfile {
    if (impactState === "changed") {
        return {
            baseIntensity: 0.3,
            emissive: "#fb7185",
            pulseAmplitude: 0.52,
            pulseSpeed: 3.8,
            rippleLift: 0,
        }
    }

    if (impactState === "impacted") {
        return {
            baseIntensity: 0.25,
            emissive: "#22d3ee",
            pulseAmplitude: 0.38,
            pulseSpeed: 3.1,
            rippleLift: 0,
        }
    }

    if (impactState === "ripple") {
        return {
            baseIntensity: 0.12,
            emissive: "#38bdf8",
            pulseAmplitude: 0.22,
            pulseSpeed: 2.4,
            rippleLift: 0.16,
        }
    }

    return {
        baseIntensity: 0,
        emissive: "#0f172a",
        pulseAmplitude: 0,
        pulseSpeed: 0,
        rippleLift: 0,
    }
}

/**
 * Рассчитывает целевое положение камеры для выбранного пресета.
 *
 * @param preset Выбранный пресет камеры.
 * @param focusBuilding Опорное здание для focus-режима.
 * @returns Целевые координаты камеры и фокуса.
 */
function resolveCameraPresetTarget(
    preset: TCodeCityCameraPreset,
    focusBuilding: ICodeCityBuildingMesh | undefined,
): ICameraPresetTarget {
    if (preset !== "focus-on-building" || focusBuilding === undefined) {
        return BASE_CAMERA_PRESETS[preset]
    }

    return {
        focus: [
            focusBuilding.x,
            Math.max(1.5, focusBuilding.height / 2),
            focusBuilding.z,
        ] as const,
        position: [
            focusBuilding.x + 8,
            Math.max(7, focusBuilding.height + 4),
            focusBuilding.z + 8,
        ] as const,
    }
}

interface ICameraPresetControllerProps {
    readonly controlsRef: { current: IOrbitControlsLike | null }
    readonly target: ICameraPresetTarget
}

/**
 * Плавно анимирует камеру и target OrbitControls к выбранному пресету.
 *
 * @param props Целевые координаты и ref controls.
 * @returns null (служебный scene-controller).
 */
function CameraPresetController(props: ICameraPresetControllerProps): null {
    const { camera } = useThree()
    const targetPosition = useMemo((): Vector3 => new Vector3(...props.target.position), [props.target])
    const targetFocus = useMemo((): Vector3 => new Vector3(...props.target.focus), [props.target])

    useFrame((): void => {
        camera.position.lerp(targetPosition, CAMERA_LERP_FACTOR)
        const controls = props.controlsRef.current
        if (controls !== null) {
            controls.target.lerp(targetFocus, CAMERA_LERP_FACTOR)
            controls.update()
            return
        }
        camera.lookAt(targetFocus)
    })

    return null
}

interface IRenderPerformanceControllerProps {
    readonly onSample: (fps: number) => void
}

/**
 * Сэмплирует FPS и сообщает его в renderer для адаптивной деградации качества.
 *
 * @param props Callback получения текущего FPS.
 * @returns null (служебный controller).
 */
function RenderPerformanceController(props: IRenderPerformanceControllerProps): null {
    const frameCountRef = useRef<number>(0)
    const elapsedRef = useRef<number>(0)

    useFrame((_, delta): void => {
        frameCountRef.current += 1
        elapsedRef.current += delta
        if (elapsedRef.current < PERFORMANCE_SAMPLE_WINDOW_SECONDS) {
            return
        }

        const fps = frameCountRef.current / Math.max(elapsedRef.current, 1e-6)
        props.onSample(fps)
        frameCountRef.current = 0
        elapsedRef.current = 0
    })

    return null
}

interface IInstancedBuildingsMeshProps {
    readonly buildings: ReadonlyArray<ICodeCityBuildingMesh>
}

interface ICausalArcMeshProps {
    readonly arc: ICodeCityCausalArc
    readonly phaseSeed: number
}

/**
 * Рендерит причинно-следственную дугу с анимированным particle-flow.
 *
 * @param props Параметры дуги.
 * @returns Группа с линией и движущимся particle.
 */
function CausalArcMesh(props: ICausalArcMeshProps): ReactElement {
    const particleRef = useRef<Mesh | null>(null)
    const linePoints = useMemo((): ReadonlyArray<Vector3> => {
        return sampleQuadraticBezierPath(props.arc.start, props.arc.control, props.arc.end).map(
            (point): Vector3 => new Vector3(...point),
        )
    }, [props.arc.control, props.arc.end, props.arc.start])

    useFrame((state): void => {
        const flowPhase = (state.clock.getElapsedTime() * props.arc.particleSpeed + props.phaseSeed) % 1
        const point = interpolateQuadraticBezierPoint(
            props.arc.start,
            props.arc.control,
            props.arc.end,
            flowPhase,
        )
        const particle = particleRef.current
        if (particle === null) {
            return
        }
        particle.position.set(point[0], point[1], point[2])
    })

    return (
        <group>
            <Line
                color={props.arc.color}
                lineWidth={1 + props.arc.strength * 1.8}
                opacity={0.35 + props.arc.strength * 0.45}
                points={linePoints}
                transparent={true}
            />
            <mesh ref={particleRef}>
                <sphereGeometry args={[0.08 + props.arc.strength * 0.1, 8, 8]} />
                <meshStandardMaterial
                    color={props.arc.color}
                    emissive={props.arc.color}
                    emissiveIntensity={0.8}
                    toneMapped={false}
                />
            </mesh>
        </group>
    )
}

/**
 * Рендерит неинтерактивный хвост зданий через instanced mesh для экономии draw calls.
 *
 * @param props Набор зданий для пакетного рендера.
 * @returns Instanced mesh контейнер.
 */
function InstancedBuildingsMesh(props: IInstancedBuildingsMeshProps): ReactElement | null {
    const meshRef = useRef<InstancedMesh | null>(null)
    const matrix = useMemo((): Matrix4 => new Matrix4(), [])
    const dummy = useMemo((): Object3D => new Object3D(), [])

    useEffect((): void => {
        const mesh = meshRef.current
        if (mesh === null) {
            return
        }

        for (let index = 0; index < props.buildings.length; index += 1) {
            const building = props.buildings[index]
            if (building === undefined) {
                continue
            }

            dummy.position.set(building.x, building.height / 2, building.z)
            dummy.scale.set(building.width, building.height, building.depth)
            dummy.updateMatrix()
            matrix.copy(dummy.matrix)
            mesh.setMatrixAt(index, matrix)
            mesh.setColorAt(index, new Color(building.color))
        }

        mesh.count = props.buildings.length
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor !== null) {
            mesh.instanceColor.needsUpdate = true
        }
    }, [dummy, matrix, props.buildings])

    if (props.buildings.length === 0) {
        return null
    }

    return (
        <instancedMesh args={[undefined, undefined, props.buildings.length]} frustumCulled={true} ref={meshRef}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial metalness={0.05} roughness={0.68} vertexColors={true} />
        </instancedMesh>
    )
}

interface IBugEmissionMeshProps {
    readonly building: ICodeCityBuildingMesh
    readonly settings: IBugEmissionSettings
}

/**
 * Рендерит эмиссию багов: поток частиц над зданием и pulse-ring при recent bugs.
 *
 * @param props Целевое здание и профиль эмиссии.
 * @returns Группа bug-emission эффектов.
 */
function BugEmissionMesh(props: IBugEmissionMeshProps): ReactElement {
    const particleRefs = useRef<Array<Mesh | null>>([])
    const pulseRef = useRef<Mesh | null>(null)
    const particleOffsets = useMemo((): ReadonlyArray<{
        readonly phaseSeed: number
        readonly radius: number
        readonly speed: number
    }> => {
        return Array.from({ length: props.settings.particleCount }, (_value, index) => {
            return {
                phaseSeed: index * 0.8,
                radius: 0.16 + (index % 3) * 0.07,
                speed: 1 + index * 0.12,
            }
        })
    }, [props.settings.particleCount])

    useFrame((state): void => {
        const elapsed = state.clock.getElapsedTime()
        const baseY = props.building.height + 0.14
        const verticalRange = 0.55 + props.settings.particleCount * 0.11

        particleOffsets.forEach((offset, index): void => {
            const particle = particleRefs.current[index]
            if (particle === null || particle === undefined) {
                return
            }

            const phase = elapsed * offset.speed + offset.phaseSeed
            const normalized = (Math.sin(phase) + 1) / 2
            const orbitX = Math.cos(phase) * offset.radius
            const orbitZ = Math.sin(phase) * offset.radius
            particle.position.set(
                props.building.x + orbitX,
                baseY + normalized * verticalRange,
                props.building.z + orbitZ,
            )
            const scale = 0.65 + normalized * 0.45
            particle.scale.set(scale, scale, scale)
        })

        if (props.building.recentBugCount <= 0) {
            return
        }

        const pulseMesh = pulseRef.current
        if (pulseMesh === null) {
            return
        }
        const pulse = (Math.sin(elapsed * 2.4) + 1) / 2
        const scale = 1 + pulse * props.settings.pulseStrength * 1.5
        pulseMesh.position.set(props.building.x, props.building.height + 0.06, props.building.z)
        pulseMesh.scale.set(scale, scale, scale)
    })

    return (
        <group>
            {particleOffsets.map((offset, index): ReactElement => (
                <mesh
                    key={`${props.building.id}-bug-particle-${String(index)}`}
                    ref={(mesh): void => {
                        particleRefs.current[index] = mesh
                    }}
                >
                    <sphereGeometry args={[0.08, 8, 8]} />
                    <meshStandardMaterial
                        color={props.settings.color}
                        emissive={props.settings.color}
                        emissiveIntensity={0.85}
                        opacity={0.7}
                        toneMapped={false}
                        transparent={true}
                    />
                </mesh>
            ))}
            {props.building.recentBugCount > 0 ? (
                <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.28, 0.44, 24]} />
                    <meshBasicMaterial color={props.settings.color} opacity={0.28} transparent={true} />
                </mesh>
            ) : null}
        </group>
    )
}

interface IDistrictHealthAuraMeshProps {
    readonly aura: ICodeCityDistrictHealthAura
    readonly phaseSeed: number
}

/**
 * Рендерит district health aura: цвет по score и плавный pulse во времени.
 *
 * @param props Параметры aura района.
 * @returns Полупрозрачный glow-пласт.
 */
function DistrictHealthAuraMesh(props: IDistrictHealthAuraMeshProps): ReactElement {
    const meshRef = useRef<Mesh | null>(null)
    const materialRef = useRef<MeshBasicMaterial | null>(null)
    const baseOpacity = 0.1 + (100 - props.aura.healthScore) / 260

    useFrame((state): void => {
        const wave = (Math.sin(state.clock.getElapsedTime() * props.aura.pulseSpeed + props.phaseSeed) + 1) / 2
        const mesh = meshRef.current
        if (mesh !== null) {
            const scale = 1 + wave * 0.14
            mesh.scale.set(scale, scale, 1)
        }

        const material = materialRef.current
        if (material !== null) {
            material.opacity = Math.min(0.4, baseOpacity + wave * 0.16)
        }
    })

    return (
        <mesh
            position={[props.aura.x, 0.03, props.aura.z]}
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
        >
            <planeGeometry args={[props.aura.width * 1.05, props.aura.depth * 1.05]} />
            <meshBasicMaterial
                color={props.aura.color}
                depthWrite={false}
                opacity={baseOpacity}
                ref={materialRef}
                transparent={true}
            />
        </mesh>
    )
}

interface IImpactBuildingMeshProps {
    readonly building: ICodeCityBuildingMesh
    readonly impactState: TCodeCityBuildingImpactState
    readonly phaseSeed: number
    readonly isSelected: boolean
    readonly onHover?: (fileId: string | undefined) => void
    readonly onSelect?: (fileId: string | undefined) => void
}

/**
 * Рендерит здание CodeCity с impact-анимацией glow/pulse/ripple.
 *
 * @param props Конфигурация здания и impact-состояния.
 * @returns Меш здания.
 */
function ImpactBuildingMesh(props: IImpactBuildingMeshProps): ReactElement {
    const meshRef = useRef<Mesh | null>(null)
    const materialRef = useRef<MeshStandardMaterial | null>(null)
    const impactProfile = useMemo(
        (): ICodeCityBuildingImpactProfile => {
            return resolveCodeCityBuildingImpactProfile(props.impactState)
        },
        [props.impactState],
    )
    const baseY = props.building.height / 2

    useFrame((state): void => {
        const animationPhase = state.clock.getElapsedTime() * impactProfile.pulseSpeed + props.phaseSeed
        const material = materialRef.current
        if (material !== null) {
            const pulseOffset =
                impactProfile.pulseAmplitude > 0
                    ? Math.sin(animationPhase) * impactProfile.pulseAmplitude
                    : 0
            material.emissiveIntensity = Math.max(0, impactProfile.baseIntensity + pulseOffset)
        }

        const mesh = meshRef.current
        if (mesh === null) {
            return
        }

        if (impactProfile.rippleLift <= 0) {
            mesh.position.y = baseY
            return
        }

        const rippleWave = Math.sin(animationPhase) * impactProfile.rippleLift
        mesh.position.y = baseY + Math.max(0, rippleWave)
    })

    return (
        <mesh
            key={props.building.id}
            onClick={(event: ThreeEvent<MouseEvent>): void => {
                event.stopPropagation()
                props.onSelect?.(props.building.id)
            }}
            onPointerOut={(event: ThreeEvent<PointerEvent>): void => {
                event.stopPropagation()
                props.onHover?.(undefined)
            }}
            onPointerOver={(event: ThreeEvent<PointerEvent>): void => {
                event.stopPropagation()
                props.onHover?.(props.building.id)
            }}
            position={[props.building.x, baseY, props.building.z]}
            ref={meshRef}
        >
            <boxGeometry
                args={[
                    props.isSelected ? props.building.width * 1.08 : props.building.width,
                    props.building.height,
                    props.isSelected ? props.building.depth * 1.08 : props.building.depth,
                ]}
            />
            <meshStandardMaterial
                color={props.building.color}
                emissive={impactProfile.emissive}
                emissiveIntensity={
                    props.isSelected ? Math.max(impactProfile.baseIntensity, 0.55) : impactProfile.baseIntensity
                }
                metalness={0.1}
                ref={materialRef}
                roughness={0.6}
            />
        </mesh>
    )
}

/**
 * 3D renderer для CodeCity: базовая сцена + здания файлов.
 *
 * @param props Данные файлов для генерации города.
 * @returns Canvas с orbit/pan/zoom контролами.
 */
export function CodeCity3DSceneRenderer(props: ICodeCity3DSceneRendererProps): ReactElement {
    const controlsRef = useRef<IOrbitControlsLike | null>(null)
    const [buildings, setBuildings] = useState<ReadonlyArray<ICodeCityBuildingMesh>>([])
    const [districts, setDistricts] = useState<ReadonlyArray<ICodeCityDistrictMesh>>([])
    const [sampledFps, setSampledFps] = useState<number | undefined>(undefined)

    useEffect((): (() => void) => {
        if (props.files.length === 0) {
            setBuildings([])
            setDistricts([])
            return (): void => {
                return
            }
        }

        const layoutWorker = createCodeCityLayoutWorker()
        if (layoutWorker === undefined) {
            setDistricts(createCodeCityDistrictMeshes(props.files))
            setBuildings(createCodeCityBuildingMeshes(props.files))
            return (): void => {
                return
            }
        }

        let disposed = false
        const handleMessage = (event: Event): void => {
            const messageEvent = event as MessageEvent<ICodeCityLayoutWorkerResponse>
            if (disposed || messageEvent.data.type !== "layout") {
                return
            }
            setBuildings(messageEvent.data.buildings)
            setDistricts(messageEvent.data.districts)
        }
        const handleError = (): void => {
            if (disposed) {
                return
            }
            setDistricts(createCodeCityDistrictMeshes(props.files))
            setBuildings(createCodeCityBuildingMeshes(props.files))
        }

        layoutWorker.addEventListener("message", handleMessage)
        layoutWorker.addEventListener("error", handleError)
        layoutWorker.postMessage({
            files: props.files,
        } satisfies ICodeCityLayoutWorkerRequest)

        return (): void => {
            disposed = true
            layoutWorker.removeEventListener("message", handleMessage)
            layoutWorker.removeEventListener("error", handleError)
            layoutWorker.terminate()
        }
    }, [props.files])
    const impactMap = useMemo((): ReadonlyMap<string, TCodeCityImpactType> => {
        return createCodeCityBuildingImpactMap(buildings, props.impactedFiles)
    }, [buildings, props.impactedFiles])
    const renderBudget = useMemo((): ICodeCityRenderBudget => {
        return resolveCodeCityRenderBudget(buildings.length, sampledFps)
    }, [buildings.length, sampledFps])
    const causalArcs = useMemo((): ReadonlyArray<ICodeCityCausalArc> => {
        return createCodeCityCausalArcs(buildings, props.causalCouplings)
    }, [buildings, props.causalCouplings])
    const visibleCausalArcs = useMemo((): ReadonlyArray<ICodeCityCausalArc> => {
        const maxArcs =
            renderBudget.quality === "low" ? MAX_CAUSAL_ARCS_LOW_QUALITY : MAX_CAUSAL_ARCS_HIGH_QUALITY
        return causalArcs.slice(0, maxArcs)
    }, [causalArcs, renderBudget.quality])
    const districtHealthAuras = useMemo((): ReadonlyArray<ICodeCityDistrictHealthAura> => {
        return createCodeCityDistrictHealthAuras(districts, buildings)
    }, [buildings, districts])
    const navigationTrail = useMemo((): ReadonlyArray<TVec3> => {
        return createCodeCityNavigationTrail(buildings, props.navigationChainFileIds)
    }, [buildings, props.navigationChainFileIds])
    const navigationTrailVectors = useMemo((): ReadonlyArray<Vector3> => {
        return navigationTrail.map((point): Vector3 => new Vector3(...point))
    }, [navigationTrail])
    const visibleBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        return buildings.filter((building): boolean => {
            return Math.hypot(building.x, building.z) <= renderBudget.cullingRadius
        })
    }, [buildings, renderBudget.cullingRadius])
    const interactiveBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        if (renderBudget.useInstancing === false) {
            return visibleBuildings
        }

        const prioritized = visibleBuildings.filter((building): boolean => {
            if (props.selectedFileId === building.id) {
                return true
            }
            const impactState = impactMap.get(building.id)
            return impactState === "changed" || impactState === "impacted"
        })
        const remaining = visibleBuildings.filter((building): boolean => {
            return prioritized.some((priorityBuilding): boolean => priorityBuilding.id === building.id) === false
        })
        return [...prioritized, ...remaining].slice(0, renderBudget.maxInteractiveBuildings)
    }, [
        impactMap,
        props.selectedFileId,
        renderBudget.maxInteractiveBuildings,
        renderBudget.useInstancing,
        visibleBuildings,
    ])
    const interactiveBuildingIds = useMemo((): ReadonlySet<string> => {
        return new Set(interactiveBuildings.map((building): string => building.id))
    }, [interactiveBuildings])
    const instancedBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        if (renderBudget.useInstancing === false) {
            return []
        }
        return visibleBuildings.filter((building): boolean => {
            return interactiveBuildingIds.has(building.id) === false
        })
    }, [interactiveBuildingIds, renderBudget.useInstancing, visibleBuildings])
    const bugEmissionBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        return interactiveBuildings
            .filter((building): boolean => building.totalBugCount > 0)
            .sort((leftBuilding, rightBuilding): number => {
                return rightBuilding.totalBugCount - leftBuilding.totalBugCount
            })
            .slice(0, MAX_BUG_EMISSION_CLOUDS)
    }, [interactiveBuildings])
    const focusBuilding = useMemo((): ICodeCityBuildingMesh | undefined => {
        if (props.navigationActiveFileId !== undefined) {
            return buildings.find((building): boolean => building.id === props.navigationActiveFileId)
        }
        if (props.selectedFileId !== undefined) {
            return buildings.find((building): boolean => building.id === props.selectedFileId)
        }
        return buildings.at(0)
    }, [buildings, props.navigationActiveFileId, props.selectedFileId])
    const cameraPresetTarget = useMemo((): ICameraPresetTarget => {
        return resolveCameraPresetTarget(props.cameraPreset, focusBuilding)
    }, [focusBuilding, props.cameraPreset])

    return (
        <Canvas camera={{ fov: 45, position: [30, 26, 30] }} dpr={renderBudget.dpr} shadows={false}>
            <CameraPresetController controlsRef={controlsRef} target={cameraPresetTarget} />
            <RenderPerformanceController
                onSample={(fps): void => {
                    setSampledFps(Math.round(fps))
                }}
            />
            <color args={["#020617"]} attach="background" />
            <ambientLight intensity={0.55} />
            <directionalLight intensity={0.9} position={[18, 30, 12]} />
            <gridHelper args={[100, 80, "#334155", "#1e293b"]} visible={renderBudget.quality !== "low"} />
            {districts.map((district): ReactElement => (
                <group key={`district-${district.id}`}>
                    <mesh position={[district.x, -0.03, district.z]}>
                        <boxGeometry args={[district.width, 0.06, district.depth]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.02} roughness={0.92} />
                    </mesh>
                    <Text
                        anchorX="center"
                        anchorY="middle"
                        color="#94a3b8"
                        fontSize={Math.max(0.38, Math.min(0.95, district.width / 6))}
                        position={[district.x, 0.04, district.z]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        {district.label}
                    </Text>
                </group>
            ))}
            {districtHealthAuras.map((aura, index): ReactElement => (
                <DistrictHealthAuraMesh
                    aura={aura}
                    key={`${aura.districtId}-health-aura`}
                    phaseSeed={index * 0.44}
                />
            ))}
            {navigationTrailVectors.length >= 2 ? (
                <Line
                    color="#e2e8f0"
                    dashScale={2}
                    dashSize={0.3}
                    dashed={true}
                    gapSize={0.18}
                    lineWidth={1.2}
                    opacity={0.8}
                    points={navigationTrailVectors}
                    transparent={true}
                />
            ) : null}
            {navigationTrail.map((point, index): ReactElement => (
                <mesh key={`breadcrumb-${String(index)}`} position={[point[0], point[1], point[2]]}>
                    <sphereGeometry args={[0.16, 10, 10]} />
                    <meshStandardMaterial
                        color="#f8fafc"
                        emissive="#bae6fd"
                        emissiveIntensity={0.9}
                        toneMapped={false}
                    />
                </mesh>
            ))}
            {visibleCausalArcs.map((arc, index): ReactElement => (
                <CausalArcMesh
                    arc={arc}
                    key={`${arc.sourceFileId}-${arc.targetFileId}-${arc.couplingType}`}
                    phaseSeed={index * 0.31}
                />
            ))}
            {bugEmissionBuildings.map((building): ReactElement => (
                <BugEmissionMesh
                    building={building}
                    key={`${building.id}-bug-emission`}
                    settings={resolveCodeCityBugEmissionSettings(
                        building.totalBugCount,
                        building.recentBugCount,
                    )}
                />
            ))}
            {interactiveBuildings.map((building, index): ReactElement => (
                <ImpactBuildingMesh
                    building={building}
                    impactState={impactMap.get(building.id) ?? "none"}
                    isSelected={props.selectedFileId === building.id}
                    key={building.id}
                    onHover={props.onBuildingHover}
                    onSelect={props.onBuildingSelect}
                    phaseSeed={index * 0.45}
                />
            ))}
            <InstancedBuildingsMesh buildings={instancedBuildings} />
            <OrbitControls
                enablePan={true}
                enableRotate={true}
                enableZoom={true}
                makeDefault={true}
                ref={(controls): void => {
                    controlsRef.current = controls as unknown as IOrbitControlsLike | null
                }}
            />
        </Canvas>
    )
}
