import type { ICodeCityTreemapFileLinkResolver } from "@/components/codecity/codecity-treemap"

import type {
    TCodeCityDashboardMetric,
    ICodeCityDashboardRepositoryProfile,
    TDashboardOnboardingAreaId,
} from "./code-city-dashboard-types"

/**
 * Возвращает первый репозиторий из массива или выбрасывает ошибку.
 *
 * @param repositories Массив профилей репозиториев.
 * @returns Профиль репозитория по умолчанию.
 */
export function resolveDefaultDashboardRepository(
    repositories: ReadonlyArray<ICodeCityDashboardRepositoryProfile>,
): ICodeCityDashboardRepositoryProfile {
    const defaultRepository = repositories[0]
    if (defaultRepository === undefined) {
        throw new Error("CodeCity dashboard requires at least one repository profile")
    }

    return defaultRepository
}

/**
 * Резолвит профиль dashboard по идентификатору репозитория.
 *
 * @param repositoryId Идентификатор репозитория.
 * @param repositories Массив профилей репозиториев.
 * @returns Профиль репозитория или значение по умолчанию.
 */
export function resolveDashboardProfile(
    repositoryId: string,
    repositories: ReadonlyArray<ICodeCityDashboardRepositoryProfile>,
): ICodeCityDashboardRepositoryProfile {
    const defaultRepository = resolveDefaultDashboardRepository(repositories)
    const selected = repositories.find((entry): boolean => entry.id === repositoryId)
    return selected ?? defaultRepository
}

/**
 * Type guard для проверки допустимости значения метрики.
 *
 * @param value Строковое значение.
 * @returns True если значение является допустимой метрикой.
 */
export function isCodeCityMetric(value: string): value is TCodeCityDashboardMetric {
    return value === "complexity" || value === "coverage" || value === "churn"
}

/**
 * Извлекает список id репозиториев из массива профилей.
 *
 * @param repositories Массив профилей репозиториев.
 * @returns Массив идентификаторов.
 */
export function resolveRepositoryOptions(
    repositories: ReadonlyArray<ICodeCityDashboardRepositoryProfile>,
): ReadonlyArray<string> {
    return repositories.map((entry): string => entry.id)
}

/**
 * Создает функцию-линкер для файлов репозитория.
 *
 * @param repositoryId Идентификатор репозитория.
 * @returns Функция, возвращающая URL файла.
 */
export function createRepositoryFilesLink(
    repositoryId: string,
): (file: ICodeCityTreemapFileLinkResolver) => string {
    const encodedRepo = encodeURIComponent(repositoryId)

    return (file): string => {
        const encodedFile = encodeURIComponent(file.path)
        return `/repositories/${encodedRepo}?file=${encodedFile}`
    }
}

/**
 * Извлекает имя district из пути файла.
 *
 * @param filePath Путь к файлу.
 * @returns Название district (директория файла).
 */
export function resolveDistrictName(filePath: string): string {
    const normalizedPath = filePath.trim().replaceAll("\\", "/")
    const separatorIndex = normalizedPath.lastIndexOf("/")
    if (separatorIndex <= 0) {
        return "root"
    }
    return normalizedPath.slice(0, separatorIndex)
}

/**
 * Резолвит onboarding area id из идентификатора tour step.
 *
 * @param tourStepId Идентификатор шага tour.
 * @returns Area id или undefined.
 */
export function resolveOnboardingAreaFromTourStep(
    tourStepId: string,
): TDashboardOnboardingAreaId | undefined {
    if (tourStepId === "controls") {
        return "controls"
    }
    if (tourStepId === "city-3d") {
        return "city-3d"
    }
    if (tourStepId === "root-cause") {
        return "root-cause"
    }
    return undefined
}

/**
 * Возвращает человекочитаемый лейбл метрики.
 *
 * @param metric Метрика dashboard.
 * @returns Лейбл.
 */
export function resolveDashboardMetricLabel(metric: TCodeCityDashboardMetric): string {
    if (metric === "complexity") {
        return "Complexity"
    }
    if (metric === "coverage") {
        return "Coverage"
    }
    return "Churn"
}
