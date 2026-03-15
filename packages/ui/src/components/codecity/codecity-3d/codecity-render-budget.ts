import {
    CRITICAL_FPS,
    HIGH_QUALITY_MAX_BUILDINGS,
    LOW_QUALITY_MAX_BUILDINGS,
    MEDIUM_QUALITY_MAX_BUILDINGS,
    WARNING_FPS,
} from "./codecity-scene-constants"
import type { ICodeCityRenderBudget, TCodeCityRenderQuality } from "./codecity-scene-types"

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
