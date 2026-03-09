import type { Vector3 } from "three"

import type {
    ICodeCity3DCausalCouplingDescriptor,
    ICodeCity3DSceneFileDescriptor,
    ICodeCity3DSceneImpactedFileDescriptor,
    TCodeCityCausalCouplingType,
    TCodeCityCameraPreset,
    TCodeCityImpactType,
} from "../codecity-3d-scene"

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

/**
 * Прямоугольник treemap-контейнера.
 */
export interface ICodeCityTreemapRect {
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
}

/**
 * Элемент района перед layout: файлы, вес и label.
 */
export interface ICodeCityDistrictItem {
    readonly id: string
    readonly label: string
    readonly weight: number
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

/**
 * Район с рассчитанной площадью и позицией.
 */
export interface ICodeCityDistrictLayout extends ICodeCityDistrictMesh {
    readonly area: number
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

/**
 * Минимальный интерфейс OrbitControls для камеры.
 */
export interface IOrbitControlsLike {
    readonly target: Vector3
    update: () => void
}

/**
 * Тройка чисел для 3D-координат.
 */
export type TVec3 = readonly [number, number, number]

/**
 * Состояние impact-подсветки здания.
 */
export type TCodeCityBuildingImpactState = TCodeCityImpactType | "none"

/**
 * Уровень качества рендеринга CodeCity.
 */
export type TCodeCityRenderQuality = "high" | "medium" | "low"

/**
 * Целевые координаты камеры и фокуса для пресета.
 */
export interface ICameraPresetTarget {
    readonly position: TVec3
    readonly focus: TVec3
}

/**
 * Visual-профиль здания по impact-состоянию.
 */
export interface ICodeCityBuildingImpactProfile {
    readonly emissive: string
    readonly baseIntensity: number
    readonly pulseAmplitude: number
    readonly pulseSpeed: number
    readonly rippleLift: number
}

/**
 * Бюджет рендера CodeCity: LOD, instancing, dpr, culling.
 */
export interface ICodeCityRenderBudget {
    readonly quality: TCodeCityRenderQuality
    readonly useInstancing: boolean
    readonly maxInteractiveBuildings: number
    readonly dpr: [number, number]
    readonly cullingRadius: number
}

/**
 * Параметры causal-дуги для 3D overlay.
 */
export interface ICodeCityCausalArc {
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

/**
 * Параметры bug-emission эффекта.
 */
export interface IBugEmissionSettings {
    readonly color: string
    readonly particleCount: number
    readonly pulseStrength: number
}

/**
 * Health aura профиль для района CodeCity.
 */
export interface ICodeCityDistrictHealthAura {
    readonly districtId: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
    readonly healthScore: number
    readonly color: string
    readonly pulseSpeed: number
}

/**
 * Запрос к layout worker.
 */
export interface ICodeCityLayoutWorkerRequest {
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

/**
 * Ответ от layout worker.
 */
export interface ICodeCityLayoutWorkerResponse {
    readonly type: "layout"
    readonly buildings: ReadonlyArray<ICodeCityBuildingMesh>
    readonly districts: ReadonlyArray<ICodeCityDistrictMesh>
}

/**
 * Props для 3D renderer CodeCity.
 */
export interface ICodeCity3DSceneRendererProps {
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
