import { useMemo, useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
    const { t } = useTranslation(["code-city"])
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

    return (
        <aside className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>
                {t("code-city:exploreSidebar.title")}
            </p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:exploreSidebar.description")}
            </p>

            <label className="mt-3 block space-y-1" htmlFor="explore-role-filter">
                <span className={TYPOGRAPHY.overline}>
                    {t("code-city:exploreSidebar.filterByRole")}
                </span>
                <select
                    aria-label={t("code-city:exploreSidebar.filterAriaLabel")}
                    className={NATIVE_FORM.select}
                    id="explore-role-filter"
                    value={roleFilter}
                    onChange={(event): void => {
                        setRoleFilter(event.currentTarget.value)
                    }}
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
                                    <p className={TYPOGRAPHY.cardTitle}>
                                        {path.title}
                                    </p>
                                    <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                        {path.description}
                                    </p>
                                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                        {t("code-city:exploreSidebar.rolePrefix")} {path.role} ·{" "}
                                        {t("code-city:exploreSidebar.filesPrefix")}{" "}
                                        {String(path.fileChainIds.length)}
                                    </p>
                                </div>
                                <button
                                    aria-label={t("code-city:exploreSidebar.navigateAriaLabel", {
                                        title: path.title,
                                    })}
                                    className="rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                                    onClick={(): void => {
                                        props.onNavigatePath(path)
                                    }}
                                    type="button"
                                >
                                    {t("code-city:exploreSidebar.navigateButton")}
                                </button>
                            </div>
                        </li>
                    ),
                )}
            </ul>
        </aside>
    )
}
