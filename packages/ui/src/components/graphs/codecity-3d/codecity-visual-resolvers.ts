import {
    BUILDING_COLOR_CRITICAL_COVERAGE,
    BUILDING_COLOR_HIGH_COVERAGE,
    BUILDING_COLOR_LOW_COVERAGE,
    BUILDING_COLOR_MEDIUM_COVERAGE,
    BUILDING_COLOR_UNDEFINED_COVERAGE,
    BUG_EMISSION_COLOR_HIGH,
    BUG_EMISSION_COLOR_LOW,
    BUG_EMISSION_COLOR_MEDIUM,
    IMPACT_EMISSIVE_CHANGED,
    IMPACT_EMISSIVE_IMPACTED,
    IMPACT_EMISSIVE_NEUTRAL,
    IMPACT_EMISSIVE_RIPPLE,
} from "@/lib/constants/codecity-colors"

import type {
    IBugEmissionSettings,
    ICodeCityBuildingImpactProfile,
    ICodeCityBuildingMesh,
    ICodeCityDistrictHealthAura,
    ICodeCityDistrictMesh,
    TCodeCityBuildingImpactState,
} from "./codecity-scene-types"

/**
 * Преобразует coverage файла в цвет здания.
 *
 * @param coverage Покрытие файла тестами в процентах.
 * @returns Hex-цвет для материала здания.
 */
export function resolveCodeCityBuildingColor(coverage: number | undefined): string {
    if (coverage === undefined) {
        return BUILDING_COLOR_UNDEFINED_COVERAGE
    }
    if (coverage >= 85) {
        return BUILDING_COLOR_HIGH_COVERAGE
    }
    if (coverage >= 65) {
        return BUILDING_COLOR_MEDIUM_COVERAGE
    }
    if (coverage >= 45) {
        return BUILDING_COLOR_LOW_COVERAGE
    }
    return BUILDING_COLOR_CRITICAL_COVERAGE
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
            color: BUG_EMISSION_COLOR_HIGH,
            particleCount: 6,
            pulseStrength: recentBugCount > 0 ? 1 : 0.4,
        }
    }
    if (totalBugCount >= 5) {
        return {
            color: BUG_EMISSION_COLOR_MEDIUM,
            particleCount: 4,
            pulseStrength: recentBugCount > 0 ? 0.9 : 0.3,
        }
    }
    return {
        color: BUG_EMISSION_COLOR_LOW,
        particleCount: 2,
        pulseStrength: recentBugCount > 0 ? 0.75 : 0.2,
    }
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
            emissive: IMPACT_EMISSIVE_CHANGED,
            pulseAmplitude: 0.52,
            pulseSpeed: 3.8,
            rippleLift: 0,
        }
    }

    if (impactState === "impacted") {
        return {
            baseIntensity: 0.25,
            emissive: IMPACT_EMISSIVE_IMPACTED,
            pulseAmplitude: 0.38,
            pulseSpeed: 3.1,
            rippleLift: 0,
        }
    }

    if (impactState === "ripple") {
        return {
            baseIntensity: 0.12,
            emissive: IMPACT_EMISSIVE_RIPPLE,
            pulseAmplitude: 0.22,
            pulseSpeed: 2.4,
            rippleLift: 0.16,
        }
    }

    return {
        baseIntensity: 0,
        emissive: IMPACT_EMISSIVE_NEUTRAL,
        pulseAmplitude: 0,
        pulseSpeed: 0,
        rippleLift: 0,
    }
}
