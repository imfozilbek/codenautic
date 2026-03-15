import type {
    ICodeCity3DCausalCouplingDescriptor,
    TCodeCityCausalCouplingType,
} from "../codecity-3d-scene"

import { CODECITY_PALETTE } from "@/lib/constants/codecity-colors"

import { CAUSAL_ARC_BASE_LIFT, CAUSAL_ARC_SEGMENTS } from "./codecity-scene-constants"
import type { ICodeCityCausalArc, ICodeCityBuildingMesh, TVec3 } from "./codecity-scene-types"

/**
 * Возвращает цвет causal-дуги по типу coupling-связи.
 *
 * @param couplingType Категория причинной связи.
 * @returns Hex-цвет линии и particle-flow.
 */
export function resolveCodeCityCausalArcColor(couplingType: TCodeCityCausalCouplingType): string {
    if (couplingType === "dependency") {
        return CODECITY_PALETTE.causal.dependency
    }
    if (couplingType === "ownership") {
        return CODECITY_PALETTE.causal.ownership
    }
    return CODECITY_PALETTE.causal.default
}

/**
 * Интерполирует точку на квадратичной Bezier-кривой.
 *
 * @param start Начальная точка.
 * @param control Контрольная точка.
 * @param end Конечная точка.
 * @param t Параметр интерполяции [0..1].
 * @returns Координаты точки на кривой.
 */
export function interpolateQuadraticBezierPoint(
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

/**
 * Сэмплирует набор точек вдоль квадратичной Bezier-кривой.
 *
 * @param start Начальная точка.
 * @param control Контрольная точка.
 * @param end Конечная точка.
 * @returns Массив точек вдоль кривой.
 */
export function sampleQuadraticBezierPath(
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
