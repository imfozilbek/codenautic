import { type ChangeEvent, type FormEvent, type ReactElement } from "react"

import { Button } from "@/components/ui"
import { REPO_REVIEW_MODE, type TRepoReviewMode } from "@/lib/api/endpoints/repo-config.endpoint"

/** Параметры визуального редактора `codenautic-config.yml`. */
export interface IConfigurationEditorProps {
    /** YAML-содержимое репозиторного конфига. */
    readonly configYaml: string
    /** Ошибка загрузки конфига. */
    readonly hasLoadError: boolean
    /** Ошибка сохранения конфига. */
    readonly hasSaveError: boolean
    /** Идёт загрузка конфига. */
    readonly isLoading: boolean
    /** Заблокировать primary action. */
    readonly isSaveDisabled: boolean
    /** Идёт сохранение конфига. */
    readonly isSaving: boolean
    /** Текущий repository id. */
    readonly repositoryId: string
    /** Текущий review mode. */
    readonly reviewMode: TRepoReviewMode
    /** Изменение YAML. */
    readonly onConfigYamlChange: (value: string) => void
    /** Изменение repository id. */
    readonly onRepositoryIdChange: (value: string) => void
    /** Изменение review mode. */
    readonly onReviewModeChange: (event: ChangeEvent<HTMLSelectElement>) => void
    /** Сохранение конфига. */
    readonly onSave: (event: FormEvent) => void
}

function resolveConfigurationEditorStateMessage(props: {
    readonly hasLoadError: boolean
    readonly hasSaveError: boolean
    readonly isLoading: boolean
    readonly isSaving: boolean
}): string {
    if (props.isLoading === true) {
        return "Loading repository config..."
    }
    if (props.isSaving === true) {
        return "Saving repository config..."
    }
    if (props.hasLoadError === true || props.hasSaveError === true) {
        return "Repository config unavailable."
    }
    return "Repository config is ready."
}

/**
 * Визуальный YAML editor для репозиторного конфига.
 *
 * @param props Параметры редактора.
 * @returns Форма редактирования `codenautic-config.yml`.
 */
export function ConfigurationEditor(props: IConfigurationEditorProps): ReactElement {
    const stateMessage = resolveConfigurationEditorStateMessage({
        hasLoadError: props.hasLoadError,
        hasSaveError: props.hasSaveError,
        isLoading: props.isLoading,
        isSaving: props.isSaving,
    })

    return (
        <form
            className="space-y-3 rounded-xl border border-border bg-white p-4"
            onSubmit={props.onSave}
        >
            <h2 className="text-base font-semibold text-foreground">Repository config</h2>
            <p className="text-sm text-muted-foreground">
                Edit <code>codenautic-config.yml</code> visually and keep repository review settings
                in sync.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
                <label
                    className="space-y-1 text-sm text-foreground"
                    htmlFor="repo-config-repository-id"
                >
                    <span className="font-medium text-foreground">Repository ID</span>
                    <input
                        aria-label="Repository ID"
                        className="w-full rounded-lg border border-border px-3 py-2"
                        data-testid="repo-config-repository-id"
                        id="repo-config-repository-id"
                        value={props.repositoryId}
                        onChange={(event): void => {
                            props.onRepositoryIdChange(event.currentTarget.value)
                        }}
                    />
                </label>
                <label className="space-y-1 text-sm text-foreground" htmlFor="repo-review-mode">
                    <span className="font-medium text-foreground">Review mode</span>
                    <select
                        aria-label="Repository review mode"
                        className="w-full rounded-lg border border-border px-3 py-2"
                        data-testid="repo-review-mode"
                        id="repo-review-mode"
                        value={props.reviewMode}
                        onChange={props.onReviewModeChange}
                    >
                        <option value={REPO_REVIEW_MODE.manual}>Manual</option>
                        <option value={REPO_REVIEW_MODE.auto}>Auto</option>
                        <option value={REPO_REVIEW_MODE.autoPause}>Auto pause</option>
                    </select>
                </label>
            </div>
            <label className="space-y-1 text-sm text-foreground" htmlFor="repo-config-yaml">
                <span className="font-medium text-foreground">Config YAML</span>
                <textarea
                    aria-label="Repository config YAML"
                    className="min-h-[220px] w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
                    data-testid="repo-config-yaml"
                    id="repo-config-yaml"
                    value={props.configYaml}
                    onChange={(event): void => {
                        props.onConfigYamlChange(event.currentTarget.value)
                    }}
                />
            </label>
            <div className="flex flex-wrap items-center gap-3">
                <Button
                    data-testid="repo-config-save"
                    disabled={props.isSaveDisabled}
                    type="submit"
                    variant="solid"
                >
                    Save repository config
                </Button>
                <p className="text-xs text-muted-foreground" data-testid="repo-config-state">
                    {stateMessage}
                </p>
            </div>
        </form>
    )
}
