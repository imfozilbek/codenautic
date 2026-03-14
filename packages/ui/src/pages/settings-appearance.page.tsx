import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@/components/ui"
import {
    SUPPORTED_LOCALES,
    formatLocalizedDateTime,
    formatLocalizedNumber,
    useLocale,
} from "@/lib/i18n"
import { FormLayout } from "@/components/forms/form-layout"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import {
    readThemeLibraryProfileState,
    writeThemeLibraryProfileState,
    type IThemeLibraryProfileTheme,
} from "@/lib/theme/theme-library-profile-sync"
import { type ThemePresetId, useThemeMode } from "@/lib/theme/theme-provider"
import {
    SURFACE_TONES,
    DEFAULT_SURFACE_TONE_ID,
    getSurfaceTone,
    resolveSurfaceTonePalette,
} from "@/lib/theme/theme-surface-tones"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

import {
    APPEARANCE_ACCENT_STORAGE_KEY,
    APPEARANCE_BASE_PALETTE_STORAGE_KEY,
    APPEARANCE_FORM_RADIUS_STORAGE_KEY,
    APPEARANCE_INTENSITY_STORAGE_KEY,
    APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY,
    APPEARANCE_LIBRARY_STORAGE_KEY,
    APPEARANCE_LIBRARY_SYNC_STORAGE_KEY,
    APPEARANCE_RADIUS_STORAGE_KEY,
    DEFAULT_ACCENT_COLOR,
    DEFAULT_ACCENT_INTENSITY,
    DEFAULT_FORM_RADIUS,
    DEFAULT_GLOBAL_RADIUS,
    LOCALE_DATE_PREVIEW,
    LOCALE_LABELS,
    LOCALE_NUMBER_PREVIEW,
    MAX_FORM_RADIUS,
    MAX_INTENSITY,
    MAX_RADIUS,
    MIN_FORM_RADIUS,
    MIN_INTENSITY,
    MIN_RADIUS,
    QUICK_PRESET_KEYWORDS,
} from "./settings-appearance/appearance-settings.constants"

import {
    type IUserThemeLibraryItem,
    type TBasePaletteId,
    buildThemeLibraryExportPayload,
    clearAppearanceStorage,
    createEffectiveAccentColor,
    createThemeLibraryId,
    fromProfileTheme,
    getContrastRatio,
    parseThemeLibraryImportPayload,
    readStoredBasePalette,
    readStoredFavoritePreset,
    readStoredHexColor,
    readStoredNumber,
    readStoredThemeLibrary,
    readStoredThemeLibraryUpdatedAtMs,
    removeLocalStorageItem,
    resolveThemeNameConflict,
    toProfileTheme,
    triggerJsonDownload,
    writeLocalStorageItem,
    writeStoredThemeLibraryUpdatedAtMs,
} from "./settings-appearance/appearance-settings.utils"

/**
 * Секция выбора языка интерфейса с preview форматирования.
 *
 * @returns Карточка выбора языка.
 */
function LanguageSection(): ReactElement {
    const { locale, setLocale } = useLocale()

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Language / Язык</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div aria-label="Language selection" className="flex gap-2" role="radiogroup">
                    {SUPPORTED_LOCALES.map(
                        (localeOption): ReactElement => (
                            <Button
                                key={localeOption}
                                aria-pressed={localeOption === locale}
                                aria-selected={localeOption === locale}
                                size="sm"
                                variant={localeOption === locale ? "solid" : "flat"}
                                onPress={(): void => {
                                    void setLocale(localeOption)
                                }}
                            >
                                {LOCALE_LABELS[localeOption]}
                            </Button>
                        ),
                    )}
                </div>
                <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary">
                    <p>
                        Date preview:{" "}
                        <span className="font-medium text-foreground">
                            {formatLocalizedDateTime(LOCALE_DATE_PREVIEW, locale)}
                        </span>
                    </p>
                    <p>
                        Number preview:{" "}
                        <span className="font-medium text-foreground">
                            {formatLocalizedNumber(LOCALE_NUMBER_PREVIEW, locale)}
                        </span>
                    </p>
                </div>
            </CardBody>
        </Card>
    )
}

/**
 * Страница управления темой интерфейса.
 *
 * @returns Экран Appearance с mode/preset переключением и live preview.
 */
export function SettingsAppearancePage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const { mode, preset, presets, resolvedMode, setMode, setPreset } = useThemeMode()
    const availablePresetIds = useMemo(
        (): ReadonlyArray<ThemePresetId> =>
            presets.map((themePreset): ThemePresetId => themePreset.id),
        [presets],
    )
    const libraryUpdatedAtMsRef = useRef(readStoredThemeLibraryUpdatedAtMs())
    const pendingLibraryUpdatedAtMsRef = useRef<number | undefined>(undefined)
    const [accentColor, setAccentColor] = useState<string>(() =>
        readStoredHexColor(APPEARANCE_ACCENT_STORAGE_KEY, DEFAULT_ACCENT_COLOR),
    )
    const [accentIntensity, setAccentIntensity] = useState<number>(() =>
        readStoredNumber(
            APPEARANCE_INTENSITY_STORAGE_KEY,
            DEFAULT_ACCENT_INTENSITY,
            MIN_INTENSITY,
            MAX_INTENSITY,
        ),
    )
    const [basePaletteId, setBasePaletteId] = useState<TBasePaletteId>(() =>
        readStoredBasePalette(APPEARANCE_BASE_PALETTE_STORAGE_KEY, DEFAULT_SURFACE_TONE_ID),
    )
    const [globalRadius, setGlobalRadius] = useState<number>(() =>
        readStoredNumber(
            APPEARANCE_RADIUS_STORAGE_KEY,
            DEFAULT_GLOBAL_RADIUS,
            MIN_RADIUS,
            MAX_RADIUS,
        ),
    )
    const [formRadius, setFormRadius] = useState<number>(() =>
        readStoredNumber(
            APPEARANCE_FORM_RADIUS_STORAGE_KEY,
            DEFAULT_FORM_RADIUS,
            MIN_FORM_RADIUS,
            MAX_FORM_RADIUS,
        ),
    )
    const [previewFieldValue, setPreviewFieldValue] = useState("security policy update")
    const [themeLibrary, setThemeLibrary] = useState<ReadonlyArray<IUserThemeLibraryItem>>(() =>
        readStoredThemeLibrary(availablePresetIds),
    )
    const [selectedThemeId, setSelectedThemeId] = useState<string>("")
    const [themeDraftName, setThemeDraftName] = useState<string>("")
    const [themeImportValue, setThemeImportValue] = useState<string>("")
    const [favoritePresetId, setFavoritePresetId] = useState<ThemePresetId | undefined>(() =>
        readStoredFavoritePreset(availablePresetIds),
    )
    const [isLibraryHydrated, setIsLibraryHydrated] = useState(false)
    const [librarySyncStatus, setLibrarySyncStatus] = useState<
        "error" | "idle" | "synced" | "syncing"
    >("idle")
    const [pendingRandomPresetId, setPendingRandomPresetId] = useState<ThemePresetId | undefined>(
        undefined,
    )
    const [lastRandomUndoPresetId, setLastRandomUndoPresetId] = useState<ThemePresetId | undefined>(
        undefined,
    )
    const [lastAppliedRandomPresetId, setLastAppliedRandomPresetId] = useState<
        ThemePresetId | undefined
    >(undefined)

    const activeBasePalette = useMemo(
        () => resolveSurfaceTonePalette(basePaletteId, resolvedMode),
        [basePaletteId, resolvedMode],
    )

    const effectiveAccentColor = useMemo(
        (): string => createEffectiveAccentColor(accentColor, accentIntensity, resolvedMode),
        [accentColor, accentIntensity, resolvedMode],
    )

    const contrastRatio = useMemo(
        (): number => getContrastRatio(effectiveAccentColor, activeBasePalette.surface),
        [effectiveAccentColor, activeBasePalette.surface],
    )

    const isAccessibleContrast = contrastRatio >= 4.5

    const accessiblePresetIds = useMemo((): ReadonlyArray<ThemePresetId> => {
        return presets
            .filter((themePreset): boolean => {
                const palette = resolvedMode === "dark" ? themePreset.dark : themePreset.light
                const primaryContrast = getContrastRatio(palette.primary, palette.surface)
                const accentContrast = getContrastRatio(palette.accent, palette.surface)

                return primaryContrast >= 3 && accentContrast >= 2.6
            })
            .map((themePreset): ThemePresetId => themePreset.id)
    }, [presets, resolvedMode])

    const quickPresetOptions = useMemo((): ReadonlyArray<(typeof presets)[number]> => {
        const selected: Array<(typeof presets)[number]> = []
        const selectedIds = new Set<string>()

        QUICK_PRESET_KEYWORDS.forEach((keyword): void => {
            const match = presets.find(
                (themePreset): boolean =>
                    themePreset.label.toLowerCase().includes(keyword) ||
                    themePreset.id.toLowerCase().includes(keyword),
            )
            if (match !== undefined && selectedIds.has(match.id) === false) {
                selected.push(match)
                selectedIds.add(match.id)
            }
        })

        presets.forEach((themePreset): void => {
            if (selected.length >= 4) {
                return
            }
            if (selectedIds.has(themePreset.id)) {
                return
            }
            selected.push(themePreset)
            selectedIds.add(themePreset.id)
        })

        return selected
    }, [presets])

    const pendingRandomPreset = useMemo(() => {
        if (pendingRandomPresetId === undefined) {
            return undefined
        }
        return presets.find((themePreset): boolean => themePreset.id === pendingRandomPresetId)
    }, [pendingRandomPresetId, presets])

    const lastAppliedRandomPreset = useMemo(() => {
        if (lastAppliedRandomPresetId === undefined) {
            return undefined
        }
        return presets.find((themePreset): boolean => themePreset.id === lastAppliedRandomPresetId)
    }, [lastAppliedRandomPresetId, presets])

    const selectedTheme = useMemo((): IUserThemeLibraryItem | undefined => {
        if (selectedThemeId.length === 0) {
            return undefined
        }
        return themeLibrary.find((themeItem): boolean => themeItem.id === selectedThemeId)
    }, [selectedThemeId, themeLibrary])

    const favoritePresetLabel = useMemo((): string => {
        if (favoritePresetId === undefined) {
            return "none"
        }
        const presetDefinition = presets.find(
            (themePreset): boolean => themePreset.id === favoritePresetId,
        )
        if (presetDefinition === undefined) {
            return favoritePresetId
        }
        return presetDefinition.label
    }, [favoritePresetId, presets])

    const markThemeLibraryDirty = useCallback((): void => {
        pendingLibraryUpdatedAtMsRef.current = Date.now()
    }, [])

    const selectRandomPresetPreview = useCallback((): void => {
        const currentPresetId = preset
        const candidateIds = accessiblePresetIds.filter(
            (presetId): boolean =>
                presetId !== currentPresetId && presetId !== pendingRandomPresetId,
        )
        if (candidateIds.length === 0) {
            showToastInfo(t("settings:appearance.toast.noAlternativePresets"))
            return
        }

        const randomIndex = Math.floor(Math.random() * candidateIds.length)
        const randomPresetId = candidateIds[randomIndex]
        if (randomPresetId === undefined) {
            return
        }
        setPendingRandomPresetId(randomPresetId)
        showToastInfo(t("settings:appearance.toast.randomPresetPreview"))
    }, [accessiblePresetIds, pendingRandomPresetId, preset, t])

    const handleApplyRandomPreset = (): void => {
        if (pendingRandomPresetId === undefined) {
            return
        }

        const currentPresetId = preset
        setLastRandomUndoPresetId(currentPresetId)
        setLastAppliedRandomPresetId(pendingRandomPresetId)
        setPreset(pendingRandomPresetId)
        setPendingRandomPresetId(undefined)
        showToastSuccess(t("settings:appearance.toast.randomPresetApplied"))
    }

    const handleUndoRandomPreset = (): void => {
        if (lastRandomUndoPresetId === undefined) {
            return
        }

        setPreset(lastRandomUndoPresetId)
        setLastRandomUndoPresetId(undefined)
        showToastSuccess(t("settings:appearance.toast.lastRandomReverted"))
    }

    const createThemeSnapshot = (nextName: string): IUserThemeLibraryItem => {
        return {
            accentColor,
            accentIntensity,
            basePaletteId,
            formRadius,
            globalRadius,
            id: createThemeLibraryId(nextName),
            mode,
            name: nextName,
            presetId: preset,
        }
    }

    const handleCreateLibraryTheme = (): void => {
        const resolvedName = resolveThemeNameConflict(
            themeDraftName,
            themeLibrary.map((themeItem): string => themeItem.name),
        )
        const snapshot = createThemeSnapshot(resolvedName)

        markThemeLibraryDirty()
        setThemeLibrary((previous): ReadonlyArray<IUserThemeLibraryItem> => [snapshot, ...previous])
        setSelectedThemeId(snapshot.id)
        setThemeDraftName("")
        showToastSuccess(
            t("settings:appearance.toast.themeSavedToLibrary", { name: snapshot.name }),
        )
    }

    const handleRenameLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        const resolvedName = resolveThemeNameConflict(
            themeDraftName,
            themeLibrary
                .filter((themeItem): boolean => themeItem.id !== selectedTheme.id)
                .map((themeItem): string => themeItem.name),
        )
        markThemeLibraryDirty()
        setThemeLibrary(
            (previous): ReadonlyArray<IUserThemeLibraryItem> =>
                previous.map((themeItem): IUserThemeLibraryItem => {
                    if (themeItem.id !== selectedTheme.id) {
                        return themeItem
                    }
                    return {
                        ...themeItem,
                        name: resolvedName,
                    }
                }),
        )
        setThemeDraftName("")
        showToastSuccess(t("settings:appearance.toast.themeRenamed"))
    }

    const handleDuplicateLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        const baseName = `${selectedTheme.name} Copy`
        const resolvedName = resolveThemeNameConflict(
            baseName,
            themeLibrary.map((themeItem): string => themeItem.name),
        )
        const duplicate: IUserThemeLibraryItem = {
            ...selectedTheme,
            id: createThemeLibraryId(resolvedName),
            name: resolvedName,
        }
        markThemeLibraryDirty()
        setThemeLibrary(
            (previous): ReadonlyArray<IUserThemeLibraryItem> => [duplicate, ...previous],
        )
        setSelectedThemeId(duplicate.id)
        showToastSuccess(t("settings:appearance.toast.themeDuplicated"))
    }

    const handleDeleteLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        markThemeLibraryDirty()
        setThemeLibrary(
            (previous): ReadonlyArray<IUserThemeLibraryItem> =>
                previous.filter((themeItem): boolean => themeItem.id !== selectedTheme.id),
        )
        setSelectedThemeId("")
        showToastSuccess(t("settings:appearance.toast.themeRemoved"))
    }

    const handleApplyLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        setMode(selectedTheme.mode)
        setPreset(selectedTheme.presetId)
        setAccentColor(selectedTheme.accentColor)
        setAccentIntensity(selectedTheme.accentIntensity)
        setBasePaletteId(selectedTheme.basePaletteId)
        setGlobalRadius(selectedTheme.globalRadius)
        setFormRadius(selectedTheme.formRadius)
        setPendingRandomPresetId(undefined)
        setLastRandomUndoPresetId(undefined)
        setLastAppliedRandomPresetId(undefined)
        showToastSuccess(t("settings:appearance.toast.themeApplied", { name: selectedTheme.name }))
    }

    const handleExportThemeLibrary = (): void => {
        const payload = buildThemeLibraryExportPayload(themeLibrary, favoritePresetId)
        const jsonPayload = JSON.stringify(payload, null, 2)
        setThemeImportValue(jsonPayload)
        triggerJsonDownload(
            `theme-library-${new Date().toISOString().slice(0, 10)}.json`,
            jsonPayload,
        )
        showToastSuccess(t("settings:appearance.toast.themeLibraryExported"))
    }

    const handleImportThemeLibrary = (): void => {
        const parsedPayload = parseThemeLibraryImportPayload(themeImportValue, availablePresetIds)
        if (parsedPayload === undefined) {
            showToastInfo(t("settings:appearance.toast.importSkipped"))
            return
        }

        markThemeLibraryDirty()
        setThemeLibrary((previous): ReadonlyArray<IUserThemeLibraryItem> => {
            const existingNames = previous.map((themeItem): string => themeItem.name)
            const importedThemes = parsedPayload.themes.map((themeItem): IUserThemeLibraryItem => {
                const resolvedName = resolveThemeNameConflict(themeItem.name, existingNames)
                existingNames.push(resolvedName)
                return {
                    ...themeItem,
                    id: createThemeLibraryId(resolvedName),
                    name: resolvedName,
                }
            })
            return [...importedThemes, ...previous]
        })
        if (parsedPayload.favoritePresetId !== undefined) {
            setFavoritePresetId(parsedPayload.favoritePresetId)
        }
        setThemeImportValue("")
        showToastSuccess(t("settings:appearance.toast.themeLibraryImported"))
    }

    const handlePinCurrentPreset = (): void => {
        const currentPresetId = preset
        markThemeLibraryDirty()
        setFavoritePresetId(currentPresetId)
        showToastSuccess(t("settings:appearance.toast.favoritePresetPinned"))
    }

    const handleApplyFavoritePreset = (): void => {
        if (favoritePresetId === undefined) {
            return
        }
        setPreset(favoritePresetId)
        showToastSuccess(t("settings:appearance.toast.favoritePresetApplied"))
    }

    useEffect((): void => {
        if (typeof document === "undefined") {
            return
        }

        const root = document.documentElement
        const smRadius = Math.max(4, Math.round(globalRadius * 0.56))
        const mdRadius = Math.max(6, globalRadius)
        const lgRadius = Math.max(8, globalRadius + 4)

        root.style.setProperty("--accent", effectiveAccentColor)
        root.style.setProperty("--background", activeBasePalette.background)
        root.style.setProperty("--foreground", activeBasePalette.foreground)
        root.style.setProperty("--surface", activeBasePalette.surface)
        root.style.setProperty("--surface-muted", activeBasePalette.surfaceMuted)
        root.style.setProperty("--border", activeBasePalette.border)
        root.style.setProperty("--radius-sm", `${smRadius}px`)
        root.style.setProperty("--radius-md", `${mdRadius}px`)
        root.style.setProperty("--radius-lg", `${lgRadius}px`)
        root.style.setProperty("--radius-form", `${formRadius}px`)

        writeLocalStorageItem(APPEARANCE_ACCENT_STORAGE_KEY, accentColor)
        writeLocalStorageItem(APPEARANCE_INTENSITY_STORAGE_KEY, String(accentIntensity))
        writeLocalStorageItem(APPEARANCE_BASE_PALETTE_STORAGE_KEY, basePaletteId)
        writeLocalStorageItem(APPEARANCE_RADIUS_STORAGE_KEY, String(globalRadius))
        writeLocalStorageItem(APPEARANCE_FORM_RADIUS_STORAGE_KEY, String(formRadius))
    }, [
        accentColor,
        accentIntensity,
        activeBasePalette.background,
        activeBasePalette.border,
        activeBasePalette.foreground,
        activeBasePalette.surface,
        activeBasePalette.surfaceMuted,
        basePaletteId,
        effectiveAccentColor,
        formRadius,
        globalRadius,
        mode,
        preset,
    ])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return undefined
        }

        const onKeyDown = (event: KeyboardEvent): void => {
            const isRandomHotkey = event.altKey && event.key.toLowerCase() === "r"
            if (isRandomHotkey !== true) {
                return
            }
            event.preventDefault()
            selectRandomPresetPreview()
        }

        window.addEventListener("keydown", onKeyDown)
        return (): void => {
            window.removeEventListener("keydown", onKeyDown)
        }
    }, [selectRandomPresetPreview])

    useEffect((): void => {
        if (selectedThemeId.length === 0) {
            return
        }
        const exists = themeLibrary.some((themeItem): boolean => themeItem.id === selectedThemeId)
        if (exists !== true) {
            setSelectedThemeId("")
        }
    }, [selectedThemeId, themeLibrary])

    useEffect((): void => {
        if (favoritePresetId === undefined) {
            return
        }
        if (availablePresetIds.includes(favoritePresetId) === false) {
            setFavoritePresetId(undefined)
        }
    }, [availablePresetIds, favoritePresetId])

    useEffect((): (() => void) | void => {
        let isMounted = true

        void (async (): Promise<void> => {
            setLibrarySyncStatus("syncing")
            const profileState = await readThemeLibraryProfileState()
            if (isMounted !== true) {
                return
            }

            if (profileState === undefined) {
                setLibrarySyncStatus("idle")
                setIsLibraryHydrated(true)
                return
            }

            const parsedThemes = profileState.themes
                .map((themeItem): IUserThemeLibraryItem | undefined =>
                    fromProfileTheme(themeItem, availablePresetIds),
                )
                .filter((themeItem): themeItem is IUserThemeLibraryItem => themeItem !== undefined)

            if (
                profileState.favoritePresetId !== undefined &&
                availablePresetIds.includes(profileState.favoritePresetId as ThemePresetId)
            ) {
                if (
                    profileState.updatedAtMs >
                    (pendingLibraryUpdatedAtMsRef.current ?? libraryUpdatedAtMsRef.current)
                ) {
                    setFavoritePresetId(profileState.favoritePresetId as ThemePresetId)
                }
            }
            if (
                profileState.updatedAtMs >
                (pendingLibraryUpdatedAtMsRef.current ?? libraryUpdatedAtMsRef.current)
            ) {
                setThemeLibrary(parsedThemes)
                setSelectedThemeId(parsedThemes[0]?.id ?? "")
                if (profileState.favoritePresetId === undefined) {
                    setFavoritePresetId(undefined)
                }
                libraryUpdatedAtMsRef.current = profileState.updatedAtMs
                pendingLibraryUpdatedAtMsRef.current = undefined
            }
            setLibrarySyncStatus("synced")
            setIsLibraryHydrated(true)
        })()

        return (): void => {
            isMounted = false
        }
    }, [availablePresetIds])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return undefined
        }

        writeLocalStorageItem(APPEARANCE_LIBRARY_STORAGE_KEY, JSON.stringify(themeLibrary))
        if (favoritePresetId !== undefined) {
            writeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY, favoritePresetId)
        } else {
            removeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY)
        }

        const localUpdatedAtMs =
            pendingLibraryUpdatedAtMsRef.current ?? libraryUpdatedAtMsRef.current
        if (localUpdatedAtMs > 0) {
            writeStoredThemeLibraryUpdatedAtMs(localUpdatedAtMs)
        }

        if (isLibraryHydrated !== true) {
            return undefined
        }

        const timer = window.setTimeout((): void => {
            void (async (): Promise<void> => {
                setLibrarySyncStatus("syncing")
                const updatedAtMs = pendingLibraryUpdatedAtMsRef.current ?? Date.now()
                libraryUpdatedAtMsRef.current = updatedAtMs
                pendingLibraryUpdatedAtMsRef.current = undefined
                writeStoredThemeLibraryUpdatedAtMs(updatedAtMs)
                const updated = await writeThemeLibraryProfileState({
                    favoritePresetId,
                    themes: themeLibrary.map(
                        (themeItem): IThemeLibraryProfileTheme => toProfileTheme(themeItem),
                    ),
                    updatedAtMs,
                })
                setLibrarySyncStatus(updated ? "synced" : "error")
            })()
        }, 350)

        return (): void => {
            window.clearTimeout(timer)
        }
    }, [favoritePresetId, isLibraryHydrated, themeLibrary])

    const handleResetTheme = (): void => {
        const defaultPreset = presets.at(0)?.id
        setMode("system")
        if (defaultPreset !== undefined) {
            setPreset(defaultPreset)
        }
        setAccentColor(DEFAULT_ACCENT_COLOR)
        setAccentIntensity(DEFAULT_ACCENT_INTENSITY)
        setBasePaletteId(DEFAULT_SURFACE_TONE_ID)
        setGlobalRadius(DEFAULT_GLOBAL_RADIUS)
        setFormRadius(DEFAULT_FORM_RADIUS)
        markThemeLibraryDirty()
        setFavoritePresetId(undefined)
        setThemeLibrary([])
        setThemeImportValue("")
        setThemeDraftName("")
        setSelectedThemeId("")
        setPendingRandomPresetId(undefined)
        setLastRandomUndoPresetId(undefined)
        setLastAppliedRandomPresetId(undefined)
        clearAppearanceStorage()
        if (typeof window !== "undefined") {
            removeLocalStorageItem(APPEARANCE_LIBRARY_STORAGE_KEY)
            removeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY)
            removeLocalStorageItem(APPEARANCE_LIBRARY_SYNC_STORAGE_KEY)
        }
        showToastSuccess(t("settings:appearance.toast.themeResetToDefaults"))
    }

    return (
        <FormLayout
            title={t("settings:appearance.pageTitle")}
            description={t("settings:appearance.pageSubtitle")}
        >
            <LanguageSection />

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.themeControls")}
                    </p>
                    <Button variant="flat" onPress={handleResetTheme}>
                        {t("settings:appearance.resetToDefault")}
                    </Button>
                </CardHeader>
                <CardBody className="space-y-3">
                    <ThemeToggle />
                    <div className="sr-only">
                        <Chip size="sm" variant="flat">
                            {t("settings:appearance.chipMode", { value: mode })}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            {t("settings:appearance.chipPreset", { value: preset })}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            {t("settings:appearance.chipResolved", { value: resolvedMode })}
                        </Chip>
                        {lastAppliedRandomPreset !== undefined ? (
                            <Chip size="sm" variant="flat">
                                {t("settings:appearance.chipLastRandom", {
                                    value: lastAppliedRandomPreset.label,
                                })}
                            </Chip>
                        ) : null}
                    </div>
                    <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-subtle">
                            {t("settings:appearance.quickPresets")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {quickPresetOptions.map(
                                (themePreset): ReactElement => (
                                    <Button
                                        key={themePreset.id}
                                        aria-label={`Quick preset ${themePreset.label}`}
                                        radius="full"
                                        size="sm"
                                        color="primary"
                                        variant={themePreset.id === preset ? "solid" : "flat"}
                                        onPress={(): void => {
                                            setPreset(themePreset.id)
                                        }}
                                    >
                                        {themePreset.label}
                                    </Button>
                                ),
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                aria-keyshortcuts="Alt+R"
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={selectRandomPresetPreview}
                            >
                                {t("settings:appearance.randomPreset")}
                            </Button>
                            {lastRandomUndoPresetId !== undefined ? (
                                <Button
                                    radius="full"
                                    size="sm"
                                    variant="flat"
                                    onPress={handleUndoRandomPreset}
                                >
                                    {t("settings:appearance.undoLastRandom")}
                                </Button>
                            ) : null}
                        </div>
                        {pendingRandomPreset !== undefined ? (
                            <div className="rounded-lg border border-border bg-surface-muted p-3">
                                <p className="text-sm font-semibold text-foreground">
                                    {t("settings:appearance.previewPreset", {
                                        label: pendingRandomPreset.label,
                                    })}
                                </p>
                                <p className="mt-1 text-xs text-text-secondary">
                                    {t("settings:appearance.previewPresetHint")}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                        color="primary"
                                        size="sm"
                                        onPress={handleApplyRandomPreset}
                                    >
                                        {t("settings:appearance.applyRandomPreset")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={(): void => {
                                            setPendingRandomPresetId(undefined)
                                        }}
                                    >
                                        {t("settings:appearance.cancelRandomPreview")}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.advancedControls")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
                            <p className="text-sm font-semibold text-foreground">
                                {t("settings:appearance.accentControl")}
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    aria-label="Accent color picker"
                                    className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
                                    type="color"
                                    value={accentColor}
                                    onChange={(event): void => {
                                        setAccentColor(event.currentTarget.value)
                                    }}
                                />
                                <p className="text-xs font-mono text-text-secondary">
                                    {effectiveAccentColor}
                                </p>
                            </div>
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-text-subtle"
                                htmlFor="accent-intensity-slider"
                            >
                                {t("settings:appearance.accentIntensity", {
                                    value: accentIntensity,
                                })}
                            </label>
                            <input
                                aria-label="Accent intensity slider"
                                className="w-full accent-primary"
                                id="accent-intensity-slider"
                                max={MAX_INTENSITY}
                                min={MIN_INTENSITY}
                                type="range"
                                value={accentIntensity}
                                onChange={(event): void => {
                                    setAccentIntensity(Number(event.currentTarget.value))
                                }}
                            />
                        </div>

                        <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
                            <p className="text-sm font-semibold text-foreground">
                                {t("settings:appearance.basePalette")}
                            </p>
                            <div
                                aria-label="Base palette picker"
                                className="flex flex-wrap gap-2"
                                role="group"
                            >
                                {SURFACE_TONES.map(
                                    (tone): ReactElement => (
                                        <Button
                                            key={tone.id}
                                            aria-pressed={basePaletteId === tone.id}
                                            radius="full"
                                            size="sm"
                                            color="primary"
                                            variant={basePaletteId === tone.id ? "solid" : "flat"}
                                            onPress={(): void => {
                                                setBasePaletteId(tone.id)
                                            }}
                                        >
                                            {tone.label}
                                        </Button>
                                    ),
                                )}
                            </div>
                            <p className="text-xs text-text-secondary">
                                {getSurfaceTone(basePaletteId).description}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-text-subtle"
                                htmlFor="global-radius-slider"
                            >
                                {t("settings:appearance.globalRadius", { value: globalRadius })}
                            </label>
                            <input
                                aria-label="Global radius slider"
                                className="w-full accent-primary"
                                id="global-radius-slider"
                                max={MAX_RADIUS}
                                min={MIN_RADIUS}
                                type="range"
                                value={globalRadius}
                                onChange={(event): void => {
                                    setGlobalRadius(Number(event.currentTarget.value))
                                }}
                            />
                        </div>
                        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-text-subtle"
                                htmlFor="form-radius-slider"
                            >
                                {t("settings:appearance.formRadius", { value: formRadius })}
                            </label>
                            <input
                                aria-label="Form radius slider"
                                className="w-full accent-primary"
                                id="form-radius-slider"
                                max={MAX_FORM_RADIUS}
                                min={MIN_FORM_RADIUS}
                                type="range"
                                value={formRadius}
                                onChange={(event): void => {
                                    setFormRadius(Number(event.currentTarget.value))
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <Chip size="sm" variant="flat">
                            {t("settings:appearance.chipBase", { value: basePaletteId })}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            {t("settings:appearance.chipGlobalRadius", { value: globalRadius })}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            {t("settings:appearance.chipFormRadius", { value: formRadius })}
                        </Chip>
                        <Chip
                            color={isAccessibleContrast ? "success" : "warning"}
                            size="sm"
                            variant="flat"
                        >
                            {t("settings:appearance.chipContrast", {
                                value: contrastRatio.toFixed(2),
                                level: isAccessibleContrast ? "AA" : "check",
                            })}
                        </Chip>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.themeLibrary")}
                    </p>
                    <Chip
                        color={
                            librarySyncStatus === "synced"
                                ? "success"
                                : librarySyncStatus === "error"
                                  ? "warning"
                                  : "default"
                        }
                        size="sm"
                        variant="flat"
                    >
                        {t("settings:appearance.chipSync", { value: librarySyncStatus })}
                    </Chip>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="rounded-lg border border-border bg-surface p-3">
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:appearance.favoritePreset")}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                            {t("settings:appearance.chipPinned", { value: favoritePresetLabel })}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant="flat" onPress={handlePinCurrentPreset}>
                                {t("settings:appearance.pinCurrentPreset")}
                            </Button>
                            <Button
                                isDisabled={favoritePresetId === undefined}
                                size="sm"
                                variant="flat"
                                onPress={handleApplyFavoritePreset}
                            >
                                {t("settings:appearance.applyFavoritePreset")}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
                        <Input
                            label={t("settings:appearance.themeName")}
                            placeholder="Security Focus Theme"
                            value={themeDraftName}
                            onValueChange={setThemeDraftName}
                        />
                        <div className="flex flex-col gap-1">
                            <label
                                className="text-sm text-text-tertiary"
                                htmlFor="theme-library-selected"
                            >
                                {t("settings:appearance.libraryThemes")}
                            </label>
                            <select
                                aria-label="Theme library selection"
                                className={NATIVE_FORM.select}
                                id="theme-library-selected"
                                value={selectedThemeId}
                                onChange={(event): void => {
                                    setSelectedThemeId(event.currentTarget.value)
                                }}
                            >
                                {selectedThemeId.length === 0 ? (
                                    <option value="">{t("settings:appearance.selectTheme")}</option>
                                ) : null}
                                {themeLibrary.map(
                                    (themeItem): ReactElement => (
                                        <option key={themeItem.id} value={themeItem.id}>
                                            {themeItem.name}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button color="primary" onPress={handleCreateLibraryTheme}>
                                {t("settings:appearance.saveCurrentTheme")}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="flat"
                            onPress={handleApplyLibraryTheme}
                        >
                            {t("settings:appearance.applySelected")}
                        </Button>
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="flat"
                            onPress={handleRenameLibraryTheme}
                        >
                            {t("settings:appearance.renameSelected")}
                        </Button>
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="flat"
                            onPress={handleDuplicateLibraryTheme}
                        >
                            {t("settings:appearance.duplicateSelected")}
                        </Button>
                        <Button
                            color="danger"
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="ghost"
                            onPress={handleDeleteLibraryTheme}
                        >
                            {t("settings:appearance.deleteSelected")}
                        </Button>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:appearance.importExportJson")}
                        </p>
                        <textarea
                            aria-label="Theme library json"
                            className="min-h-28 w-full rounded-lg border border-border bg-surface-muted p-3 text-xs"
                            placeholder='{"version":1,"themes":[...]}'
                            value={themeImportValue}
                            onChange={(event): void => {
                                setThemeImportValue(event.currentTarget.value)
                            }}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="flat" onPress={handleExportThemeLibrary}>
                                {t("settings:appearance.exportLibraryJson")}
                            </Button>
                            <Button size="sm" variant="flat" onPress={handleImportThemeLibrary}>
                                {t("settings:appearance.importLibraryJson")}
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.livePreview")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-border bg-surface p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-text-subtle">
                                {t("settings:appearance.primaryAction")}
                            </p>
                            <button
                                className="mt-2 rounded-full border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                                style={{ borderRadius: `${globalRadius}px` }}
                                type="button"
                            >
                                {t("settings:appearance.previewButton")}
                            </button>
                            <button
                                className="ml-2 mt-2 rounded-full border border-accent bg-accent px-3 py-1.5 text-sm text-accent-foreground"
                                style={{ borderRadius: `${globalRadius}px` }}
                                type="button"
                            >
                                {t("settings:appearance.accentAction")}
                            </button>
                        </div>
                        <div className="rounded-lg border border-border bg-surface p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-text-subtle">
                                {t("settings:appearance.accentAndSurface")}
                            </p>
                            <div className="mt-2 flex gap-2">
                                <span className="h-6 w-6 rounded-full bg-accent" />
                                <span className="h-6 w-6 rounded-full bg-surface-muted" />
                            </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-text-subtle">
                                {t("settings:appearance.formControls")}
                            </p>
                            <Input
                                aria-label="Appearance preview input"
                                className="mt-2"
                                placeholder="Preview input"
                                style={{ borderRadius: `${formRadius}px` }}
                                value={previewFieldValue}
                                onValueChange={setPreviewFieldValue}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-text-secondary">
                        {t("settings:appearance.presetOptions", {
                            list: presets
                                .map((themePreset): string => themePreset.label)
                                .join(", "),
                        })}
                    </p>
                </CardBody>
            </Card>
        </FormLayout>
    )
}
