import type { TCodeCityCameraPreset } from "../codecity-3d-scene"

import type { ICameraPresetTarget } from "./codecity-scene-types"

/**
 * Минимальная ширина здания (по complexity).
 */
export const MIN_BUILDING_WIDTH = 1

/**
 * Максимальная ширина здания (по complexity).
 */
export const MAX_BUILDING_WIDTH = 3.4

/**
 * Минимальная renderable ширина здания для видимости.
 */
export const MIN_RENDERABLE_BUILDING_WIDTH = 0.6

/**
 * Минимальная renderable глубина здания для видимости.
 */
export const MIN_RENDERABLE_BUILDING_DEPTH = 0.6

/**
 * Минимальная высота здания.
 */
export const MIN_BUILDING_HEIGHT = 1.2

/**
 * Соотношение complexity к ширине здания.
 */
export const COMPLEXITY_TO_WIDTH_RATIO = 8

/**
 * Соотношение LOC к высоте здания.
 */
export const LOC_TO_HEIGHT_RATIO = 24

/**
 * Отступ внутри района до зданий.
 */
export const DISTRICT_PADDING = 1.1

/**
 * Коэффициент заполнения ячейки зданием.
 */
export const BUILDING_FILL_RATIO = 0.72

/**
 * Минимальный span treemap-canvas.
 */
export const MIN_DISTRICT_SPAN = 24

/**
 * Фактор lerp-интерполяции камеры.
 */
export const CAMERA_LERP_FACTOR = 0.12

/**
 * Количество ripple-соседей вокруг impact origin.
 */
export const IMPACT_NEIGHBOR_COUNT = 2

/**
 * Порог зданий для высокого качества.
 */
export const HIGH_QUALITY_MAX_BUILDINGS = 220

/**
 * Порог зданий для среднего качества.
 */
export const MEDIUM_QUALITY_MAX_BUILDINGS = 480

/**
 * Порог зданий для низкого качества.
 */
export const LOW_QUALITY_MAX_BUILDINGS = 900

/**
 * Окно сэмплирования FPS в секундах.
 */
export const PERFORMANCE_SAMPLE_WINDOW_SECONDS = 1

/**
 * Целевой FPS.
 */
export const TARGET_FPS = 60

/**
 * Пороговый FPS для предупреждения.
 */
export const WARNING_FPS = TARGET_FPS - 10

/**
 * Критический порог FPS.
 */
export const CRITICAL_FPS = TARGET_FPS - 22

/**
 * Базовый подъём causal-дуги.
 */
export const CAUSAL_ARC_BASE_LIFT = 1.8

/**
 * Количество сегментов Bezier-кривой дуги.
 */
export const CAUSAL_ARC_SEGMENTS = 20

/**
 * Лимит causal-дуг при высоком качестве.
 */
export const MAX_CAUSAL_ARCS_HIGH_QUALITY = 42

/**
 * Лимит causal-дуг при низком качестве.
 */
export const MAX_CAUSAL_ARCS_LOW_QUALITY = 16

/**
 * Лимит bug-emission облаков.
 */
export const MAX_BUG_EMISSION_CLOUDS = 80

/**
 * Базовые пресеты камеры для каждого режима.
 */
export const BASE_CAMERA_PRESETS: Readonly<Record<TCodeCityCameraPreset, ICameraPresetTarget>> = {
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
