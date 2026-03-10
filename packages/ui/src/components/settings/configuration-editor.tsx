import { type FormEvent, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui"
import { REPO_REVIEW_MODE, type TRepoReviewMode } from "@/lib/api/endpoints/repo-config.endpoint"
import { NATIVE_FORM } from "@/lib/constants/spacing"

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
    readonly onReviewModeChange: (value: TRepoReviewMode) => void
    /** Сохранение конфига. */
    readonly onSave: (event: FormEvent) => void
}

/**
 * Визуальный YAML editor для репозиторного конфига.
 *
 * @param props Параметры редактора.
 * @returns Форма редактирования `codenautic-config.yml`.
 */
export function ConfigurationEditor(props: IConfigurationEditorProps): ReactElement {
    const { t } = useTranslation(["settings"])

    const resolveStateMessage = (): string => {
        if (props.isLoading === true) {
            return t("settings:configurationEditor.stateLoading")
        }
        if (props.isSaving === true) {
            return t("settings:configurationEditor.stateSaving")
        }
        if (props.hasLoadError === true || props.hasSaveError === true) {
            return t("settings:configurationEditor.stateUnavailable")
        }
        return t("settings:configurationEditor.stateReady")
    }

    const stateMessage = resolveStateMessage()

    return (
        <form
            className="space-y-3 rounded-xl border border-border bg-surface p-4"
            onSubmit={props.onSave}
        >
            <h2 className="text-base font-semibold text-foreground">
                {t("settings:configurationEditor.repositoryConfig")}
            </h2>
            <p className="text-sm text-muted-foreground">
                {t("settings:configurationEditor.editDescription")}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
                <label
                    className="space-y-1 text-sm text-foreground"
                    htmlFor="repo-config-repository-id"
                >
                    <span className="font-medium text-foreground">
                        {t("settings:configurationEditor.repositoryId")}
                    </span>
                    <input
                        aria-label={t("settings:configurationEditor.repositoryId")}
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
                    <span className="font-medium text-foreground">
                        {t("settings:configurationEditor.reviewMode")}
                    </span>
                    <select
                        aria-label={t("settings:configurationEditor.reviewModeAriaLabel")}
                        className={NATIVE_FORM.select}
                        data-testid="repo-review-mode"
                        id="repo-review-mode"
                        value={props.reviewMode}
                        onChange={(event): void => {
                            const nextValue = event.currentTarget.value
                            if (
                                nextValue === REPO_REVIEW_MODE.manual ||
                                nextValue === REPO_REVIEW_MODE.auto ||
                                nextValue === REPO_REVIEW_MODE.autoPause
                            ) {
                                props.onReviewModeChange(nextValue)
                            }
                        }}
                    >
                        <option value={REPO_REVIEW_MODE.manual}>
                            {t("settings:configurationEditor.optionManual")}
                        </option>
                        <option value={REPO_REVIEW_MODE.auto}>
                            {t("settings:configurationEditor.optionAuto")}
                        </option>
                        <option value={REPO_REVIEW_MODE.autoPause}>
                            {t("settings:configurationEditor.optionAutoPause")}
                        </option>
                    </select>
                </label>
            </div>
            <label className="space-y-1 text-sm text-foreground" htmlFor="repo-config-yaml">
                <span className="font-medium text-foreground">
                    {t("settings:configurationEditor.configYaml")}
                </span>
                <textarea
                    aria-label={t("settings:configurationEditor.configYamlAriaLabel")}
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
                    {t("settings:configurationEditor.saveRepositoryConfig")}
                </Button>
                <p className="text-xs text-muted-foreground" data-testid="repo-config-state">
                    {stateMessage}
                </p>
            </div>
        </form>
    )
}
