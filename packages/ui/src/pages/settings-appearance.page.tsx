import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button, Card, CardContent, CardHeader, Chip, Input } from "@heroui/react"
import {
    SUPPORTED_LOCALES,
    formatLocalizedDateTime,
    formatLocalizedNumber,
    useLocale,
} from "@/lib/i18n"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { type TThemePreset, useTheme } from "@/lib/theme/use-theme"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

import {
    APPEARANCE_ACCENT_STORAGE_KEY,
    APPEARANCE_FORM_RADIUS_STORAGE_KEY,
    APPEARANCE_INTENSITY_STORAGE_KEY,
    APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY,
    APPEARANCE_LIBRARY_STORAGE_KEY,
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
    buildThemeLibraryExportPayload,
    clearAppearanceStorage,
    createEffectiveAccentColor,
    createThemeLibraryId,
    parseThemeLibraryImportPayload,
    readStoredFavoritePreset,
    readStoredHexColor,
    readStoredNumber,
    readStoredThemeLibrary,
    removeLocalStorageItem,
    resolveThemeNameConflict,
    triggerJsonDownload,
    writeLocalStorageItem,
} from "./settings-appearance/appearance-settings.utils"

/**
 * Длина даты в ISO-строке (YYYY-MM-DD).
 */
const ISO_DATE_LENGTH = 10

/**
 * Секция выбора языка интерфейса с preview форматирования.
 *
 * @returns Карточка выбора языка.
 */
function LanguageSection(): ReactElement {
    const { t } = useTranslation(["settings"])
    const { locale, setLocale } = useLocale()

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Language / Язык</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div
                    aria-label={t("settings:ariaLabel.appearance.languageSelection")}
                    className="flex gap-2"
                    role="radiogroup"
                >
                    {SUPPORTED_LOCALES.map(
                        (localeOption): ReactElement => (
                            <Button
                                key={localeOption}
                                aria-pressed={localeOption === locale}
                                aria-selected={localeOption === locale}
                                size="sm"
                                variant={localeOption === locale ? "primary" : "secondary"}
                                onPress={(): void => {
                                    void setLocale(localeOption)
                                }}
                            >
                                {LOCALE_LABELS[localeOption]}
                            </Button>
                        ),
                    )}
                </div>
                <div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted">
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
            </CardContent>
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
    const { mode, preset, presets, resolvedMode, setMode, setPreset } = useTheme()
    const availablePresetIds = useMemo(
        (): ReadonlyArray<TThemePreset> =>
            presets.map((themePreset): TThemePreset => themePreset.id),
        [presets],
    )
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
    const [favoritePresetId, setFavoritePresetId] = useState<TThemePreset | undefined>(() =>
        readStoredFavoritePreset(availablePresetIds),
    )
    const [pendingRandomPresetId, setPendingRandomPresetId] = useState<TThemePreset | undefined>(
        undefined,
    )
    const [lastRandomUndoPresetId, setLastRandomUndoPresetId] = useState<TThemePreset | undefined>(
        undefined,
    )
    const [lastAppliedRandomPresetId, setLastAppliedRandomPresetId] = useState<
        TThemePreset | undefined
    >(undefined)

    const effectiveAccentColor = useMemo(
        (): string => createEffectiveAccentColor(accentColor, accentIntensity, resolvedMode),
        [accentColor, accentIntensity, resolvedMode],
    )

    const accessiblePresetIds = useMemo(
        (): ReadonlyArray<TThemePreset> => presets.map((p): TThemePreset => p.id),
        [presets],
    )

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
            basePaletteId: "neutral",
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
            `theme-library-${new Date().toISOString().slice(0, ISO_DATE_LENGTH)}.json`,
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
        root.style.setProperty("--radius-sm", `${smRadius}px`)
        root.style.setProperty("--radius-md", `${mdRadius}px`)
        root.style.setProperty("--radius-lg", `${lgRadius}px`)
        root.style.setProperty("--radius-form", `${formRadius}px`)

        writeLocalStorageItem(APPEARANCE_ACCENT_STORAGE_KEY, accentColor)
        writeLocalStorageItem(APPEARANCE_INTENSITY_STORAGE_KEY, String(accentIntensity))
        writeLocalStorageItem(APPEARANCE_RADIUS_STORAGE_KEY, String(globalRadius))
        writeLocalStorageItem(APPEARANCE_FORM_RADIUS_STORAGE_KEY, String(formRadius))
    }, [accentColor, accentIntensity, effectiveAccentColor, formRadius, globalRadius, mode, preset])

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

    useEffect((): void => {
        if (typeof window === "undefined") {
            return
        }

        writeLocalStorageItem(APPEARANCE_LIBRARY_STORAGE_KEY, JSON.stringify(themeLibrary))
        if (favoritePresetId !== undefined) {
            writeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY, favoritePresetId)
        } else {
            removeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY)
        }
    }, [favoritePresetId, themeLibrary])

    const handleResetTheme = (): void => {
        const defaultPreset = presets.at(0)?.id
        setMode("system")
        if (defaultPreset !== undefined) {
            setPreset(defaultPreset)
        }
        setAccentColor(DEFAULT_ACCENT_COLOR)
        setAccentIntensity(DEFAULT_ACCENT_INTENSITY)
        setGlobalRadius(DEFAULT_GLOBAL_RADIUS)
        setFormRadius(DEFAULT_FORM_RADIUS)

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
        }
        showToastSuccess(t("settings:appearance.toast.themeResetToDefaults"))
    }

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]"><div className="space-y-1.5"><h1 className={TYPOGRAPHY.pageTitle}>{t("settings:appearance.pageTitle")}</h1><p className={TYPOGRAPHY.bodyMuted}>{t("settings:appearance.pageSubtitle")}</p></div><div className="space-y-6">
            <LanguageSection />

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.themeControls")}
                    </p>
                    <Button variant="secondary" onPress={handleResetTheme}>
                        {t("settings:appearance.resetToDefault")}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ThemeToggle />
                    <div className="sr-only">
                        <Chip size="sm" variant="soft">
                            {t("settings:appearance.chipMode", { value: mode })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:appearance.chipPreset", { value: preset })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:appearance.chipResolved", { value: resolvedMode })}
                        </Chip>
                        {lastAppliedRandomPreset !== undefined ? (
                            <Chip size="sm" variant="soft">
                                {t("settings:appearance.chipLastRandom", {
                                    value: lastAppliedRandomPreset.label,
                                })}
                            </Chip>
                        ) : null}
                    </div>
                    <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted">
                            {t("settings:appearance.quickPresets")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {quickPresetOptions.map(
                                (themePreset): ReactElement => (
                                    <Button
                                        key={themePreset.id}
                                        aria-label={`Quick preset ${themePreset.label}`}
                                        className="rounded-full"
                                        size="sm"
                                        variant={
                                            themePreset.id === preset ? "primary" : "secondary"
                                        }
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
                                className="rounded-full"
                                size="sm"
                                variant="secondary"
                                onPress={selectRandomPresetPreview}
                            >
                                {t("settings:appearance.randomPreset")}
                            </Button>
                            {lastRandomUndoPresetId !== undefined ? (
                                <Button
                                    className="rounded-full"
                                    size="sm"
                                    variant="secondary"
                                    onPress={handleUndoRandomPreset}
                                >
                                    {t("settings:appearance.undoLastRandom")}
                                </Button>
                            ) : null}
                        </div>
                        {pendingRandomPreset !== undefined ? (
                            <div className="rounded-lg border border-border bg-surface-secondary p-3">
                                <p className="text-sm font-semibold text-foreground">
                                    {t("settings:appearance.previewPreset", {
                                        label: pendingRandomPreset.label,
                                    })}
                                </p>
                                <p className="mt-1 text-xs text-muted">
                                    {t("settings:appearance.previewPresetHint")}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onPress={handleApplyRandomPreset}
                                    >
                                        {t("settings:appearance.applyRandomPreset")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.advancedControls")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
                            <p className="text-sm font-semibold text-foreground">
                                {t("settings:appearance.accentControl")}
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    aria-label={t(
                                        "settings:ariaLabel.appearance.accentColorPicker",
                                    )}
                                    className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
                                    type="color"
                                    value={accentColor}
                                    onChange={(event): void => {
                                        setAccentColor(event.currentTarget.value)
                                    }}
                                />
                                <p className="text-xs font-mono text-muted">
                                    {effectiveAccentColor}
                                </p>
                            </div>
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-muted"
                                htmlFor="accent-intensity-slider"
                            >
                                {t("settings:appearance.accentIntensity", {
                                    value: accentIntensity,
                                })}
                            </label>
                            <input
                                aria-label={t(
                                    "settings:ariaLabel.appearance.accentIntensitySlider",
                                )}
                                className="w-full accent-accent"
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
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-muted"
                                htmlFor="global-radius-slider"
                            >
                                {t("settings:appearance.globalRadius", { value: globalRadius })}
                            </label>
                            <input
                                aria-label={t("settings:ariaLabel.appearance.globalRadiusSlider")}
                                className="w-full accent-accent"
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
                                className="text-xs uppercase tracking-[0.12em] text-muted"
                                htmlFor="form-radius-slider"
                            >
                                {t("settings:appearance.formRadius", { value: formRadius })}
                            </label>
                            <input
                                aria-label={t("settings:ariaLabel.appearance.formRadiusSlider")}
                                className="w-full accent-accent"
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

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Chip size="sm" variant="soft">
                            {t("settings:appearance.chipGlobalRadius", { value: globalRadius })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:appearance.chipFormRadius", { value: formRadius })}
                        </Chip>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.themeLibrary")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border bg-surface p-3">
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:appearance.favoritePreset")}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            {t("settings:appearance.chipPinned", { value: favoritePresetLabel })}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onPress={handlePinCurrentPreset}>
                                {t("settings:appearance.pinCurrentPreset")}
                            </Button>
                            <Button
                                isDisabled={favoritePresetId === undefined}
                                size="sm"
                                variant="secondary"
                                onPress={handleApplyFavoritePreset}
                            >
                                {t("settings:appearance.applyFavoritePreset")}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
                        <Input
                            aria-label={t("settings:appearance.themeName")}
                            placeholder="Security Focus Theme"
                            value={themeDraftName}
                            onChange={(e): void => {
                                setThemeDraftName(e.target.value)
                            }}
                        />
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-muted" htmlFor="theme-library-selected">
                                {t("settings:appearance.libraryThemes")}
                            </label>
                            <select
                                aria-label={t(
                                    "settings:ariaLabel.appearance.themeLibrarySelection",
                                )}
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
                            <Button variant="primary" onPress={handleCreateLibraryTheme}>
                                {t("settings:appearance.saveCurrentTheme")}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="secondary"
                            onPress={handleApplyLibraryTheme}
                        >
                            {t("settings:appearance.applySelected")}
                        </Button>
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="secondary"
                            onPress={handleRenameLibraryTheme}
                        >
                            {t("settings:appearance.renameSelected")}
                        </Button>
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="secondary"
                            onPress={handleDuplicateLibraryTheme}
                        >
                            {t("settings:appearance.duplicateSelected")}
                        </Button>
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="danger"
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
                            aria-label={t("settings:ariaLabel.appearance.themeLibraryJson")}
                            className="min-h-28 w-full rounded-lg border border-border bg-surface-secondary p-3 text-xs"
                            placeholder='{"version":1,"themes":[...]}'
                            value={themeImportValue}
                            onChange={(event): void => {
                                setThemeImportValue(event.currentTarget.value)
                            }}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={handleExportThemeLibrary}
                            >
                                {t("settings:appearance.exportLibraryJson")}
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={handleImportThemeLibrary}
                            >
                                {t("settings:appearance.importLibraryJson")}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:appearance.livePreview")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-border bg-surface p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted">
                                {t("settings:appearance.primaryAction")}
                            </p>
                            <button
                                className="mt-2 rounded-full border border-accent bg-accent px-3 py-1.5 text-sm text-accent-foreground"
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
                            <p className="text-xs uppercase tracking-[0.14em] text-muted">
                                {t("settings:appearance.accentAndSurface")}
                            </p>
                            <div className="mt-2 flex gap-2">
                                <span className="h-6 w-6 rounded-full bg-accent" />
                                <span className="h-6 w-6 rounded-full bg-surface-secondary" />
                            </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted">
                                {t("settings:appearance.formControls")}
                            </p>
                            <Input
                                aria-label={t("settings:ariaLabel.appearance.previewInput")}
                                className="mt-2"
                                placeholder="Preview input"
                                style={{ borderRadius: `${formRadius}px` }}
                                value={previewFieldValue}
                                onChange={(e): void => {
                                    setPreviewFieldValue(e.target.value)
                                }}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted">
                        {t("settings:appearance.presetOptions", {
                            list: presets
                                .map((themePreset): string => themePreset.label)
                                .join(", "),
                        })}
                    </p>
                </CardContent>
            </Card>
        </div></div>
    )
}
