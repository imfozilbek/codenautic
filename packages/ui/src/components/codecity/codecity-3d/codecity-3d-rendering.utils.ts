import { BASE_CAMERA_PRESETS } from "./codecity-scene-constants"
import type {
    ICameraPresetTarget,
    ICodeCity3DSceneRendererProps,
    ICodeCityBuildingMesh,
} from "./codecity-scene-types"
import {
    FOCUS_PRESET_CAMERA_HEIGHT_PADDING,
    FOCUS_PRESET_CAMERA_OFFSET,
    FOCUS_PRESET_MIN_CAMERA_HEIGHT,
    FOCUS_PRESET_MIN_FOCUS_HEIGHT,
} from "./codecity-3d-rendering.constants"

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
        return new Worker(new URL("../codecity-3d-layout.worker.ts", import.meta.url), {
            type: "module",
        })
    } catch {
        return undefined
    }
}

/**
 * Рассчитывает целевое положение камеры для выбранного пресета.
 *
 * Для пресета `"focus-on-building"` вычисляет позицию на основе координат
 * и высоты целевого здания. Для остальных пресетов возвращает базовые
 * координаты из `BASE_CAMERA_PRESETS`.
 *
 * @param preset Выбранный пресет камеры.
 * @param focusBuilding Опорное здание для focus-режима.
 * @returns Целевые координаты камеры и фокуса.
 */
export function resolveCameraPresetTarget(
    preset: ICodeCity3DSceneRendererProps["cameraPreset"],
    focusBuilding: ICodeCityBuildingMesh | undefined,
): ICameraPresetTarget {
    if (preset !== "focus-on-building" || focusBuilding === undefined) {
        return BASE_CAMERA_PRESETS[preset]
    }

    return {
        focus: [
            focusBuilding.x,
            Math.max(FOCUS_PRESET_MIN_FOCUS_HEIGHT, focusBuilding.height / 2),
            focusBuilding.z,
        ] as const,
        position: [
            focusBuilding.x + FOCUS_PRESET_CAMERA_OFFSET,
            Math.max(
                FOCUS_PRESET_MIN_CAMERA_HEIGHT,
                focusBuilding.height + FOCUS_PRESET_CAMERA_HEIGHT_PADDING,
            ),
            focusBuilding.z + FOCUS_PRESET_CAMERA_OFFSET,
        ] as const,
    }
}
