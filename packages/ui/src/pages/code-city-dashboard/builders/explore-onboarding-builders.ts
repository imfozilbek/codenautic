import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"
import type { IOnboardingProgressModuleDescriptor } from "@/components/graphs/onboarding-progress-tracker"
import type { IExploreModePathDescriptor } from "@/components/graphs/explore-mode-sidebar"
import type { IHotAreaHighlightDescriptor } from "@/components/graphs/hot-area-highlights"

import { CODE_CITY_DASHBOARD_ONBOARDING_AREAS } from "../code-city-dashboard-mock-data"

/**
 * Максимум файлов в цепочке пути исследования.
 */
const MAX_PATH_CHAIN_FILES = 3

/**
 * Максимум горячих зон для подсветки на карте.
 */
const MAX_HOT_AREA_HIGHLIGHTS = 4

/**
 * Формирует модули прогресса onboarding из списка исследованных областей.
 *
 * @param exploredAreaIds Идентификаторы уже исследованных областей.
 * @returns Набор модулей с прогрессом.
 */
export function buildOnboardingProgressModules(
    exploredAreaIds: ReadonlyArray<string>,
): ReadonlyArray<IOnboardingProgressModuleDescriptor> {
    return CODE_CITY_DASHBOARD_ONBOARDING_AREAS.map((area): IOnboardingProgressModuleDescriptor => {
        return {
            description: area.description,
            id: area.id,
            isComplete: exploredAreaIds.includes(area.id),
            title: area.title,
        }
    })
}

/**
 * Формирует role-aware набор exploration paths на базе scan-файлов.
 *
 * @param files Файлы из dashboard profile.
 * @returns Рекомендованные пути исследования для sidebar.
 */
export function buildExploreModePaths(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IExploreModePathDescriptor> {
    const topBackendFiles = files
        .filter((file): boolean => /api|service|worker|backend/i.test(file.path))
        .slice(0, MAX_PATH_CHAIN_FILES)
        .map((file): string => file.id)
    const topFrontendFiles = files
        .filter((file): boolean => /ui|component|page|frontend/i.test(file.path))
        .slice(0, MAX_PATH_CHAIN_FILES)
        .map((file): string => file.id)
    const topArchitectureFiles = files
        .filter((file): boolean => /domain|core|graph|architecture/i.test(file.path))
        .slice(0, MAX_PATH_CHAIN_FILES)
        .map((file): string => file.id)
    const defaultChain = files.slice(0, MAX_PATH_CHAIN_FILES).map((file): string => file.id)

    return [
        {
            description: "Follow API/service hotspots and worker bottlenecks.",
            fileChainIds: topBackendFiles.length > 0 ? topBackendFiles : defaultChain,
            id: "explore-backend-hotspots",
            role: "backend",
            title: "Backend hotspots path",
        },
        {
            description: "Inspect UI pages/components and their dependency neighborhoods.",
            fileChainIds: topFrontendFiles.length > 0 ? topFrontendFiles : defaultChain,
            id: "explore-frontend-flows",
            role: "frontend",
            title: "Frontend interaction path",
        },
        {
            description: "Review architecture-critical modules and shared graph zones.",
            fileChainIds: topArchitectureFiles.length > 0 ? topArchitectureFiles : defaultChain,
            id: "explore-architecture-core",
            role: "architect",
            title: "Architecture core path",
        },
    ]
}

/**
 * Формирует hot area highlights для критичных зон в текущем профиле.
 *
 * @param files Файлы профиля.
 * @returns Набор зон для visual highlights.
 */
export function buildHotAreaHighlights(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IHotAreaHighlightDescriptor> {
    const rankedFiles = [...files]
        .sort((leftFile, rightFile): number => {
            const leftRiskScore =
                (leftFile.complexity ?? 0) + (leftFile.bugIntroductions?.["30d"] ?? 0) * 2
            const rightRiskScore =
                (rightFile.complexity ?? 0) + (rightFile.bugIntroductions?.["30d"] ?? 0) * 2
            return rightRiskScore - leftRiskScore
        })
        .slice(0, MAX_HOT_AREA_HIGHLIGHTS)

    return rankedFiles.map((file, index): IHotAreaHighlightDescriptor => {
        const severity: IHotAreaHighlightDescriptor["severity"] =
            index === 0 ? "critical" : index < 3 ? "high" : "medium"
        const bugCount = file.bugIntroductions?.["30d"] ?? 0

        return {
            description: `Complexity ${String(file.complexity ?? 0)} · Bugs (30d) ${String(bugCount)}`,
            fileId: file.id,
            label: file.path,
            severity,
        }
    })
}
