import {
    type Dispatch,
    type ReactElement,
    type ReactNode,
    type SetStateAction,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"

import { THEME_PRESETS, type ThemePresetId } from "./theme-presets"
import type { IThemePreset } from "./theme-presets"
import { applyThemeTokens, resolveThemeMode } from "./theme-css-applicator"
import {
    type IThemeProfile,
    THEME_PROFILE_DEFAULT_UPDATED_AT_MS,
    isThemeMode,
    isThemePreset,
    toThemeProfile,
} from "./theme-type-guards"
import {
    THEME_MODE_STORAGE_KEY,
    THEME_PRESET_STORAGE_KEY,
    readStoredThemeMode,
    readStoredThemePreset,
    readThemeProfileSyncState,
    resolveSystemTheme,
    writeLocalStorageItem,
    writeThemeProfileSyncState,
} from "./theme-storage"
import {
    type IThemeProfileResponse,
    THEME_SETTINGS_ENDPOINTS,
    THEME_SETTINGS_SAVE_DEBOUNCE_MS,
    THEME_SETTINGS_TIMEOUT_MS,
    type TThemeSyncSelection,
    createThemeSettingsApiClient,
    fetchThemeProfileFromApi,
    saveThemeProfileToApi,
} from "./theme-settings-api"
import type { ThemeMode, ThemeResolvedMode, IThemeBootstrapState } from "./theme-types"

export { THEME_PRESETS } from "./theme-presets"
export type { IThemePreset, IThemePalette, ThemePresetId } from "./theme-presets"
export type { ThemeMode, ThemeResolvedMode, IThemeBootstrapState } from "./theme-types"

/**
 * Контракт theme context.
 */
interface IThemeContext {
    /** Выбранный режим (включая system). */
    readonly mode: ThemeMode
    /** Разрешённый режим с учётом system. */
    readonly resolvedMode: ThemeResolvedMode
    /** Выбранный пресет. */
    readonly preset: ThemePresetId
    /** Каталог пресетов. */
    readonly presets: readonly IThemePreset[]
    /** Установка режима с сохранением в localStorage. */
    readonly setMode: Dispatch<SetStateAction<ThemeMode>>
    /** Установка пресета с сохранением в localStorage. */
    readonly setPreset: Dispatch<SetStateAction<ThemePresetId>>
}

const ThemeContext = createContext<IThemeContext | undefined>(undefined)

/**
 * Инициализирует тему из localStorage до первого рендера.
 *
 * @returns Состояние выбранной темы.
 */
function initializeFromStorage(): IThemeBootstrapState {
    const mode = readStoredThemeMode()
    const preset = readStoredThemePreset()
    const resolvedMode = resolveThemeMode(mode, resolveSystemTheme())

    if (typeof window !== "undefined") {
        applyThemeTokens(resolvedMode, preset)
    }

    return {
        mode,
        preset,
        resolvedMode,
    }
}

/**
 * Инициализация темы до рендера приложения (для минимизации flash).
 *
 * @returns Состояние выбранной темы.
 */
export function initializeTheme(): IThemeBootstrapState {
    return initializeFromStorage()
}

/**
 * Выбирает приоритетный профиль темы при синхронизации.
 *
 * @param remoteProfile Ответ удалённого API (может быть undefined).
 * @param localProfile Локальный профиль.
 * @returns Выбранный профиль и его источник.
 */
function selectThemeProfile(
    remoteProfile: IThemeProfileResponse | undefined,
    localProfile: IThemeProfile,
): TThemeSyncSelection {
    if (remoteProfile === undefined) {
        return {
            profile: localProfile,
            source: "local",
        }
    }

    const candidate = toThemeProfile(remoteProfile.profile, localProfile)
    if (
        localProfile.updatedAtMs !== THEME_PROFILE_DEFAULT_UPDATED_AT_MS &&
        candidate.updatedAtMs < localProfile.updatedAtMs
    ) {
        return {
            profile: localProfile,
            source: "local",
        }
    }

    return {
        profile: candidate,
        source: "remote",
    }
}

/**
 * Provider для глобальной настройки темы.
 *
 * @param props Пропсы provider.
 * @returns React элемент.
 */
type TThemeProviderProps = {
    readonly children: ReactNode
    readonly defaultMode?: ThemeMode
    readonly defaultPreset?: ThemePresetId
}

export function ThemeProvider(props: TThemeProviderProps): ReactElement {
    const { children, defaultMode, defaultPreset } = props
    const initialThemeSyncState = readThemeProfileSyncState()

    const [mode, setThemeMode] = useState<ThemeMode>(() => {
        const persistedMode = readStoredThemeMode()
        if (defaultMode !== undefined && isThemeMode(defaultMode) === true) {
            return defaultMode
        }

        return persistedMode
    })
    const [preset, setThemePreset] = useState<ThemePresetId>(() => {
        const persistedPreset = readStoredThemePreset()
        if (isThemePreset(persistedPreset) === true) {
            return persistedPreset
        }

        return defaultPreset ?? ("moonstone" as ThemePresetId)
    })
    const [systemMode, setSystemMode] = useState<ThemeResolvedMode>(() => resolveSystemTheme())
    const resolvedMode = useMemo<ThemeResolvedMode>(
        () => resolveThemeMode(mode, systemMode),
        [mode, systemMode],
    )
    const shouldSyncProfileRef = useRef(false)
    const lastSyncSignatureRef = useRef("")
    const profileUpdatedAtRef = useRef(
        initialThemeSyncState?.updatedAtMs ?? THEME_PROFILE_DEFAULT_UPDATED_AT_MS,
    )
    const pendingLocalProfileUpdatedAtRef = useRef<number | undefined>(undefined)

    const setMode = useCallback((nextMode: SetStateAction<ThemeMode>): void => {
        setThemeMode((stateMode): ThemeMode => {
            const modeCandidate =
                nextMode instanceof Function === true ? nextMode(stateMode) : nextMode
            if (isThemeMode(modeCandidate) === true) {
                if (modeCandidate !== stateMode) {
                    pendingLocalProfileUpdatedAtRef.current = Date.now()
                }
                return modeCandidate
            }

            return stateMode
        })
    }, [])

    const setPreset = useCallback((nextPreset: SetStateAction<ThemePresetId>): void => {
        setThemePreset((statePreset): ThemePresetId => {
            const presetCandidate =
                nextPreset instanceof Function === true ? nextPreset(statePreset) : nextPreset
            if (isThemePreset(presetCandidate) === true) {
                if (presetCandidate !== statePreset) {
                    pendingLocalProfileUpdatedAtRef.current = Date.now()
                }
                return presetCandidate
            }

            return statePreset
        })
    }, [])

    useThemeSystemModeSync(setSystemMode)
    useThemeApplyModePresetEffect(
        mode,
        preset,
        resolvedMode,
        profileUpdatedAtRef,
        pendingLocalProfileUpdatedAtRef,
    )
    useThemeSyncFromApiEffect({
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        setThemeMode,
        setThemePreset,
        shouldSyncProfileRef,
    })
    useThemeSyncToApiEffect({
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        shouldSyncProfileRef,
    })
    useThemeStorageEffect(setMode, setPreset)

    const contextValue = useMemo(
        () => ({
            mode,
            preset,
            presets: THEME_PRESETS,
            resolvedMode,
            setMode,
            setPreset,
        }),
        [mode, preset, resolvedMode, setMode, setPreset],
    )

    return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

/**
 * Синхронизирует системную тему через MediaQueryList.
 *
 * @param setSystemMode Setter для системного режима.
 */
function useThemeSystemModeSync(setSystemMode: (mode: ThemeResolvedMode) => void): void {
    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleMediaChange = (): void => {
            setSystemMode(resolveSystemTheme(mediaQuery))
        }

        mediaQuery.addEventListener("change", handleMediaChange)
        return (): void => {
            mediaQuery.removeEventListener("change", handleMediaChange)
        }
    }, [setSystemMode])
}

/**
 * Применяет CSS-токены и сохраняет настройки при изменении mode/preset.
 *
 * @param mode Текущий режим темы.
 * @param preset Текущий пресет.
 * @param resolvedMode Физический режим.
 * @param profileUpdatedAtRef Ref с временной меткой обновления профиля.
 * @param pendingLocalProfileUpdatedAtRef Ref с временной меткой ожидающего обновления.
 */
function useThemeApplyModePresetEffect(
    mode: ThemeMode,
    preset: ThemePresetId,
    resolvedMode: ThemeResolvedMode,
    profileUpdatedAtRef?: { current: number },
    pendingLocalProfileUpdatedAtRef?: { current: number | undefined },
): void {
    useEffect((): void => {
        applyThemeTokens(resolvedMode, preset)
        writeLocalStorageItem(THEME_MODE_STORAGE_KEY, mode)
        writeLocalStorageItem(THEME_PRESET_STORAGE_KEY, preset)
        writeThemeProfileSyncState({
            mode,
            preset,
            updatedAtMs:
                pendingLocalProfileUpdatedAtRef?.current ??
                profileUpdatedAtRef?.current ??
                THEME_PROFILE_DEFAULT_UPDATED_AT_MS,
        })
    }, [mode, pendingLocalProfileUpdatedAtRef, preset, profileUpdatedAtRef, resolvedMode])
}

/**
 * Загружает профиль темы из API при первом рендере.
 *
 * @param args Параметры синхронизации.
 */
function useThemeSyncFromApiEffect(args: {
    readonly mode: ThemeMode
    readonly preset: ThemePresetId
    readonly lastSyncSignatureRef: { current: string }
    readonly pendingLocalProfileUpdatedAtRef: { current: number | undefined }
    readonly profileUpdatedAtRef: { current: number }
    readonly setThemeMode: (updater: SetStateAction<ThemeMode>) => void
    readonly setThemePreset: (updater: SetStateAction<ThemePresetId>) => void
    readonly shouldSyncProfileRef: { current: boolean }
}): void {
    const {
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        setThemeMode,
        setThemePreset,
        shouldSyncProfileRef,
    } = args

    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const apiClient = createThemeSettingsApiClient()
        if (apiClient === undefined) {
            shouldSyncProfileRef.current = true
            return undefined
        }

        const abortController = new AbortController()
        const timeoutHandle = window.setTimeout((): void => {
            abortController.abort()
        }, THEME_SETTINGS_TIMEOUT_MS)

        const syncFromProfile = async (): Promise<void> => {
            const localSyncState = readThemeProfileSyncState()
            const localUpdatedAtMs =
                pendingLocalProfileUpdatedAtRef.current ??
                localSyncState?.updatedAtMs ??
                profileUpdatedAtRef.current
            const localProfile = toThemeProfile(
                { mode, preset },
                { mode, preset, updatedAtMs: localUpdatedAtMs },
            )

            let selectedThemeProfile: TThemeSyncSelection = {
                profile: localProfile,
                source: "local",
            }
            for (const endpoint of THEME_SETTINGS_ENDPOINTS) {
                const response = await fetchThemeProfileFromApi(
                    apiClient,
                    abortController.signal,
                    endpoint,
                )
                if (response !== undefined) {
                    selectedThemeProfile = selectThemeProfile(response, localProfile)
                    break
                }
            }

            if (abortController.signal.aborted) {
                return
            }

            if (pendingLocalProfileUpdatedAtRef.current !== undefined) {
                shouldSyncProfileRef.current = true
                return
            }

            const selectedProfile = selectedThemeProfile.profile
            profileUpdatedAtRef.current = selectedProfile.updatedAtMs
            pendingLocalProfileUpdatedAtRef.current = undefined
            lastSyncSignatureRef.current = `${selectedProfile.mode}:${selectedProfile.preset}`

            setThemeMode((_: ThemeMode): ThemeMode => {
                if (selectedProfile.mode !== localProfile.mode) {
                    return selectedProfile.mode
                }

                return localProfile.mode
            })
            setThemePreset((_: ThemePresetId): ThemePresetId => {
                if (selectedProfile.preset !== localProfile.preset) {
                    return selectedProfile.preset
                }

                return localProfile.preset
            })
            writeThemeProfileSyncState({
                ...selectedProfile,
                updatedAtMs: selectedProfile.updatedAtMs,
            })
            shouldSyncProfileRef.current = true
        }

        void syncFromProfile().catch((_error: unknown): void => {
            shouldSyncProfileRef.current = true
        })

        return (): void => {
            clearTimeout(timeoutHandle)
            abortController.abort()
            shouldSyncProfileRef.current = true
        }
    }, [
        lastSyncSignatureRef,
        mode,
        pendingLocalProfileUpdatedAtRef,
        preset,
        profileUpdatedAtRef,
        setThemeMode,
        setThemePreset,
        shouldSyncProfileRef,
    ])
}

/**
 * Сохраняет профиль темы в API при изменении mode/preset.
 *
 * @param args Параметры синхронизации.
 */
function useThemeSyncToApiEffect(args: {
    readonly mode: ThemeMode
    readonly preset: ThemePresetId
    readonly lastSyncSignatureRef: { current: string }
    readonly pendingLocalProfileUpdatedAtRef: { current: number | undefined }
    readonly profileUpdatedAtRef: { current: number }
    readonly shouldSyncProfileRef: { current: boolean }
}): void {
    const {
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        shouldSyncProfileRef,
    } = args

    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        if (shouldSyncProfileRef.current === false) {
            return undefined
        }

        const signature = `${mode}:${preset}`
        if (
            lastSyncSignatureRef.current === signature &&
            pendingLocalProfileUpdatedAtRef.current === undefined
        ) {
            return undefined
        }

        const apiClient = createThemeSettingsApiClient()
        if (apiClient === undefined) {
            const fallbackUpdatedAtMs =
                pendingLocalProfileUpdatedAtRef.current ?? profileUpdatedAtRef.current
            profileUpdatedAtRef.current = fallbackUpdatedAtMs
            pendingLocalProfileUpdatedAtRef.current = undefined
            writeThemeProfileSyncState({
                mode,
                preset,
                updatedAtMs: fallbackUpdatedAtMs,
            })
            lastSyncSignatureRef.current = signature
            return undefined
        }

        const abortController = new AbortController()
        const timeoutHandle = window.setTimeout((): void => {
            abortController.abort()
        }, THEME_SETTINGS_TIMEOUT_MS)
        const timerHandle = window.setTimeout((): void => {
            const updatedAtMs = pendingLocalProfileUpdatedAtRef.current ?? Date.now()
            const profile: IThemeProfile = {
                mode,
                preset,
                updatedAtMs,
            }
            profileUpdatedAtRef.current = updatedAtMs

            void (async (): Promise<void> => {
                let synced = false
                for (const endpoint of THEME_SETTINGS_ENDPOINTS) {
                    if (abortController.signal.aborted) {
                        break
                    }

                    if (
                        (await saveThemeProfileToApi(
                            apiClient,
                            abortController.signal,
                            endpoint,
                            profile,
                        )) === true
                    ) {
                        synced = true
                        break
                    }
                }

                if (synced === false) {
                    writeThemeProfileSyncState(profile)
                }
            })()
            writeThemeProfileSyncState(profile)
            pendingLocalProfileUpdatedAtRef.current = undefined
            lastSyncSignatureRef.current = signature
        }, THEME_SETTINGS_SAVE_DEBOUNCE_MS)

        return (): void => {
            clearTimeout(timeoutHandle)
            clearTimeout(timerHandle)
            abortController.abort()
        }
    }, [
        lastSyncSignatureRef,
        mode,
        pendingLocalProfileUpdatedAtRef,
        preset,
        profileUpdatedAtRef,
        shouldSyncProfileRef,
    ])
}

/**
 * Синхронизирует тему между вкладками через StorageEvent.
 *
 * @param setMode Setter для режима темы.
 * @param setPreset Setter для пресета.
 */
function useThemeStorageEffect(
    setMode: (value: SetStateAction<ThemeMode>) => void,
    setPreset: (value: SetStateAction<ThemePresetId>) => void,
): void {
    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const handleStorage = (event: StorageEvent): void => {
            if (event.key === THEME_MODE_STORAGE_KEY && event.newValue !== null) {
                if (isThemeMode(event.newValue) === true) {
                    setMode(event.newValue)
                }
            }

            if (event.key === THEME_PRESET_STORAGE_KEY && event.newValue !== null) {
                if (isThemePreset(event.newValue) === true) {
                    setPreset(event.newValue)
                }
            }
        }

        window.addEventListener("storage", handleStorage)
        return (): void => {
            window.removeEventListener("storage", handleStorage)
        }
    }, [setMode, setPreset])
}

/**
 * Получение theme context.
 *
 * @returns Контекст темы.
 */
export function useThemeMode(): IThemeContext {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useThemeMode must be used inside ThemeProvider")
    }

    return context
}
