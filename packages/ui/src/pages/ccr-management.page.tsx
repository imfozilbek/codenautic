import { type ChangeEvent, type ReactElement, useEffect, useMemo, useState } from "react"

import { FOCUS_REVIEWS_FILTERS_EVENT } from "@/lib/keyboard/shortcut-registry"
import { ReviewsContent, type IReviewRow } from "@/components/reviews/reviews-content"
import { MOCK_CCR_ROWS, type ICcrRowData } from "@/pages/ccr-data"

/** Параметры URL-фильтров для страницы CCR. */
export interface ICcrFilters {
    /** Поисковый текст. */
    readonly search: string
    /** Фильтр по статусу. */
    readonly status: string
    /** Фильтр по команде. */
    readonly team: string
    /** Фильтр по репозиторию. */
    readonly repository: string
}

/** Формат строки CCR для списка. */
type ICcrRow = ICcrRowData

/** Параметры страницы CCR Management. */
export interface ICcrManagementPageProps extends ICcrFilters {
    /** Callback обновления фильтров в URL. */
    readonly onFilterChange: (next: ICcrFilters) => void
}

const PAGE_SIZE = 8
const CCR_SORT_ORDER = ["new", "queued", "in_progress", "approved", "rejected"] as const
export const CCR_FILTER_PRESETS_STORAGE_KEY = "codenautic:ui:ccr-filter-presets:v1"
type TCcrFilterField = keyof ICcrFilters
type TCcrFilterPresetField = "name" | "selected"

interface ICcrFilterPreset {
    readonly id: string
    readonly name: string
    readonly filters: ICcrFilters
}

interface ICcrFilterPresetsState {
    readonly presetName: string
    readonly selectedPresetId: string
    readonly presets: ReadonlyArray<ICcrFilterPreset>
    readonly setField: (field: TCcrFilterPresetField, value: string) => void
    readonly savePreset: () => void
    readonly applyPreset: () => void
    readonly updatePreset: () => void
    readonly deletePreset: () => void
}

function isCcrFilterField(value: string): value is TCcrFilterField {
    return value === "search" || value === "status" || value === "team" || value === "repository"
}

function toFilterMatch(fieldValue: string, filterValue: string): boolean {
    if (filterValue.length === 0 || filterValue === "all") {
        return true
    }

    return fieldValue === filterValue
}

function createSortedOptions(values: ReadonlyArray<string>): ReadonlyArray<string> {
    return Array.from(new Set(values)).sort()
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function parseStoredCcrFilters(value: unknown): ICcrFilters | null {
    if (isRecord(value) === false) {
        return null
    }

    if (
        typeof value.search !== "string" ||
        typeof value.status !== "string" ||
        typeof value.team !== "string" ||
        typeof value.repository !== "string"
    ) {
        return null
    }

    return {
        repository: value.repository,
        search: value.search,
        status: value.status,
        team: value.team,
    }
}

function parseStoredPreset(value: unknown): ICcrFilterPreset | null {
    if (isRecord(value) === false) {
        return null
    }

    if (typeof value.id !== "string" || value.id.trim().length === 0) {
        return null
    }

    if (typeof value.name !== "string" || value.name.trim().length === 0) {
        return null
    }

    const filters = parseStoredCcrFilters(value.filters)
    if (filters === null) {
        return null
    }

    return {
        filters,
        id: value.id,
        name: value.name,
    }
}

function readStoredFilterPresets(): ReadonlyArray<ICcrFilterPreset> {
    if (typeof window === "undefined") {
        return []
    }

    try {
        const raw = window.localStorage.getItem(CCR_FILTER_PRESETS_STORAGE_KEY)
        if (raw === null) {
            return []
        }
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed) === false) {
            return []
        }

        return parsed.reduce<ICcrFilterPreset[]>((accumulator, item): ICcrFilterPreset[] => {
            const preset = parseStoredPreset(item)
            if (preset !== null) {
                accumulator.push(preset)
            }
            return accumulator
        }, [])
    } catch (_error: unknown) {
        return []
    }
}

function writeStoredFilterPresets(presets: ReadonlyArray<ICcrFilterPreset>): void {
    if (typeof window === "undefined") {
        return
    }

    try {
        window.localStorage.setItem(CCR_FILTER_PRESETS_STORAGE_KEY, JSON.stringify(presets))
    } catch (_error: unknown) {
        return
    }
}

function createFilterPresetId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }

    return `preset-${String(Date.now())}`
}

function findFilterOptions(rows: ReadonlyArray<ICcrRow>): {
    readonly statusOptions: ReadonlyArray<string>
    readonly teamOptions: ReadonlyArray<string>
    readonly repositoryOptions: ReadonlyArray<string>
} {
    const statusValues: string[] = [ ...CCR_SORT_ORDER ]
    const teamValues: string[] = []
    const repositoryValues: string[] = []

    for (const row of rows) {
        statusValues.push(String(row.status))
        teamValues.push(String(row.team))
        repositoryValues.push(String(row.repository))
    }

    return {
        statusOptions: createSortedOptions(statusValues),
        teamOptions: createSortedOptions(teamValues),
        repositoryOptions: createSortedOptions(repositoryValues),
    }
}

/**
 * Преобразует значение в нижний регистр безопасно.
 *
 * @param value Исходная строка.
 * @returns Lowercase представление.
 */
function toLowerSafe(value: string): string {
    return value.toLowerCase()
}

function filterRows(rows: ReadonlyArray<ICcrRow>, filters: ICcrFilters): ReadonlyArray<ICcrRow> {
    const search = String(filters.search).trim().toLowerCase()

    return rows.filter((row): boolean => {
        const rowStatus = String(row.status)
        const rowTeam = String(row.team)
        const rowRepository = String(row.repository)
        const rowIdentifier = String(row.id)
        const isStatusMatch = toFilterMatch(rowStatus, String(filters.status))
        const isTeamMatch = toFilterMatch(rowTeam, String(filters.team))
        const isRepoMatch = toFilterMatch(rowRepository, String(filters.repository))
        const isSearchMatch =
            search.length === 0 ||
            toLowerSafe(rowIdentifier).includes(search) ||
            toLowerSafe(String(row.title)).includes(search) ||
            toLowerSafe(rowRepository).includes(search) ||
            toLowerSafe(String(row.assignee)).includes(search)

        return isStatusMatch && isTeamMatch && isRepoMatch && isSearchMatch
    })
}

interface ICcrFiltersPanelProps {
    readonly filterState: ICcrFilters
    readonly statusOptions: ReadonlyArray<string>
    readonly teamOptions: ReadonlyArray<string>
    readonly repositoryOptions: ReadonlyArray<string>
    readonly onFilterChange: (next: ICcrFilters) => void
}

interface ICcrFilterPresetsPanelProps {
    readonly presetName: string
    readonly presets: ReadonlyArray<ICcrFilterPreset>
    readonly selectedPresetId: string
    readonly onFieldChange: (field: TCcrFilterPresetField, value: string) => void
    readonly onSavePreset: () => void
    readonly onApplyPreset: () => void
    readonly onUpdatePreset: () => void
    readonly onDeletePreset: () => void
}

function CcrFiltersPanel(props: ICcrFiltersPanelProps): ReactElement {
    const handleInputChange = (name: TCcrFilterField, value: string): void => {
        props.onFilterChange({
            ...props.filterState,
            [name]: value,
        })
    }

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        handleInputChange("search", event.currentTarget.value)
    }

    const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const name = event.currentTarget.name
        if (isCcrFilterField(name) === false) {
            return
        }

        handleInputChange(name, event.currentTarget.value)
    }

    return (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
            <input
                aria-label="Search CCR"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                name="search"
                placeholder="Search title / id / repo / assignee"
                value={props.filterState.search}
                onChange={handleSearchChange}
            />
            <select
                aria-label="Filter by team"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                name="team"
                value={props.filterState.team}
                onChange={handleSelectChange}
            >
                <option value="all">All teams</option>
                {props.teamOptions.map(
                    (team): ReactElement => (
                        <option key={team} value={team}>
                            {team}
                        </option>
                    ),
                )}
            </select>
            <select
                aria-label="Filter by repository"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                name="repository"
                value={props.filterState.repository}
                onChange={handleSelectChange}
            >
                <option value="all">All repos</option>
                {props.repositoryOptions.map(
                    (repository): ReactElement => (
                        <option key={repository} value={repository}>
                            {repository}
                        </option>
                    ),
                )}
            </select>
            <select
                aria-label="Filter by status"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                name="status"
                value={props.filterState.status}
                onChange={handleSelectChange}
            >
                <option value="all">All statuses</option>
                {props.statusOptions.map(
                    (status): ReactElement => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ),
                )}
            </select>
        </div>
    )
}

function CcrFilterPresetsPanel(props: ICcrFilterPresetsPanelProps): ReactElement {
    const hasSelectedPreset = props.selectedPresetId.length > 0

    return (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-6">
            <input
                aria-label="Filter preset name"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none md:col-span-2"
                placeholder="Preset name"
                value={props.presetName}
                onChange={(event): void => {
                    props.onFieldChange("name", event.currentTarget.value)
                }}
            />
            <select
                aria-label="Saved filter presets"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                value={props.selectedPresetId}
                onChange={(event): void => {
                    props.onFieldChange("selected", event.currentTarget.value)
                }}
            >
                <option value="">Select preset</option>
                {props.presets.map(
                    (preset): ReactElement => (
                        <option key={preset.id} value={preset.id}>
                            {preset.name}
                        </option>
                    ),
                )}
            </select>
            <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                type="button"
                onClick={props.onSavePreset}
            >
                Save preset
            </button>
            <div className="grid grid-cols-3 gap-2 md:col-span-6">
                <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={hasSelectedPreset === false}
                    type="button"
                    onClick={props.onApplyPreset}
                >
                    Apply preset
                </button>
                <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={hasSelectedPreset === false}
                    type="button"
                    onClick={props.onUpdatePreset}
                >
                    Update preset
                </button>
                <button
                    className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={hasSelectedPreset === false}
                    type="button"
                    onClick={props.onDeletePreset}
                >
                    Delete preset
                </button>
            </div>
        </div>
    )
}

function useCcrFilterPresets(
    currentFilters: ICcrFilters,
    onApplyFilters: (next: ICcrFilters) => void,
): ICcrFilterPresetsState {
    const [presetName, setPresetName] = useState<string>("")
    const [selectedPresetId, setSelectedPresetId] = useState<string>("")
    const [presets, setPresets] = useState<ReadonlyArray<ICcrFilterPreset>>(() => {
        return readStoredFilterPresets()
    })

    const setField = (field: TCcrFilterPresetField, value: string): void => {
        if (field === "name") {
            setPresetName(value)
            return
        }

        const selected = presets.find((preset): boolean => preset.id === value)
        setSelectedPresetId(value)
        if (selected !== undefined) {
            setPresetName(selected.name)
        }
    }

    const savePreset = (): void => {
        const normalizedName = presetName.trim()
        if (normalizedName.length === 0) {
            return
        }

        const preset: ICcrFilterPreset = {
            filters: currentFilters,
            id: createFilterPresetId(),
            name: normalizedName,
        }

        const nextPresets = [ ...presets, preset ]
        setPresets(nextPresets)
        writeStoredFilterPresets(nextPresets)
        setSelectedPresetId(preset.id)
        setPresetName(preset.name)
    }

    const applyPreset = (): void => {
        const selected = presets.find((preset): boolean => preset.id === selectedPresetId)
        if (selected === undefined) {
            return
        }

        onApplyFilters(selected.filters)
    }

    const updatePreset = (): void => {
        const selected = presets.find((preset): boolean => preset.id === selectedPresetId)
        if (selected === undefined) {
            return
        }

        const normalizedName = presetName.trim()
        const nextPresets = presets.map((preset): ICcrFilterPreset => {
            if (preset.id !== selected.id) {
                return preset
            }

            return {
                ...preset,
                filters: currentFilters,
                name: normalizedName.length > 0 ? normalizedName : preset.name,
            }
        })

        setPresets(nextPresets)
        writeStoredFilterPresets(nextPresets)
    }

    const deletePreset = (): void => {
        if (selectedPresetId.length === 0) {
            return
        }

        const nextPresets = presets.filter((preset): boolean => preset.id !== selectedPresetId)
        const nextSelectedPreset = nextPresets.at(0)
        setPresets(nextPresets)
        writeStoredFilterPresets(nextPresets)
        setSelectedPresetId(nextSelectedPreset?.id ?? "")
        setPresetName(nextSelectedPreset?.name ?? "")
    }

    return {
        applyPreset,
        deletePreset,
        presetName,
        presets,
        savePreset,
        selectedPresetId,
        setField,
        updatePreset,
    }
}

function useCcrFilters(): {
    readonly initialRows: ReadonlyArray<ICcrRow>
    readonly filterOptions: {
        readonly statusOptions: ReadonlyArray<string>
        readonly teamOptions: ReadonlyArray<string>
        readonly repositoryOptions: ReadonlyArray<string>
    }
} {
    const filters = useMemo((): {
        readonly statusOptions: ReadonlyArray<string>
        readonly teamOptions: ReadonlyArray<string>
        readonly repositoryOptions: ReadonlyArray<string>
    } => {
        return findFilterOptions(MOCK_CCR_ROWS)
    }, [])

    return {
        initialRows: MOCK_CCR_ROWS,
        filterOptions: filters,
    }
}

/**
 * Страница списочного управления CCR (reviews) с URL фильтрами и infinite-like loading.
 *
 * @param props Параметры фильтров и callback.
 * @returns Список CCR с поиском, фильтрами и бесконечной подгрузкой.
 */
export function CcrManagementPage(props: ICcrManagementPageProps): ReactElement {
    const [visibleItems, setVisibleItems] = useState<number>(PAGE_SIZE)
    const [searchState, setSearchState] = useState<ICcrFilters>({
        repository: props.repository,
        search: props.search,
        status: props.status,
        team: props.team,
    })

    useEffect((): void => {
        setSearchState({
            repository: props.repository,
            search: props.search,
            status: props.status,
            team: props.team,
        })
        setVisibleItems(PAGE_SIZE)
    }, [props.repository, props.search, props.status, props.team])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleFocusFilters = (): void => {
            const input = window.document.querySelector<HTMLInputElement>(
                'input[name="search"][placeholder="Search title / id / repo / assignee"]',
            )
            input?.focus()
            input?.select()
        }

        window.addEventListener(FOCUS_REVIEWS_FILTERS_EVENT, handleFocusFilters as EventListener)
        return (): void => {
            window.removeEventListener(
                FOCUS_REVIEWS_FILTERS_EVENT,
                handleFocusFilters as EventListener,
            )
        }
    }, [])

    const { filterOptions } = useCcrFilters()
    const filteredRows = useMemo((): ReadonlyArray<ICcrRow> => {
        return filterRows(MOCK_CCR_ROWS, searchState)
    }, [searchState])
    const visibleRows = useMemo((): ReadonlyArray<IReviewRow> => {
        return filteredRows.slice(0, visibleItems)
    }, [filteredRows, visibleItems])

    const handleLoadMore = (): void => {
        setVisibleItems((previousValue): number => {
            return Math.min(previousValue + PAGE_SIZE, filteredRows.length)
        })
    }

    const hasMore = filteredRows.length > visibleItems

    const updateFilters = (nextFilters: ICcrFilters): void => {
        setSearchState(nextFilters)
        props.onFilterChange(nextFilters)
    }
    const filterPresets = useCcrFilterPresets(searchState, updateFilters)

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">CCR Management</h1>
            <p className="text-sm text-slate-600">
                Filters are synced with URL. Shareable state for search, status, team and
                repository.
            </p>
            <CcrFiltersPanel
                filterState={searchState}
                onFilterChange={updateFilters}
                repositoryOptions={filterOptions.repositoryOptions}
                statusOptions={filterOptions.statusOptions}
                teamOptions={filterOptions.teamOptions}
            />
            <CcrFilterPresetsPanel
                onApplyPreset={filterPresets.applyPreset}
                onDeletePreset={filterPresets.deletePreset}
                onFieldChange={filterPresets.setField}
                onSavePreset={filterPresets.savePreset}
                onUpdatePreset={filterPresets.updatePreset}
                presetName={filterPresets.presetName}
                presets={filterPresets.presets}
                selectedPresetId={filterPresets.selectedPresetId}
            />
            <ReviewsContent
                hasMore={hasMore}
                isLoadingMore={false}
                onLoadMore={handleLoadMore}
                rows={visibleRows}
            />
        </section>
    )
}
