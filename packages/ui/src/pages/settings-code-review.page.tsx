import { type ChangeEvent, type FormEvent, type ReactElement, useEffect, useState } from "react"

import { Button } from "@/components/ui"
import { CCRSummaryPreview } from "@/components/settings/ccr-summary-preview"
import { CodeReviewForm } from "@/components/settings/code-review-form"
import { ConfigurationEditor } from "@/components/settings/configuration-editor"
import {
    DryRunResultViewer,
    type IDryRunResultViewerData,
} from "@/components/settings/dry-run-result-viewer"
import { IgnorePatternEditor } from "@/components/settings/ignore-pattern-editor"
import { ReviewCadenceSelector } from "@/components/settings/review-cadence-selector"
import { RuleEditor } from "@/components/settings/rule-editor"
import { SuggestionLimitConfig } from "@/components/settings/suggestion-limit-config"
import type { ICodeReviewFormValues } from "@/components/settings/settings-form-schemas"
import {
    REPO_REVIEW_MODE,
    type TRepoReviewMode,
} from "@/lib/api/endpoints/repo-config.endpoint"
import { useDryRun, useRepoConfig, useReviewCadence } from "@/lib/hooks/queries"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

const DEFAULT_IGNORED_PATHS: ReadonlyArray<string> = ["/dist", "/node_modules", "/coverage"] as const
const DEFAULT_REPOSITORY_ID = "repo-1"
const DEFAULT_REPOSITORY_CONFIG = "version: 1\nreview:\n  mode: MANUAL\n"
const CCR_SUMMARY_DETAIL_LEVEL = {
    concise: "CONCISE",
    standard: "STANDARD",
    deep: "DEEP",
} as const
const IDE_SYNC_PROVIDER = {
    vscode: "VSCODE",
    jetbrains: "JETBRAINS",
    both: "BOTH",
} as const

type TCcrSummaryDetailLevel =
    (typeof CCR_SUMMARY_DETAIL_LEVEL)[keyof typeof CCR_SUMMARY_DETAIL_LEVEL]
type TIdeSyncProvider = (typeof IDE_SYNC_PROVIDER)[keyof typeof IDE_SYNC_PROVIDER]

interface ICcrSummarySettings {
    readonly detailLevel: TCcrSummaryDetailLevel
    readonly enabled: boolean
    readonly includeRiskOverview: boolean
    readonly includeTimeline: boolean
    readonly maxSuggestions: number
}

interface IIdeSyncSettings {
    readonly autoOpenDiffOnSync: boolean
    readonly enabled: boolean
    readonly provider: TIdeSyncProvider
    readonly syncOnPush: boolean
}

interface IMcpToolUsageStat {
    readonly avgLatencyMs: number
    readonly calls: number
    readonly errorCount: number
    readonly toolId: string
}

const DEFAULT_MCP_TOOL_USAGE_STATS: ReadonlyArray<IMcpToolUsageStat> = [
    {
        toolId: "figma.design-context",
        calls: 142,
        avgLatencyMs: 268,
        errorCount: 4,
    },
    {
        toolId: "repo.context-index",
        calls: 121,
        avgLatencyMs: 182,
        errorCount: 3,
    },
    {
        toolId: "review.diff-insights",
        calls: 95,
        avgLatencyMs: 211,
        errorCount: 6,
    },
] as const

function isRepoReviewMode(value: string): value is TRepoReviewMode {
    return (
        value === REPO_REVIEW_MODE.manual ||
        value === REPO_REVIEW_MODE.auto ||
        value === REPO_REVIEW_MODE.autoPause
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
    const [dryRunResult, setDryRunResult] = useState<IDryRunResultViewerData | undefined>(undefined)
    const [ccrSummarySettings, setCcrSummarySettings] = useState<ICcrSummarySettings>({
        enabled: true,
        includeRiskOverview: true,
        includeTimeline: true,
        detailLevel: CCR_SUMMARY_DETAIL_LEVEL.standard,
        maxSuggestions: 8,
    })
    const [ccrSummaryState, setCcrSummaryState] = useState<string>("Not saved yet.")
    const [ideSyncSettings, setIdeSyncSettings] = useState<IIdeSyncSettings>({
        enabled: true,
        provider: IDE_SYNC_PROVIDER.both,
        syncOnPush: true,
        autoOpenDiffOnSync: true,
    })
    const [ideSyncState, setIdeSyncState] = useState<string>("Not saved yet.")
    const mcpTotalCalls = DEFAULT_MCP_TOOL_USAGE_STATS.reduce(
        (acc, item): number => acc + item.calls,
        0,
    )
    const mcpTotalErrors = DEFAULT_MCP_TOOL_USAGE_STATS.reduce(
        (acc, item): number => acc + item.errorCount,
        0,
    )
    const mcpSuccessRate = Math.max(
        0,
        Math.round(((mcpTotalCalls - mcpTotalErrors) / mcpTotalCalls) * 100),
    )
    const mcpAverageLatencyMs = Math.round(
        DEFAULT_MCP_TOOL_USAGE_STATS.reduce((acc, item): number => acc + item.avgLatencyMs, 0) /
            DEFAULT_MCP_TOOL_USAGE_STATS.length,
    )
    const normalizedRepositoryId = repositoryId.trim()
    const repoConfig = useRepoConfig({
        repositoryId: normalizedRepositoryId,
        enabled: normalizedRepositoryId.length > 0,
    })
    const dryRun = useDryRun()
    const reviewCadence = useReviewCadence()
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
        if (normalizedRepositoryId.length === 0) {
            showToastInfo("Repository ID is required.")
            return
        }

        void dryRun.runDryRun
            .mutateAsync({
                repositoryId: normalizedRepositoryId,
                reviewMode,
                ignorePatterns: ignoredPaths,
            })
            .then((response): void => {
                setDryRunResult(response.result)
                showToastSuccess("Dry-run completed.")
            })
            .catch((): void => {
                showToastInfo("Unable to run dry-run.")
            })
    }

    const handleCadenceSave = (): void => {
        if (normalizedRepositoryId.length === 0) {
            showToastInfo("Repository ID is required.")
            return
        }

        void reviewCadence.updateCadence
            .mutateAsync({
                repositoryId: normalizedRepositoryId,
                reviewMode,
            })
            .then((response): void => {
                setReviewMode(response.config.reviewMode)
                showToastSuccess("Review cadence saved.")
            })
            .catch((): void => {
                showToastInfo("Unable to save review cadence.")
            })
    }

    const handleCadenceModeChange = (mode: TRepoReviewMode): void => {
        setReviewMode(mode)
    }

    const handleSummarySettingsSave = (): void => {
        setCcrSummaryState("Saving CCR summary settings...")
        setTimeout((): void => {
            setCcrSummaryState("CCR summary settings saved.")
            showToastSuccess("CCR summary settings saved.")
        }, 0)
    }

    const handleIdeSyncSave = (): void => {
        setIdeSyncState("Saving IDE sync settings...")
        setTimeout((): void => {
            setIdeSyncState("IDE sync settings saved.")
            showToastSuccess("IDE sync settings saved.")
        }, 0)
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
            <ReviewCadenceSelector
                isApplyDisabled={
                    normalizedRepositoryId.length === 0 ||
                    reviewCadence.updateCadence.isPending === true
                }
                mode={reviewMode}
                onApply={handleCadenceSave}
                onModeChange={handleCadenceModeChange}
            />
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold text-slate-900">CCR summary settings</h2>
                <p className="text-sm text-slate-600">
                    Configure how CCR summary cards are generated and what sections they include.
                </p>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        checked={ccrSummarySettings.enabled}
                        type="checkbox"
                        onChange={(event): void => {
                            setCcrSummarySettings((prev): ICcrSummarySettings => ({
                                ...prev,
                                enabled: event.currentTarget.checked,
                            }))
                        }}
                    />
                    Enable CCR summary generation
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        checked={ccrSummarySettings.includeRiskOverview}
                        type="checkbox"
                        onChange={(event): void => {
                            setCcrSummarySettings((prev): ICcrSummarySettings => ({
                                ...prev,
                                includeRiskOverview: event.currentTarget.checked,
                            }))
                        }}
                    />
                    Include risk overview section
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        checked={ccrSummarySettings.includeTimeline}
                        type="checkbox"
                        onChange={(event): void => {
                            setCcrSummarySettings((prev): ICcrSummarySettings => ({
                                ...prev,
                                includeTimeline: event.currentTarget.checked,
                            }))
                        }}
                    />
                    Include timeline highlights
                </label>
                <label className="space-y-1 text-sm text-slate-700" htmlFor="ccr-summary-detail-level">
                    <span className="block font-medium text-slate-900">Summary detail level</span>
                    <select
                        id="ccr-summary-detail-level"
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={ccrSummarySettings.detailLevel}
                        onChange={(event): void => {
                            const nextLevel = event.currentTarget.value as TCcrSummaryDetailLevel
                            setCcrSummarySettings((prev): ICcrSummarySettings => ({
                                ...prev,
                                detailLevel: nextLevel,
                            }))
                        }}
                    >
                        <option value={CCR_SUMMARY_DETAIL_LEVEL.concise}>Concise</option>
                        <option value={CCR_SUMMARY_DETAIL_LEVEL.standard}>Standard</option>
                        <option value={CCR_SUMMARY_DETAIL_LEVEL.deep}>Deep</option>
                    </select>
                </label>
                <SuggestionLimitConfig
                    value={ccrSummarySettings.maxSuggestions}
                    onChange={(nextValue): void => {
                        setCcrSummarySettings((prev): ICcrSummarySettings => ({
                            ...prev,
                            maxSuggestions: nextValue,
                        }))
                    }}
                />
                <p className="text-xs text-slate-500" data-testid="ccr-summary-state">
                    {ccrSummaryState}
                </p>
                <Button type="button" variant="solid" onPress={handleSummarySettingsSave}>
                    Save CCR summary settings
                </Button>
                <CCRSummaryPreview settings={ccrSummarySettings} />
            </section>
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold text-slate-900">IDE sync settings</h2>
                <p className="text-sm text-slate-600">
                    Configure how CCR decisions and code insights are synced to IDE plugins.
                </p>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        checked={ideSyncSettings.enabled}
                        type="checkbox"
                        onChange={(event): void => {
                            setIdeSyncSettings((prev): IIdeSyncSettings => ({
                                ...prev,
                                enabled: event.currentTarget.checked,
                            }))
                        }}
                    />
                    Enable IDE plugin sync
                </label>
                <label className="space-y-1 text-sm text-slate-700" htmlFor="ide-sync-provider">
                    <span className="block font-medium text-slate-900">IDE provider scope</span>
                    <select
                        id="ide-sync-provider"
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={ideSyncSettings.provider}
                        onChange={(event): void => {
                            const nextProvider = event.currentTarget.value as TIdeSyncProvider
                            setIdeSyncSettings((prev): IIdeSyncSettings => ({
                                ...prev,
                                provider: nextProvider,
                            }))
                        }}
                    >
                        <option value={IDE_SYNC_PROVIDER.vscode}>VS Code</option>
                        <option value={IDE_SYNC_PROVIDER.jetbrains}>JetBrains</option>
                        <option value={IDE_SYNC_PROVIDER.both}>Both</option>
                    </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        checked={ideSyncSettings.syncOnPush}
                        type="checkbox"
                        onChange={(event): void => {
                            setIdeSyncSettings((prev): IIdeSyncSettings => ({
                                ...prev,
                                syncOnPush: event.currentTarget.checked,
                            }))
                        }}
                    />
                    Sync decisions on every push
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        checked={ideSyncSettings.autoOpenDiffOnSync}
                        type="checkbox"
                        onChange={(event): void => {
                            setIdeSyncSettings((prev): IIdeSyncSettings => ({
                                ...prev,
                                autoOpenDiffOnSync: event.currentTarget.checked,
                            }))
                        }}
                    />
                    Auto-open affected diffs after sync
                </label>
                <p className="text-xs text-slate-500" data-testid="ide-sync-state">
                    {ideSyncState}
                </p>
                <Button type="button" variant="solid" onPress={handleIdeSyncSave}>
                    Save IDE sync settings
                </Button>
            </section>
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold text-slate-900">
                    MCP server control panel
                </h2>
                <p className="text-sm text-slate-600">
                    Review MCP tool usage and runtime quality to spot unstable tools before they
                    impact CCR generation.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Total tool calls
                        </p>
                        <p className="text-xl font-semibold text-slate-900" data-testid="mcp-total-calls">
                            {mcpTotalCalls}
                        </p>
                    </article>
                    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Success rate
                        </p>
                        <p
                            className="text-xl font-semibold text-slate-900"
                            data-testid="mcp-success-rate"
                        >
                            {mcpSuccessRate}%
                        </p>
                    </article>
                    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Avg latency
                        </p>
                        <p
                            className="text-xl font-semibold text-slate-900"
                            data-testid="mcp-avg-latency"
                        >
                            {mcpAverageLatencyMs} ms
                        </p>
                    </article>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-slate-600">
                            <tr>
                                <th className="px-3 py-2 font-medium" scope="col">
                                    MCP tool
                                </th>
                                <th className="px-3 py-2 font-medium" scope="col">
                                    Calls
                                </th>
                                <th className="px-3 py-2 font-medium" scope="col">
                                    Errors
                                </th>
                                <th className="px-3 py-2 font-medium" scope="col">
                                    Avg latency
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {DEFAULT_MCP_TOOL_USAGE_STATS.map((item): ReactElement => (
                                <tr key={item.toolId} data-testid="mcp-tool-row">
                                    <td className="px-3 py-2 text-slate-900">{item.toolId}</td>
                                    <td className="px-3 py-2 text-slate-700">{item.calls}</td>
                                    <td className="px-3 py-2 text-slate-700">{item.errorCount}</td>
                                    <td className="px-3 py-2 text-slate-700">
                                        {item.avgLatencyMs} ms
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <DryRunResultViewer
                isRunning={dryRun.runDryRun.isPending}
                result={dryRunResult}
                onRunDryRun={handleRunDryRun}
            />
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
