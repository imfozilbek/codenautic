import { type ChangeEvent, type FormEvent, type ReactElement, useEffect, useState } from "react"

import { Button } from "@/components/ui"
import { CodeReviewForm } from "@/components/settings/code-review-form"
import { IgnorePathsEditor } from "@/components/settings/ignore-paths-editor"
import { RuleEditor } from "@/components/settings/rule-editor"
import type { ICodeReviewFormValues } from "@/components/settings/settings-form-schemas"
import {
    REPO_REVIEW_MODE,
    type TRepoReviewMode,
} from "@/lib/api/endpoints/repo-config.endpoint"
import { useRepoConfig } from "@/lib/hooks/queries"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

const DEFAULT_IGNORED_PATHS: ReadonlyArray<string> = ["/dist", "/node_modules", "/coverage"] as const
const DEFAULT_REPOSITORY_ID = "repo-1"
const DEFAULT_REPOSITORY_CONFIG = "version: 1\nreview:\n  mode: MANUAL\n"

interface IRepositoryConfigSectionProps {
    readonly configYaml: string
    readonly hasLoadError: boolean
    readonly hasSaveError: boolean
    readonly isLoading: boolean
    readonly isSaveDisabled: boolean
    readonly isSaving: boolean
    readonly repositoryId: string
    readonly reviewMode: TRepoReviewMode
    readonly onConfigYamlChange: (value: string) => void
    readonly onRepositoryIdChange: (value: string) => void
    readonly onReviewModeChange: (event: ChangeEvent<HTMLSelectElement>) => void
    readonly onSave: (event: FormEvent) => void
}

function isRepoReviewMode(value: string): value is TRepoReviewMode {
    return (
        value === REPO_REVIEW_MODE.manual ||
        value === REPO_REVIEW_MODE.auto ||
        value === REPO_REVIEW_MODE.autoPause
    )
}

function resolveRepositoryConfigStateMessage(props: {
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

function RepositoryConfigSection(props: IRepositoryConfigSectionProps): ReactElement {
    const stateMessage = resolveRepositoryConfigStateMessage({
        hasLoadError: props.hasLoadError,
        hasSaveError: props.hasSaveError,
        isLoading: props.isLoading,
        isSaving: props.isSaving,
    })

    return (
        <form
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
            onSubmit={props.onSave}
        >
            <h2 className="text-base font-semibold text-slate-900">Repository config</h2>
            <p className="text-sm text-slate-600">
                Edit <code>codenautic-config.yml</code> visually and keep repository review
                settings in sync.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-700" htmlFor="repo-config-repository-id">
                    <span className="font-medium text-slate-900">Repository ID</span>
                    <input
                        aria-label="Repository ID"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        data-testid="repo-config-repository-id"
                        id="repo-config-repository-id"
                        value={props.repositoryId}
                        onChange={(event): void => {
                            props.onRepositoryIdChange(event.currentTarget.value)
                        }}
                    />
                </label>
                <label className="space-y-1 text-sm text-slate-700" htmlFor="repo-review-mode">
                    <span className="font-medium text-slate-900">Review mode</span>
                    <select
                        aria-label="Repository review mode"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
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
            <label className="space-y-1 text-sm text-slate-700" htmlFor="repo-config-yaml">
                <span className="font-medium text-slate-900">Config YAML</span>
                <textarea
                    aria-label="Repository config YAML"
                    className="min-h-[220px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
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
                <p className="text-xs text-slate-600" data-testid="repo-config-state">
                    {stateMessage}
                </p>
            </div>
        </form>
    )
}

/**
 * Страница настроек code-review.
 *
 * @returns Форма управления cadence/severity/suggestions + ignore paths.
 */
export function SettingsCodeReviewPage(): ReactElement {
    const [formValues, setFormValues] = useState<ICodeReviewFormValues>({
        cadence: "daily",
        enableDriftSignals: true,
        severity: "medium",
        suggestionsLimit: 8,
    })
    const [ignoredPaths, setIgnoredPaths] = useState<ReadonlyArray<string>>(DEFAULT_IGNORED_PATHS)
    const [rulesText, setRulesText] = useState<string>(
        "### Default review rules\n- Ensure each change has context.\n- Keep patches minimal.",
    )
    const [repositoryId, setRepositoryId] = useState<string>(DEFAULT_REPOSITORY_ID)
    const [configYaml, setConfigYaml] = useState<string>(DEFAULT_REPOSITORY_CONFIG)
    const [reviewMode, setReviewMode] = useState<TRepoReviewMode>(REPO_REVIEW_MODE.manual)
    const normalizedRepositoryId = repositoryId.trim()
    const repoConfig = useRepoConfig({
        repositoryId: normalizedRepositoryId,
        enabled: normalizedRepositoryId.length > 0,
    })
    const loadedConfig = repoConfig.repoConfigQuery.data?.config

    useEffect((): void => {
        if (loadedConfig === undefined) {
            return
        }

        setConfigYaml(loadedConfig.configYaml)
        setReviewMode(loadedConfig.reviewMode)
        setIgnoredPaths(loadedConfig.ignorePatterns)
    }, [loadedConfig])

    const saveReviewForm = (nextValues: ICodeReviewFormValues): void => {
        setFormValues(nextValues)
        showToastSuccess("Code Review settings saved.")
    }

    const handlePathsChange = (nextPaths: ReadonlyArray<string>): void => {
        setIgnoredPaths(nextPaths)
        showToastSuccess("Ignore paths updated.")
    }

    const handlePathReset = (event: FormEvent): void => {
        event.preventDefault()
        setIgnoredPaths(DEFAULT_IGNORED_PATHS)
        showToastInfo("Ignore paths reset to defaults.")
    }

    const handleReviewModeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextReviewMode = event.currentTarget.value
        if (isRepoReviewMode(nextReviewMode) !== true) {
            return
        }
        setReviewMode(nextReviewMode)
    }

    const handleRepositoryConfigSave = (event: FormEvent): void => {
        event.preventDefault()
        if (normalizedRepositoryId.length === 0) {
            showToastInfo("Repository ID is required.")
            return
        }

        void repoConfig.saveRepoConfig
            .mutateAsync({
                repositoryId: normalizedRepositoryId,
                configYaml,
                ignorePatterns: ignoredPaths,
                reviewMode,
            })
            .then((response): void => {
                setConfigYaml(response.config.configYaml)
                setReviewMode(response.config.reviewMode)
                setIgnoredPaths(response.config.ignorePatterns)
                showToastSuccess("Repository config saved.")
            })
            .catch((): void => {
                showToastInfo("Unable to save repository config.")
            })
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Code Review Configuration</h1>
            <p className="text-sm text-slate-600">
                Configure repository YAML, cadence, severity threshold and ignore paths for automated
                review.
            </p>
            <RepositoryConfigSection
                configYaml={configYaml}
                hasLoadError={repoConfig.repoConfigQuery.error !== null}
                hasSaveError={repoConfig.saveRepoConfig.error !== null}
                isLoading={repoConfig.repoConfigQuery.isPending}
                isSaveDisabled={
                    normalizedRepositoryId.length === 0 ||
                    repoConfig.saveRepoConfig.isPending === true
                }
                isSaving={repoConfig.saveRepoConfig.isPending}
                repositoryId={repositoryId}
                reviewMode={reviewMode}
                onConfigYamlChange={setConfigYaml}
                onRepositoryIdChange={setRepositoryId}
                onReviewModeChange={handleReviewModeChange}
                onSave={handleRepositoryConfigSave}
            />
            <CodeReviewForm initialValues={formValues} onSubmit={saveReviewForm} />
            <IgnorePathsEditor
                helperText="Игнорируемые пути используются как фильтр для сканирования и выдачи CCR."
                ignoredPaths={ignoredPaths}
                onChange={handlePathsChange}
            />
            <RuleEditor
                id="code-review-rules-editor"
                label="Review rules"
                maxLength={4000}
                onChange={setRulesText}
                value={rulesText}
            />
            <form onSubmit={handlePathReset}>
                <Button
                    type="submit"
                    className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                >
                    Reset ignore paths
                </Button>
            </form>
        </section>
    )
}
