/**
 * Barrel exports for theme system: presets, storage, CSS applicator, provider,
 * type guards, settings API, and library profile sync.
 */
export { type ThemeMode, type ThemeResolvedMode, type IThemeBootstrapState } from "./theme-types"
export {
    type IThemePalette,
    type IThemePreset,
    THEME_PRESETS,
    type ThemePresetId,
    DEFAULT_THEME_PRESET_ID,
} from "./theme-presets"
export {
    THEME_MODE_STORAGE_KEY,
    THEME_PRESET_STORAGE_KEY,
    THEME_PROFILE_STORAGE_SYNC_KEY,
    THEME_DEFAULT_MODE,
    type IThemeProfileSyncState,
    getWindowLocalStorage,
    readLocalStorageItem,
    writeLocalStorageItem,
    readThemeProfileSyncState,
    writeThemeProfileSyncState,
    readStoredThemeMode,
    readStoredThemePreset,
    resolveSystemTheme,
} from "./theme-storage"
export {
    type IThemeProfileResponse,
    type TThemeSyncSelection,
    THEME_SETTINGS_TIMEOUT_MS,
    THEME_SETTINGS_SAVE_DEBOUNCE_MS,
    THEME_SETTINGS_ENDPOINTS,
    createThemeSettingsApiClient,
    fetchThemeProfileFromApi,
    saveThemeProfileToApi,
} from "./theme-settings-api"
export {
    type IThemeSettingsPayload,
    type IThemeProfile,
    THEME_PROFILE_DEFAULT_UPDATED_AT_MS,
    isRecord,
    isThemeMode,
    isThemePreset,
    parseUpdatedAtValue,
    toThemeProfile,
    readThemeSettingsPayload,
} from "./theme-type-guards"
export {
    camelToKebab,
    getPresetById,
    applyThemeTokens,
    applySurfaceTone,
    resolveThemeMode,
} from "./theme-css-applicator"
export { initializeTheme, ThemeProvider, useThemeMode } from "./theme-provider"
export {
    type IThemeLibraryProfileState,
    type IThemeLibraryProfileTheme,
    readThemeLibraryProfileState,
    writeThemeLibraryProfileState,
} from "./theme-library-profile-sync"
export {
    type TSurfaceToneId,
    type ISurfaceTonePalette,
    type ISurfaceToneConfig,
    SURFACE_TONES,
    DEFAULT_SURFACE_TONE_ID,
    isSurfaceToneId,
    getSurfaceTone,
    resolveSurfaceTonePalette,
} from "./theme-surface-tones"
