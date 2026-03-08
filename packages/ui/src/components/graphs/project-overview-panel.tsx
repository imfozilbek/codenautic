import type { ReactElement } from "react"

/**
 * Минимальный file-дескриптор для проектного overview.
 */
export interface IProjectOverviewFileDescriptor {
    /** Путь файла в репозитории. */
    readonly path: string
}

/**
 * Пропсы панели project overview.
 */
export interface IProjectOverviewPanelProps {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Человекочитаемый лейбл репозитория. */
    readonly repositoryLabel: string
    /** Срез файлов из результатов сканирования. */
    readonly files: ReadonlyArray<IProjectOverviewFileDescriptor>
}

interface IOverviewMetricItem {
    readonly label: string
    readonly value: string
}

/**
 * Возвращает top-level модуль (директорию) по пути файла.
 *
 * @param filePath Путь файла.
 * @returns Имя top-level модуля.
 */
function resolveTopLevelModule(filePath: string): string {
    const normalizedPath = filePath.replace(/^\.\//, "")
    const [firstSegment] = normalizedPath.split("/")
    if (firstSegment === undefined || firstSegment.trim().length === 0) {
        return "root"
    }
    return firstSegment
}

/**
 * Возвращает extension файла без точки.
 *
 * @param filePath Путь файла.
 * @returns Extension или `unknown`.
 */
function resolveFileExtension(filePath: string): string {
    const fileName = filePath.split("/").at(-1)
    if (fileName === undefined) {
        return "unknown"
    }

    const extension = fileName.split(".").at(-1)
    if (extension === undefined || extension === fileName) {
        return "unknown"
    }
    return extension.toLowerCase()
}

/**
 * Human-friendly название технологического стека по extension.
 *
 * @param extension Extension файла.
 * @returns Название технологии.
 */
function resolveTechLabel(extension: string): string {
    const TECH_LABELS: Readonly<Record<string, string>> = {
        css: "CSS",
        js: "JavaScript",
        jsx: "React JSX",
        json: "JSON",
        md: "Markdown",
        mjs: "JavaScript",
        scss: "SCSS",
        ts: "TypeScript",
        tsx: "React TSX",
    }

    return TECH_LABELS[extension] ?? extension.toUpperCase()
}

/**
 * Формирует метрики архитектуры/стека/entry points из scan data.
 *
 * @param files Набор файлов.
 * @returns Агрегированный overview для рендера.
 */
function buildProjectOverviewMetrics(files: ReadonlyArray<IProjectOverviewFileDescriptor>): {
    readonly architectureSummary: ReadonlyArray<IOverviewMetricItem>
    readonly techStackSummary: ReadonlyArray<IOverviewMetricItem>
    readonly entryPoints: ReadonlyArray<string>
} {
    const moduleCounter = new Map<string, number>()
    const techCounter = new Map<string, number>()
    const entryPointCandidates = new Set<string>()

    files.forEach((file): void => {
        const moduleName = resolveTopLevelModule(file.path)
        moduleCounter.set(moduleName, (moduleCounter.get(moduleName) ?? 0) + 1)

        const extension = resolveFileExtension(file.path)
        const techLabel = resolveTechLabel(extension)
        techCounter.set(techLabel, (techCounter.get(techLabel) ?? 0) + 1)

        const isEntryPoint = /(main|index|app|server|router|entry)\.(ts|tsx|js|jsx)$/i.test(
            file.path,
        )
        if (isEntryPoint) {
            entryPointCandidates.add(file.path)
        }
    })

    const architectureSummary = [...moduleCounter.entries()]
        .sort((left, right): number => right[1] - left[1])
        .slice(0, 4)
        .map(([label, count]): IOverviewMetricItem => {
            return {
                label,
                value: `${String(count)} files`,
            }
        })

    const techStackSummary = [...techCounter.entries()]
        .sort((left, right): number => right[1] - left[1])
        .slice(0, 5)
        .map(([label, count]): IOverviewMetricItem => {
            return {
                label,
                value: `${String(count)} files`,
            }
        })

    const entryPoints = [...entryPointCandidates].sort().slice(0, 5)

    return {
        architectureSummary,
        entryPoints,
        techStackSummary,
    }
}

/**
 * Side panel с обзором архитектуры проекта, tech stack и entry points.
 *
 * @param props Данные репозитория и scan-срез.
 * @returns React-компонент overview панели.
 */
export function ProjectOverviewPanel(props: IProjectOverviewPanelProps): ReactElement {
    const metrics = buildProjectOverviewMetrics(props.files)

    return (
        <article className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <header className="border-b border-slate-100 pb-2">
                <p className="text-sm font-semibold text-foreground">Project overview</p>
                <p className="text-xs text-muted-foreground">
                    {props.repositoryLabel} ({props.repositoryId})
                </p>
            </header>

            <section className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Architecture summary
                </p>
                <ul className="space-y-1 text-sm text-foreground">
                    {metrics.architectureSummary.map(
                        (item): ReactElement => (
                            <li className="flex items-center justify-between" key={item.label}>
                                <span>{item.label}</span>
                                <span className="text-xs text-muted-foreground">{item.value}</span>
                            </li>
                        ),
                    )}
                </ul>
            </section>

            <section className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tech stack
                </p>
                <ul className="space-y-1 text-sm text-foreground">
                    {metrics.techStackSummary.map(
                        (item): ReactElement => (
                            <li className="flex items-center justify-between" key={item.label}>
                                <span>{item.label}</span>
                                <span className="text-xs text-muted-foreground">{item.value}</span>
                            </li>
                        ),
                    )}
                </ul>
            </section>

            <section className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Entry points
                </p>
                {metrics.entryPoints.length > 0 ? (
                    <ul className="space-y-1 text-xs text-foreground">
                        {metrics.entryPoints.map(
                            (entryPoint): ReactElement => (
                                <li className="rounded bg-surface px-2 py-1" key={entryPoint}>
                                    {entryPoint}
                                </li>
                            ),
                        )}
                    </ul>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        No entry points detected in current scan.
                    </p>
                )}
            </section>
        </article>
    )
}
