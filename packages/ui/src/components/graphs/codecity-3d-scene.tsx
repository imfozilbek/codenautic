import {
    Suspense,
    lazy,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type ReactElement,
} from "react"

interface ICodeCity3DSceneFileDescriptor {
    /** Уникальный ID файла. */
    readonly id: string
    /** Путь файла. */
    readonly path: string
    /** Объём строк кода. */
    readonly loc?: number
    /** Оценка сложности. */
    readonly complexity?: number
    /** Покрытие файла тестами. */
    readonly coverage?: number
    /** Частота внесения багов по окнам наблюдения. */
    readonly bugIntroductions?: Readonly<Partial<Record<"7d" | "30d" | "90d", number>>>
}

/**
 * Тип воздействия файла в CCR impact-наборах.
 */
export type TCodeCityImpactType = "changed" | "impacted" | "ripple"

/**
 * Дескриптор файла с impact-контекстом для 3D подсветки.
 */
export interface ICodeCity3DSceneImpactedFileDescriptor {
    /** Идентификатор файла (совпадает с id в files). */
    readonly fileId: string
    /** Тип воздействия для визуализации. */
    readonly impactType: TCodeCityImpactType
}

/**
 * Тип связи в causal 3D-дугах.
 */
export type TCodeCityCausalCouplingType = "temporal" | "dependency" | "ownership"

/**
 * Связь между файлами для causal arc overlay.
 */
export interface ICodeCity3DCausalCouplingDescriptor {
    /** Исходный файл связи. */
    readonly sourceFileId: string
    /** Целевой файл связи. */
    readonly targetFileId: string
    /** Категория связи для цветовой кодировки. */
    readonly couplingType: TCodeCityCausalCouplingType
    /** Сила связи (0..1). */
    readonly strength: number
}

/**
 * Пресеты позиции камеры для 3D CodeCity.
 */
export type TCodeCityCameraPreset = "bird-eye" | "street-level" | "focus-on-building"

/**
 * Параметры 3D CodeCity preview.
 */
export interface ICodeCity3DSceneProps {
    /** Заголовок для ARIA/описания сцены. */
    readonly title: string
    /** Набор файлов для генерации зданий. */
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
    /** Набор impact-файлов для подсветки зданий. */
    readonly impactedFiles?: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>
    /** Causal coupling связи для 3D arc overlay. */
    readonly causalCouplings?: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor>
    /** Цепочка файлов для 3D chain navigation. */
    readonly navigationChainFileIds?: ReadonlyArray<string>
    /** Текущий активный файл в root-cause chain navigation. */
    readonly navigationActiveFileId?: string
    /** Текстовый лейбл цепочки для breadcrumb overlay. */
    readonly navigationLabel?: string
    /** Высота canvas-контейнера. */
    readonly height?: number
}

const LazyCodeCity3DSceneRenderer = lazy(
    async (): Promise<{
        default: (props: {
            readonly cameraPreset: TCodeCityCameraPreset
            readonly causalCouplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor>
            readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
            readonly impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>
            readonly navigationChainFileIds: ReadonlyArray<string>
            readonly navigationActiveFileId?: string
            readonly selectedFileId?: string
            readonly onBuildingHover?: (fileId: string | undefined) => void
            readonly onBuildingSelect?: (fileId: string | undefined) => void
        }) => ReactElement
    }> => {
        const module = await import("./codecity-3d-scene-renderer")
        return {
            default: module.CodeCity3DSceneRenderer,
        }
    },
)

const CAMERA_PRESET_OPTIONS: ReadonlyArray<{
    readonly id: TCodeCityCameraPreset
    readonly label: string
}> = [
    {
        id: "bird-eye",
        label: "Bird eye",
    },
    {
        id: "street-level",
        label: "Street level",
    },
    {
        id: "focus-on-building",
        label: "Focus building",
    },
] as const

interface ICodeCity3DSnapshot {
    readonly id: string
    readonly label: string
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

const TIMELINE_SNAPSHOT_RATIOS: ReadonlyArray<number> = [0.35, 0.55, 0.75, 0.9, 1]
const TIMELINE_PLAYBACK_INTERVAL_MS = 1200
const CAUSAL_REPLAY_BASE_INTERVAL_MS = 1500
const CAUSAL_REPLAY_SPEED_OPTIONS = [0.5, 1, 2] as const
const CHAIN_NAVIGATION_INTERVAL_MS = 900
const GPU_MEMORY_BUDGET_MB = 220
const ESTIMATED_GPU_COST_PER_BUILDING_MB = 1.1
const WEAK_DEVICE_MAX_CORES = 4
const WEAK_DEVICE_MAX_MEMORY_GB = 4
const WEAK_DEVICE_MIN_TEXTURE_SIZE = 4096
type TCausalReplaySpeed = (typeof CAUSAL_REPLAY_SPEED_OPTIONS)[number]

interface ICodeCity3DRenderCapability {
    readonly isWebGlSupported: boolean
    readonly shouldUse2DFallback: boolean
    readonly reason: string
}

/**
 * Создаёт pre-computed snapshots для time-lapse проигрывания роста города.
 *
 * @param files Базовый набор файлов репозитория.
 * @returns Набор последовательных snapshot-срезов.
 */
function createCodeCityTimelineSnapshots(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCity3DSnapshot> {
    if (files.length === 0) {
        return [
            {
                files: [],
                id: "snapshot-0",
                label: "Commit #1",
            },
        ]
    }

    const sortedFiles = [...files].sort((leftFile, rightFile): number => {
        return leftFile.path.localeCompare(rightFile.path)
    })

    return TIMELINE_SNAPSHOT_RATIOS.map((ratio, index): ICodeCity3DSnapshot => {
        const snapshotSize = Math.max(1, Math.ceil(sortedFiles.length * ratio))
        const snapshotFiles = sortedFiles
            .slice(0, snapshotSize)
            .map((file): ICodeCity3DSceneFileDescriptor => {
                const nextLoc = Math.max(8, Math.round((file.loc ?? 24) * ratio))
                const nextComplexity = Math.max(1, Math.round((file.complexity ?? 4) * ratio))
                const nextCoverage =
                    file.coverage !== undefined
                        ? Math.min(
                              100,
                              Math.max(20, Math.round(file.coverage * (0.82 + ratio * 0.18))),
                          )
                        : undefined

                return {
                    ...file,
                    complexity: nextComplexity,
                    coverage: nextCoverage,
                    loc: nextLoc,
                }
            })

        return {
            files: snapshotFiles,
            id: `snapshot-${String(index)}`,
            label: `Commit #${String(index + 1)}`,
        }
    })
}

/**
 * Оценивает capability устройства и выбирает режим рендера 3D или 2D fallback.
 *
 * @param files Набор файлов в текущем snapshot.
 * @returns Решение по режиму рендера + причина.
 */
function resolveCodeCityRenderCapability(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ICodeCity3DRenderCapability {
    if (typeof document === "undefined") {
        return {
            isWebGlSupported: false,
            reason: "WebGL unavailable on this device. Switched to 2D treemap mode.",
            shouldUse2DFallback: true,
        }
    }

    const canvas = document.createElement("canvas")
    const webGlContext = canvas.getContext("webgl")
    const webGl2Context = canvas.getContext("webgl2")
    if (webGlContext === null && webGl2Context === null) {
        return {
            isWebGlSupported: false,
            reason: "WebGL unavailable on this device. Switched to 2D treemap mode.",
            shouldUse2DFallback: true,
        }
    }

    const contextWithMetrics = (webGl2Context ?? webGlContext) as {
        readonly MAX_TEXTURE_SIZE?: number
        getParameter?: (parameter: number) => unknown
    } | null
    const maxTextureSize =
        contextWithMetrics !== null &&
        contextWithMetrics.MAX_TEXTURE_SIZE !== undefined &&
        typeof contextWithMetrics.getParameter === "function"
            ? Number(contextWithMetrics.getParameter(contextWithMetrics.MAX_TEXTURE_SIZE))
            : 8192
    const navigatorWithMemory = navigator as Navigator & { readonly deviceMemory?: number }
    const hardwareCores = navigator.hardwareConcurrency ?? 8
    const deviceMemory = navigatorWithMemory.deviceMemory ?? 8
    const weakDevice =
        hardwareCores <= WEAK_DEVICE_MAX_CORES ||
        deviceMemory <= WEAK_DEVICE_MAX_MEMORY_GB ||
        maxTextureSize < WEAK_DEVICE_MIN_TEXTURE_SIZE
    if (weakDevice) {
        return {
            isWebGlSupported: true,
            reason: "Weak GPU/CPU profile detected. Switched to 2D treemap mode.",
            shouldUse2DFallback: true,
        }
    }

    const estimatedGpuUsageMb = files.length * ESTIMATED_GPU_COST_PER_BUILDING_MB
    if (estimatedGpuUsageMb > GPU_MEMORY_BUDGET_MB) {
        return {
            isWebGlSupported: true,
            reason: "GPU memory budget exceeded. Switched to 2D treemap mode.",
            shouldUse2DFallback: true,
        }
    }

    return {
        isWebGlSupported: true,
        reason: "3D renderer available.",
        shouldUse2DFallback: false,
    }
}

/**
 * Обёртка 3D сцены: проверяет WebGL и лениво подгружает renderer.
 *
 * @param props Конфигурация 3D preview.
 * @returns 3D canvas или fallback при отсутствии WebGL.
 */
export function CodeCity3DScene(props: ICodeCity3DSceneProps): ReactElement {
    const [cameraPreset, setCameraPreset] = useState<TCodeCityCameraPreset>("bird-eye")
    const [causalReplayIndex, setCausalReplayIndex] = useState<number>(0)
    const [causalReplaySpeed, setCausalReplaySpeed] = useState<TCausalReplaySpeed>(1)
    const [hoveredFileId, setHoveredFileId] = useState<string | undefined>(undefined)
    const [isCausalReplayPlaying, setIsCausalReplayPlaying] = useState<boolean>(false)
    const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false)
    const [chainNavigationIndex, setChainNavigationIndex] = useState<number>(0)
    const [selectedFileId, setSelectedFileId] = useState<string | undefined>(undefined)
    const [timelineIndex, setTimelineIndex] = useState<number>(0)
    const snapshots = useMemo((): ReadonlyArray<ICodeCity3DSnapshot> => {
        return createCodeCityTimelineSnapshots(props.files)
    }, [props.files])
    const lastTimelineIndex = snapshots.length - 1
    const currentSnapshot = snapshots[Math.min(timelineIndex, lastTimelineIndex)] ??
        snapshots[0] ?? {
            files: [],
            id: "snapshot-fallback",
            label: "Commit #1",
        }
    const renderCapability = useMemo((): ICodeCity3DRenderCapability => {
        return resolveCodeCityRenderCapability(currentSnapshot.files)
    }, [currentSnapshot.files])

    useEffect((): void => {
        setTimelineIndex((currentIndex): number => {
            return Math.min(currentIndex, Math.max(0, snapshots.length - 1))
        })
    }, [snapshots.length])

    useEffect((): (() => void) | void => {
        if (isTimelinePlaying === false || snapshots.length <= 1) {
            return
        }

        const intervalId = globalThis.setInterval((): void => {
            setTimelineIndex((currentIndex): number => {
                return (currentIndex + 1) % snapshots.length
            })
        }, TIMELINE_PLAYBACK_INTERVAL_MS)

        return (): void => {
            globalThis.clearInterval(intervalId)
        }
    }, [isTimelinePlaying, snapshots.length])

    const repositoryFilePathById = useMemo((): ReadonlyMap<string, string> => {
        return new Map(
            props.files.map((file): readonly [string, string] => {
                return [file.id, file.path]
            }),
        )
    }, [props.files])
    const causalTimelineEvents = useMemo((): ReadonlyArray<string> => {
        return (
            props.causalCouplings?.map((coupling, index): string => {
                const sourcePath =
                    repositoryFilePathById.get(coupling.sourceFileId) ?? coupling.sourceFileId
                const targetPath =
                    repositoryFilePathById.get(coupling.targetFileId) ?? coupling.targetFileId

                return `Event #${String(index + 1)}: ${sourcePath} -> ${targetPath}`
            }) ?? []
        )
    }, [props.causalCouplings, repositoryFilePathById])
    const currentCausalEventLabel = useMemo((): string => {
        if (causalTimelineEvents.length === 0) {
            return "Event #1"
        }

        const maxIndex = causalTimelineEvents.length - 1
        const normalizedIndex = Math.max(0, Math.min(causalReplayIndex, maxIndex))
        return causalTimelineEvents[normalizedIndex] ?? "Event #1"
    }, [causalReplayIndex, causalTimelineEvents])
    const displayedCausalCouplings =
        useMemo((): ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> => {
            const causalCouplings = props.causalCouplings ?? []
            if (causalCouplings.length === 0) {
                return []
            }

            const maxIndex = causalCouplings.length - 1
            const normalizedIndex = Math.max(0, Math.min(causalReplayIndex, maxIndex))
            return causalCouplings.slice(0, normalizedIndex + 1)
        }, [causalReplayIndex, props.causalCouplings])

    useEffect((): void => {
        setCausalReplayIndex((currentIndex): number => {
            return Math.min(currentIndex, Math.max(0, causalTimelineEvents.length - 1))
        })
    }, [causalTimelineEvents.length])

    useEffect((): void => {
        if (causalTimelineEvents.length <= 1) {
            setIsCausalReplayPlaying(false)
        }
    }, [causalTimelineEvents.length])

    useEffect((): (() => void) | void => {
        if (isCausalReplayPlaying === false || causalTimelineEvents.length <= 1) {
            return
        }

        const intervalMs = Math.max(
            250,
            Math.round(CAUSAL_REPLAY_BASE_INTERVAL_MS / causalReplaySpeed),
        )
        const intervalId = globalThis.setInterval((): void => {
            setCausalReplayIndex((currentIndex): number => {
                return (currentIndex + 1) % causalTimelineEvents.length
            })
        }, intervalMs)

        return (): void => {
            globalThis.clearInterval(intervalId)
        }
    }, [causalReplaySpeed, causalTimelineEvents.length, isCausalReplayPlaying])

    const fileById = useMemo((): ReadonlyMap<string, ICodeCity3DSceneFileDescriptor> => {
        return new Map(
            currentSnapshot.files.map((file): readonly [string, ICodeCity3DSceneFileDescriptor] => [
                file.id,
                file,
            ]),
        )
    }, [currentSnapshot.files])
    const navigationBreadcrumbPaths = useMemo((): ReadonlyArray<string> => {
        const chainFileIds = props.navigationChainFileIds ?? []
        return chainFileIds
            .map((fileId): string | undefined => fileById.get(fileId)?.path)
            .filter((path): path is string => path !== undefined)
    }, [fileById, props.navigationChainFileIds])
    const hoveredFile = hoveredFileId !== undefined ? fileById.get(hoveredFileId) : undefined
    const selectedFile = selectedFileId !== undefined ? fileById.get(selectedFileId) : undefined
    const navigationChainFileIds = props.navigationChainFileIds ?? []

    useEffect((): void => {
        setChainNavigationIndex(0)
    }, [navigationChainFileIds])

    useEffect((): (() => void) | void => {
        if (navigationChainFileIds.length <= 1) {
            return
        }

        const intervalId = globalThis.setInterval((): void => {
            setChainNavigationIndex((currentIndex): number => {
                return (currentIndex + 1) % navigationChainFileIds.length
            })
        }, CHAIN_NAVIGATION_INTERVAL_MS)

        return (): void => {
            globalThis.clearInterval(intervalId)
        }
    }, [navigationChainFileIds])

    useEffect((): void => {
        const nextFileId = navigationChainFileIds[chainNavigationIndex]
        if (nextFileId === undefined) {
            return
        }
        setCameraPreset("focus-on-building")
        setSelectedFileId(nextFileId)
    }, [chainNavigationIndex, navigationChainFileIds])

    useEffect((): void => {
        if (props.navigationActiveFileId === undefined) {
            return
        }
        setCameraPreset("focus-on-building")
        setSelectedFileId(props.navigationActiveFileId)
        const activeIndex = navigationChainFileIds.findIndex((fileId): boolean => {
            return fileId === props.navigationActiveFileId
        })
        if (activeIndex >= 0) {
            setChainNavigationIndex(activeIndex)
        }
    }, [navigationChainFileIds, props.navigationActiveFileId])

    if (renderCapability.shouldUse2DFallback) {
        const fallbackFiles = currentSnapshot.files.slice(0, 24)

        return (
            <section className="w-full rounded-lg border border-border bg-surface p-3">
                <div
                    className="rounded-lg border border-amber-300 bg-warning/10 px-3 py-2 text-sm text-warning"
                    role="status"
                >
                    {renderCapability.reason}
                </div>
                <div className="mt-3">
                    <p className="text-sm font-semibold text-foreground">2D treemap fallback</p>
                    <div className="mt-2 grid auto-rows-[64px] grid-cols-6 gap-2">
                        {fallbackFiles.map((file): ReactElement => {
                            const columnSpan = Math.max(
                                1,
                                Math.min(3, Math.ceil((file.complexity ?? 1) / 10)),
                            )
                            const rowSpan = Math.max(
                                1,
                                Math.min(2, Math.ceil((file.loc ?? 20) / 120)),
                            )

                            return (
                                <article
                                    className="rounded border border-border bg-white px-2 py-1 text-[11px] text-foreground"
                                    key={file.id}
                                    style={{
                                        gridColumn: `span ${String(columnSpan)} / span ${String(columnSpan)}`,
                                        gridRow: `span ${String(rowSpan)} / span ${String(rowSpan)}`,
                                    }}
                                >
                                    <p className="truncate font-medium text-foreground">
                                        {file.path}
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                        LOC {String(file.loc ?? 0)}
                                    </p>
                                    <p className="text-muted-foreground">
                                        Complexity {String(file.complexity ?? 0)}
                                    </p>
                                </article>
                            )
                        })}
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section
            aria-label={props.title}
            className="relative w-full overflow-hidden rounded-lg border border-border bg-slate-950/95"
            style={{ height: `${String(props.height ?? 420)}px` }}
        >
            <div className="absolute left-3 top-3 z-10 flex gap-2">
                {CAMERA_PRESET_OPTIONS.map(
                    (option): ReactElement => (
                        <button
                            aria-label={`Camera preset ${option.label}`}
                            aria-pressed={cameraPreset === option.id}
                            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                                cameraPreset === option.id
                                    ? "border-cyan-300 bg-cyan-500/20 text-cyan-100"
                                    : "border-slate-500 bg-slate-900/70 text-slate-300 hover:border-border hover:text-slate-100"
                            }`}
                            key={option.id}
                            onClick={(): void => {
                                setCameraPreset(option.id)
                            }}
                            type="button"
                        >
                            {option.label}
                        </button>
                    ),
                )}
            </div>
            {navigationBreadcrumbPaths.length > 0 ? (
                <aside className="absolute left-3 top-14 z-10 max-w-lg rounded-md border border-cyan-400/50 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
                    <p className="font-semibold text-cyan-200">
                        {props.navigationLabel !== undefined
                            ? `Root-cause trail: ${props.navigationLabel}`
                            : "Root-cause trail"}
                    </p>
                    <p className="mt-1 text-slate-300">{navigationBreadcrumbPaths.join(" -> ")}</p>
                </aside>
            ) : null}
            <div className="absolute right-3 top-3 z-10 w-72 rounded-md border border-slate-500/50 bg-slate-900/90 p-2.5 text-xs text-slate-100 shadow-lg">
                <div className="flex items-center justify-between">
                    <p className="font-semibold text-cyan-200">City time-lapse</p>
                    <button
                        aria-label={isTimelinePlaying ? "Pause timeline" : "Play timeline"}
                        className="rounded border border-slate-400 px-2 py-0.5 text-xs text-slate-100 hover:border-cyan-300"
                        onClick={(): void => {
                            setIsTimelinePlaying((isPlaying): boolean => !isPlaying)
                        }}
                        type="button"
                    >
                        {isTimelinePlaying ? "Pause" : "Play"}
                    </button>
                </div>
                <p className="mt-2 text-slate-300">{currentSnapshot?.label ?? "Commit #1"}</p>
                <input
                    aria-label="CodeCity timeline"
                    className="mt-2 w-full accent-cyan-400"
                    max={Math.max(0, snapshots.length - 1)}
                    min={0}
                    onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                        setIsTimelinePlaying(false)
                        const nextIndex = event.currentTarget.valueAsNumber
                        if (Number.isNaN(nextIndex)) {
                            return
                        }
                        setTimelineIndex(nextIndex)
                    }}
                    step={1}
                    type="range"
                    value={timelineIndex}
                />
                <p className="mt-1 text-slate-400">
                    Files: {String(currentSnapshot?.files.length ?? 0)} /{" "}
                    {String(props.files.length)}
                </p>
                {causalTimelineEvents.length > 0 ? (
                    <div className="mt-3 border-t border-slate-700/70 pt-2">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-cyan-200">Causal replay</p>
                            <button
                                aria-label={
                                    isCausalReplayPlaying
                                        ? "Pause causal replay"
                                        : "Play causal replay"
                                }
                                className="rounded border border-slate-400 px-2 py-0.5 text-xs text-slate-100 hover:border-cyan-300"
                                onClick={(): void => {
                                    setIsCausalReplayPlaying((isPlaying): boolean => !isPlaying)
                                }}
                                type="button"
                            >
                                {isCausalReplayPlaying ? "Pause" : "Play"}
                            </button>
                        </div>
                        <p className="mt-2 break-all text-slate-300">{currentCausalEventLabel}</p>
                        <input
                            aria-label="Causal timeline"
                            className="mt-2 w-full accent-cyan-400"
                            max={Math.max(0, causalTimelineEvents.length - 1)}
                            min={0}
                            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                setIsCausalReplayPlaying(false)
                                const nextIndex = event.currentTarget.valueAsNumber
                                if (Number.isNaN(nextIndex)) {
                                    return
                                }
                                setCausalReplayIndex(nextIndex)
                            }}
                            step={1}
                            type="range"
                            value={causalReplayIndex}
                        />
                        <div className="mt-2 flex items-center gap-1.5">
                            {CAUSAL_REPLAY_SPEED_OPTIONS.map(
                                (speed): ReactElement => (
                                    <button
                                        aria-label={`Causal replay speed ${String(speed)}x`}
                                        aria-pressed={causalReplaySpeed === speed}
                                        className={`rounded border px-2 py-0.5 text-[11px] transition ${
                                            causalReplaySpeed === speed
                                                ? "border-cyan-300 bg-cyan-500/20 text-cyan-100"
                                                : "border-slate-500 bg-slate-900/70 text-slate-300 hover:border-border hover:text-slate-100"
                                        }`}
                                        key={speed}
                                        onClick={(): void => {
                                            setCausalReplaySpeed(speed)
                                        }}
                                        type="button"
                                    >
                                        {String(speed)}x
                                    </button>
                                ),
                            )}
                        </div>
                        <p className="mt-1 text-slate-400">
                            Events:{" "}
                            {String(Math.min(causalReplayIndex + 1, causalTimelineEvents.length))} /{" "}
                            {String(causalTimelineEvents.length)}
                        </p>
                    </div>
                ) : null}
            </div>
            {hoveredFile !== undefined ? (
                <aside className="absolute bottom-3 left-3 z-10 rounded-md border border-cyan-400/50 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
                    <p className="font-semibold text-cyan-200">Hover preview</p>
                    <p className="mt-1">{hoveredFile.path}</p>
                    <p className="mt-1 text-slate-300">
                        LOC {String(hoveredFile.loc ?? 0)} · Complexity{" "}
                        {String(hoveredFile.complexity ?? 0)} · Coverage{" "}
                        {String(hoveredFile.coverage ?? 0)}%
                    </p>
                </aside>
            ) : null}
            {selectedFile !== undefined ? (
                <aside className="absolute right-3 top-14 z-10 w-72 rounded-lg border border-slate-400/40 bg-slate-900/95 p-3 text-sm text-slate-100 shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-cyan-200">File details</p>
                        <button
                            aria-label="Close file details panel"
                            className="rounded border border-slate-500 px-2 py-0.5 text-xs text-slate-200 hover:border-border"
                            onClick={(): void => {
                                setSelectedFileId(undefined)
                            }}
                            type="button"
                        >
                            Close
                        </button>
                    </div>
                    <p className="mt-2 break-all text-xs text-slate-300">{selectedFile.path}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded border border-slate-700 bg-slate-900/70 p-2">
                            <dt className="text-slate-400">LOC</dt>
                            <dd className="mt-1 font-semibold text-slate-100">
                                {String(selectedFile.loc ?? 0)}
                            </dd>
                        </div>
                        <div className="rounded border border-slate-700 bg-slate-900/70 p-2">
                            <dt className="text-slate-400">Complexity</dt>
                            <dd className="mt-1 font-semibold text-slate-100">
                                {String(selectedFile.complexity ?? 0)}
                            </dd>
                        </div>
                        <div className="col-span-2 rounded border border-slate-700 bg-slate-900/70 p-2">
                            <dt className="text-slate-400">Coverage</dt>
                            <dd className="mt-1 font-semibold text-slate-100">
                                {String(selectedFile.coverage ?? 0)}%
                            </dd>
                        </div>
                    </dl>
                </aside>
            ) : null}
            <Suspense
                fallback={
                    <div className="flex h-full items-center justify-center text-sm text-slate-300">
                        Loading 3D scene...
                    </div>
                }
            >
                <LazyCodeCity3DSceneRenderer
                    cameraPreset={cameraPreset}
                    causalCouplings={displayedCausalCouplings}
                    files={currentSnapshot?.files ?? []}
                    impactedFiles={props.impactedFiles ?? []}
                    navigationActiveFileId={props.navigationActiveFileId}
                    navigationChainFileIds={props.navigationChainFileIds ?? []}
                    onBuildingHover={setHoveredFileId}
                    onBuildingSelect={setSelectedFileId}
                    selectedFileId={selectedFileId}
                />
            </Suspense>
        </section>
    )
}

export type { ICodeCity3DSceneFileDescriptor }
