import { useMemo, useState, type ChangeEvent, type ReactElement } from "react"

/**
 * Рекомендованный exploration path для навигации по CodeCity.
 */
export interface IExploreModePathDescriptor {
    /** Уникальный идентификатор path. */
    readonly id: string
    /** Заголовок path. */
    readonly title: string
    /** Краткое описание path. */
    readonly description: string
    /** Роль пользователя, для которой path релевантен. */
    readonly role: string
    /** Цепочка файлов для навигации камеры. */
    readonly fileChainIds: ReadonlyArray<string>
}

/**
 * Пропсы explore mode sidebar.
 */
export interface IExploreModeSidebarProps {
    /** Список рекомендованных exploration paths. */
    readonly paths: ReadonlyArray<IExploreModePathDescriptor>
    /** Callback выбора path для навигации. */
    readonly onNavigatePath: (path: IExploreModePathDescriptor) => void
}

/**
 * Боковая панель режимa исследования с фильтрацией путей по роли.
 *
 * @param props Набор путей и обработчик навигации.
 * @returns React-компонент sidebar.
 */
export function ExploreModeSidebar(props: IExploreModeSidebarProps): ReactElement {
    const [roleFilter, setRoleFilter] = useState<string>("all")

    const roleOptions = useMemo((): ReadonlyArray<string> => {
        const roles = new Set<string>(["all"])
        props.paths.forEach((path): void => {
            roles.add(path.role)
        })
        return [...roles]
    }, [props.paths])

    const filteredPaths = useMemo((): ReadonlyArray<IExploreModePathDescriptor> => {
        if (roleFilter === "all") {
            return props.paths
        }
        return props.paths.filter((path): boolean => {
            return path.role === roleFilter
        })
    }, [props.paths, roleFilter])

    const handleRoleFilterChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        setRoleFilter(event.currentTarget.value)
    }

    return (
        <aside className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Explore mode sidebar</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Recommended exploration paths with role-aware filtering.
            </p>

            <label className="mt-3 block space-y-1" htmlFor="explore-role-filter">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Filter by role
                </span>
                <select
                    aria-label="Explore role filter"
                    className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                    id="explore-role-filter"
                    onChange={handleRoleFilterChange}
                    value={roleFilter}
                >
                    {roleOptions.map(
                        (role): ReactElement => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ),
                    )}
                </select>
            </label>

            <ul className="mt-3 space-y-2">
                {filteredPaths.map(
                    (path): ReactElement => (
                        <li className="rounded border border-border bg-surface p-2" key={path.id}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {path.title}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {path.description}
                                    </p>
                                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Role: {path.role} · Files:{" "}
                                        {String(path.fileChainIds.length)}
                                    </p>
                                </div>
                                <button
                                    aria-label={`Navigate path ${path.title}`}
                                    className="rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                                    onClick={(): void => {
                                        props.onNavigatePath(path)
                                    }}
                                    type="button"
                                >
                                    Navigate
                                </button>
                            </div>
                        </li>
                    ),
                )}
            </ul>
        </aside>
    )
}
