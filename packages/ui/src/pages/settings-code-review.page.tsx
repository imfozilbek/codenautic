import { type ChangeEvent, type FormEvent, type ReactElement, useEffect, useState } from "react"

import { Button } from "@/components/ui"
import { CodeReviewForm } from "@/components/settings/code-review-form"
import { ConfigurationEditor } from "@/components/settings/configuration-editor"
import {
    DryRunResultViewer,
    type IDryRunResultViewerData,
    type IDryRunResultViewerIssue,
} from "@/components/settings/dry-run-result-viewer"
import { IgnorePatternEditor } from "@/components/settings/ignore-pattern-editor"
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

interface IReviewCadenceOption {
    readonly description: string
    readonly key: TRepoReviewMode
    readonly label: string
}

const REVIEW_CADENCE_OPTIONS: ReadonlyArray<IReviewCadenceOption> = [
    {
        key: REPO_REVIEW_MODE.manual,
        label: "Manual",
        description: "Run code review only when explicitly triggered by developer.",
    },
    {
        key: REPO_REVIEW_MODE.auto,
        label: "Auto",
        description: "Run code review automatically for every repository update.",
    },
    {
        key: REPO_REVIEW_MODE.autoPause,
        label: "Auto-pause",
        description: "Auto review with safety pause when degradation signals are detected.",
    },
] as const

function createDryRunResultSnapshot(params: {
    readonly ignorePatterns: ReadonlyArray<string>
    readonly reviewMode: TRepoReviewMode
}): IDryRunResultViewerData {
    const reviewedFiles = Math.max(12 - params.ignorePatterns.length * 2, 1)
    const issues: ReadonlyArray<IDryRunResultViewerIssue> = [
        {
            filePath: "src/review/pipeline-runner.ts",
            severity: "high",
            title: "Large diff chunk without guard",
        },
        {
            filePath: "src/agents/context-loader.ts",
            severity: "medium",
            title: "Missing timeout fallback branch",
        },
        {
            filePath: "src/domain/events/review-completed.ts",
            severity: "low",
            title: "Event payload can be narrowed",
        },
    ]

    return {
        mode: params.reviewMode,
        reviewedFiles,
        suggestions: issues.length * 2,
        issues,
    }
}

function isRepoReviewMode(value: string): value is TRepoReviewMode {
    return (
        value === REPO_REVIEW_MODE.manual ||
        value === REPO_REVIEW_MODE.auto ||
        value === REPO_REVIEW_MODE.autoPause
    )
}

function mapReviewModeToLabel(mode: TRepoReviewMode): string {
    const modeLabel = REVIEW_CADENCE_OPTIONS.find(
        (option): boolean => option.key === mode,
    )?.label
    if (modeLabel === undefined) {
        return "Unknown"
    }
    return modeLabel
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
    const [dryRunResult, setDryRunResult] = useState<IDryRunResultViewerData | undefined>(undefined)
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

    const persistRepositoryConfig = (params: {
        readonly configYaml: string
        readonly ignorePatterns: ReadonlyArray<string>
        readonly reviewMode: TRepoReviewMode
        readonly successMessage: string
    }): void => {
        if (normalizedRepositoryId.length === 0) {
            showToastInfo("Repository ID is required.")
            return
        }

        void repoConfig.saveRepoConfig
            .mutateAsync({
                repositoryId: normalizedRepositoryId,
                configYaml: params.configYaml,
                ignorePatterns: params.ignorePatterns,
                reviewMode: params.reviewMode,
            })
            .then((response): void => {
                setConfigYaml(response.config.configYaml)
                setReviewMode(response.config.reviewMode)
                setIgnoredPaths(response.config.ignorePatterns)
                showToastSuccess(params.successMessage)
            })
            .catch((): void => {
                showToastInfo("Unable to save repository config.")
            })
    }

    const handlePathsChange = (nextPaths: ReadonlyArray<string>): void => {
        const normalizedPaths = Array.from(
            new Set(
                nextPaths
                    .map((item): string => item.trim())
                    .filter((item): boolean => item.length > 0),
            ),
        )
        setIgnoredPaths(normalizedPaths)
        persistRepositoryConfig({
            configYaml,
            ignorePatterns: normalizedPaths,
            reviewMode,
            successMessage: "Ignore paths saved.",
        })
    }

    const handlePathReset = (event: FormEvent): void => {
        event.preventDefault()
        const defaultPaths = [...DEFAULT_IGNORED_PATHS]
        setIgnoredPaths(defaultPaths)
        persistRepositoryConfig({
            configYaml,
            ignorePatterns: defaultPaths,
            reviewMode,
            successMessage: "Ignore paths reset to defaults.",
        })
    }

    const handleReviewModeChange = (
        event: ChangeEvent<HTMLSelectElement | HTMLInputElement>,
    ): void => {
        const nextReviewMode = event.currentTarget.value
        if (isRepoReviewMode(nextReviewMode) !== true) {
            return
        }
        setReviewMode(nextReviewMode)
    }

    const handleRepositoryConfigSave = (event: FormEvent): void => {
        event.preventDefault()
        persistRepositoryConfig({
            configYaml,
            ignorePatterns: ignoredPaths,
            reviewMode,
            successMessage: "Repository config saved.",
        })
    }

    const handleRunDryRun = (): void => {
        const result = createDryRunResultSnapshot({
            ignorePatterns: ignoredPaths,
            reviewMode,
        })
        setDryRunResult(result)
        showToastSuccess("Dry-run completed.")
    }

    const handleCadenceSave = (): void => {
        persistRepositoryConfig({
            configYaml,
            ignorePatterns: ignoredPaths,
            reviewMode,
            successMessage: "Review cadence saved.",
        })
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Code Review Configuration</h1>
            <p className="text-sm text-slate-600">
                Configure repository YAML, cadence, severity threshold and ignore paths for automated
                review.
            </p>
            <ConfigurationEditor
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
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold text-slate-900">Review cadence settings</h2>
                <p className="text-sm text-slate-600">
                    Choose how code review is executed for repository updates.
                </p>
                <fieldset aria-label="Review cadence mode" className="space-y-2">
                    {REVIEW_CADENCE_OPTIONS.map(
                        (option): ReactElement => (
                            <label
                                key={option.key}
                                className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-700"
                            >
                                <input
                                    checked={reviewMode === option.key}
                                    className="mt-1"
                                    name="review-cadence-mode"
                                    type="radio"
                                    value={option.key}
                                    onChange={handleReviewModeChange}
                                />
                                <span className="space-y-1">
                                    <span className="block font-medium text-slate-900">
                                        {option.label}
                                    </span>
                                    <span className="block text-xs text-slate-600">
                                        {option.description}
                                    </span>
                                </span>
                            </label>
                        ),
                    )}
                </fieldset>
                <p className="text-xs text-slate-500" data-testid="review-cadence-current">
                    {`Current mode: ${mapReviewModeToLabel(reviewMode)} (${reviewMode})`}
                </p>
                <Button
                    isDisabled={
                        normalizedRepositoryId.length === 0 ||
                        repoConfig.saveRepoConfig.isPending === true
                    }
                    type="button"
                    variant="solid"
                    onPress={handleCadenceSave}
                >
                    Apply cadence mode
                </Button>
            </section>
            <DryRunResultViewer result={dryRunResult} onRunDryRun={handleRunDryRun} />
            <CodeReviewForm initialValues={formValues} onSubmit={saveReviewForm} />
            <IgnorePatternEditor
                helperText="Ignore patterns filter scan scope and CCR output."
                ignoredPatterns={ignoredPaths}
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
