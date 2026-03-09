import { createApiConfig, resolveUiEnv } from "../api/config"
import { FetchHttpClient, isApiHttpError } from "../api/http-client"
import type { IHttpClient } from "../api/http-client"
import {
    type IThemeProfile,
    type IThemeSettingsPayload,
    isRecord,
    isThemeMode,
    isThemePreset,
    parseUpdatedAtValue,
    readThemeSettingsPayload,
} from "./theme-type-guards"

/**
 * Результат чтения профиля темы из API.
 */
export interface IThemeProfileResponse {
    /** Результат чтения. */
    readonly profile: IThemeSettingsPayload
    /** Время обновления из источника. */
    readonly updatedAtMs: number
}

/**
 * Результат выбора профиля темы при синхронизации.
 */
export type TThemeSyncSelection = {
    readonly profile: IThemeProfile
    readonly source: "local" | "remote"
}

/**
 * Таймаут для API-запросов синхронизации темы (в мс).
 */
export const THEME_SETTINGS_TIMEOUT_MS = 2_000

/**
 * Задержка debounce перед сохранением темы (в мс).
 */
export const THEME_SETTINGS_SAVE_DEBOUNCE_MS = 200

/**
 * Список API-эндпоинтов для синхронизации настроек темы.
 */
export const THEME_SETTINGS_ENDPOINTS = [
    "/api/v1/user/settings",
    "/api/v1/user/preferences",
] as const

/**
 * HTTP-методы для записи настроек темы.
 */
const THEME_SETTINGS_WRITE_METHODS = ["PUT", "PATCH", "POST"] as const

/**
 * Создаёт HTTP-клиент для синхронизации настроек темы.
 *
 * @returns HTTP-клиент или undefined, если конфигурация недоступна.
 */
export function createThemeSettingsApiClient(): IHttpClient | undefined {
    try {
        const config = createApiConfig(resolveUiEnv(import.meta.env))

        return new FetchHttpClient(config)
    } catch {
        return undefined
    }
}

/**
 * Загружает профиль темы из API по заданному эндпоинту.
 *
 * @param client HTTP-клиент.
 * @param signal Сигнал отмены запроса.
 * @param endpoint API-эндпоинт.
 * @returns Ответ с профилем или undefined при ошибке.
 */
export async function fetchThemeProfileFromApi(
    client: IHttpClient,
    signal: AbortSignal,
    endpoint: string,
): Promise<IThemeProfileResponse | undefined> {
    try {
        const response = await client.request<unknown>({
            method: "GET",
            path: endpoint,
            credentials: "include",
            signal,
        })

        const profile = readThemeSettingsPayload(response)
        const responsePayload = isRecord(response) ? response : ({} as Record<string, unknown>)
        const updatedAtMs = parseUpdatedAtValue(responsePayload.updatedAt)

        if (isThemeMode(profile.mode) === false && isThemePreset(profile.preset) === false) {
            return undefined
        }

        return {
            profile,
            updatedAtMs,
        }
    } catch {
        return undefined
    }
}

/**
 * Сохраняет профиль темы в API по заданному эндпоинту.
 *
 * @param client HTTP-клиент.
 * @param signal Сигнал отмены запроса.
 * @param endpoint API-эндпоинт.
 * @param profile Профиль темы для сохранения.
 * @returns True, если сохранение прошло успешно.
 */
export async function saveThemeProfileToApi(
    client: IHttpClient,
    signal: AbortSignal,
    endpoint: string,
    profile: IThemeProfile,
): Promise<boolean> {
    const payload: IThemeSettingsPayload = {
        mode: profile.mode,
        preset: profile.preset,
    }

    for (const method of THEME_SETTINGS_WRITE_METHODS) {
        try {
            await client.request<unknown>({
                method,
                path: endpoint,
                body: payload,
                credentials: "include",
                signal,
            })
            return true
        } catch (error: unknown) {
            if (isApiHttpError(error) === true && error.status === 404) {
                return false
            }

            if (isApiHttpError(error) === true && error.status === 405) {
                continue
            }
        }
    }

    return false
}
