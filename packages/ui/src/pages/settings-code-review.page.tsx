import { type FormEvent, type ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui"
import { FormLayout } from "@/components/forms/form-layout"
import { FormSection } from "@/components/forms/form-section"
import { FormGroup } from "@/components/forms/form-group"
import { CCRSummaryPreview } from "@/components/settings/ccr-summary-preview"
import { CodeReviewForm } from "@/components/settings/code-review-form"
import { ConfigurationEditor } from "@/components/settings/configuration-editor"
import {
    DryRunResultViewer,
    type IDryRunResultViewerData,
} from "@/components/settings/dry-run-result-viewer"
import { IgnorePatternEditor } from "@/components/settings/ignore-pattern-editor"
import { MCPToolList, type IMcpToolListItem } from "@/components/settings/mcp-tool-list"
import { PromptOverrideEditor } from "@/components/settings/prompt-override-editor"
import { ReviewCadenceSelector } from "@/components/settings/review-cadence-selector"
import { RuleEditor } from "@/components/settings/rule-editor"
import { SuggestionLimitConfig } from "@/components/settings/suggestion-limit-config"
import type { ICodeReviewFormValues } from "@/components/settings/settings-form-schemas"
import { GAP, NATIVE_FORM, PADDING } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { REPO_REVIEW_MODE, type TRepoReviewMode } from "@/lib/api/endpoints/repo-config.endpoint"
import { useCCRSummary, useDryRun, useRepoConfig, useReviewCadence } from "@/lib/hooks/queries"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

const DEFAULT_IGNORED_PATHS: ReadonlyArray<string> = [
    "/dist",
    "/node_modules",
    "/coverage",
] as const
const DEFAULT_REPOSITORY_ID = "repo-1"
const DEFAULT_REPOSITORY_CONFIG = "version: 1\nreview:\n  mode: MANUAL\n"
const DEFAULT_CCR_PROMPT_OVERRIDE = [
    "Generate CCR summary with a clear risk-first structure.",
    "Keep action items implementation-ready and grouped by priority.",
].join("\n")
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

const DEFAULT_MCP_TOOL_USAGE_STATS: ReadonlyArray<IMcpToolListItem> = [
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

/**
 * Страница настроек code-review.
 *
 * @returns Форма управления cadence/severity/suggestions + ignore paths.
 */
export function SettingsCodeReviewPage(): ReactElement {
    const { t } = useTranslation(["settings"])
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
    const [ccrSummaryState, setCcrSummaryState] = useState<string>(
        t("settings:codeReview.notSavedYet"),
    )
    const [promptOverride, setPromptOverride] = useState<string>(DEFAULT_CCR_PROMPT_OVERRIDE)
    const [ideSyncSettings, setIdeSyncSettings] = useState<IIdeSyncSettings>({
        enabled: true,
        provider: IDE_SYNC_PROVIDER.both,
        syncOnPush: true,
        autoOpenDiffOnSync: true,
    })
    const [ideSyncState, setIdeSyncState] = useState<string>(t("settings:codeReview.notSavedYet"))
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
    const ccrSummary = useCCRSummary({
        repositoryId: normalizedRepositoryId,
        enabled: normalizedRepositoryId.length > 0,
    })
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
        showToastSuccess(t("settings:codeReview.toast.codeReviewSettingsSaved"))
    }

    const persistRepositoryConfig = (params: {
        readonly configYaml: string
        readonly ignorePatterns: ReadonlyArray<string>
        readonly reviewMode: TRepoReviewMode
        readonly successMessage: string
    }): void => {
        if (normalizedRepositoryId.length === 0) {
            showToastInfo(t("settings:codeReview.toast.repositoryIdRequired"))
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
            .catch((_error: unknown): void => {
                showToastInfo(t("settings:codeReview.toast.unableToSaveRepoConfig"))
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
            successMessage: t("settings:codeReview.toast.ignorePathsSaved"),
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
            successMessage: t("settings:codeReview.toast.ignorePathsReset"),
        })
    }

    const handleReviewModeChange = (value: TRepoReviewMode): void => {
        setReviewMode(value)
    }

    const handleRepositoryConfigSave = (event: FormEvent): void => {
        event.preventDefault()
        persistRepositoryConfig({
            configYaml,
            ignorePatterns: ignoredPaths,
            reviewMode,
            successMessage: t("settings:codeReview.toast.repositoryConfigSaved"),
        })
    }

    const handleRunDryRun = (): void => {
        if (normalizedRepositoryId.length === 0) {
            showToastInfo(t("settings:codeReview.toast.repositoryIdRequired"))
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
                showToastSuccess(t("settings:codeReview.toast.dryRunCompleted"))
            })
            .catch((_error: unknown): void => {
                showToastInfo(t("settings:codeReview.toast.unableToRunDryRun"))
            })
    }

    const handleCadenceSave = (): void => {
        if (normalizedRepositoryId.length === 0) {
            showToastInfo(t("settings:codeReview.toast.repositoryIdRequired"))
            return
        }

        void reviewCadence.updateCadence
            .mutateAsync({
                repositoryId: normalizedRepositoryId,
                reviewMode,
            })
            .then((response): void => {
                setReviewMode(response.config.reviewMode)
                showToastSuccess(t("settings:codeReview.toast.reviewCadenceSaved"))
            })
            .catch((_error: unknown): void => {
                showToastInfo(t("settings:codeReview.toast.unableToSaveReviewCadence"))
            })
    }

    const handleCadenceModeChange = (mode: TRepoReviewMode): void => {
        setReviewMode(mode)
    }

    const handleSummarySettingsSave = (): void => {
        setCcrSummaryState(t("settings:codeReview.savingCcrSummary"))
        setTimeout((): void => {
            setCcrSummaryState(t("settings:codeReview.ccrSummarySettingsSaved"))
            showToastSuccess(t("settings:codeReview.toast.ccrSummarySettingsSaved"))
        }, 0)
    }

    const handleGenerateCcrSummary = (): void => {
        if (normalizedRepositoryId.length === 0) {
            showToastInfo(t("settings:codeReview.toast.repositoryIdRequired"))
            return
        }

        setCcrSummaryState(t("settings:codeReview.generatingCcrSummary"))
        void ccrSummary.generateSummary
            .mutateAsync({
                repositoryId: normalizedRepositoryId,
                reviewMode,
                detailLevel: ccrSummarySettings.detailLevel,
                includeRiskOverview: ccrSummarySettings.includeRiskOverview,
                includeTimeline: ccrSummarySettings.includeTimeline,
                maxSuggestions: ccrSummarySettings.maxSuggestions,
                promptOverride,
            })
            .then((): void => {
                setCcrSummaryState(t("settings:codeReview.ccrSummaryGenerated"))
                showToastSuccess(t("settings:codeReview.toast.ccrSummaryGenerated"))
            })
            .catch((_error: unknown): void => {
                setCcrSummaryState(t("settings:codeReview.unableToGenerateCcrSummary"))
                showToastInfo(t("settings:codeReview.toast.unableToGenerateCcrSummary"))
            })
    }

    const handleIdeSyncSave = (): void => {
        setIdeSyncState(t("settings:codeReview.savingIdeSyncSettings"))
        setTimeout((): void => {
            setIdeSyncState(t("settings:codeReview.ideSyncSettingsSaved"))
            showToastSuccess(t("settings:codeReview.toast.ideSyncSettingsSaved"))
        }, 0)
    }

    return (
        <FormLayout
            description={t("settings:codeReview.pageDescription")}
            title={t("settings:codeReview.pageTitle")}
        >
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
            <FormSection
                description={t("settings:codeReview.ccrSummaryDescription")}
                heading={t("settings:codeReview.ccrSummaryHeading")}
            >
                <FormGroup withDivider>
                    <label className={`flex items-center gap-2 ${TYPOGRAPHY.body}`}>
                        <input
                            checked={ccrSummarySettings.enabled}
                            type="checkbox"
                            onChange={(event): void => {
                                setCcrSummarySettings(
                                    (prev): ICcrSummarySettings => ({
                                        ...prev,
                                        enabled: event.currentTarget.checked,
                                    }),
                                )
                            }}
                        />
                        {t("settings:codeReview.enableCcrSummary")}
                    </label>
                    <label className={`flex items-center gap-2 ${TYPOGRAPHY.body}`}>
                        <input
                            checked={ccrSummarySettings.includeRiskOverview}
                            type="checkbox"
                            onChange={(event): void => {
                                setCcrSummarySettings(
                                    (prev): ICcrSummarySettings => ({
                                        ...prev,
                                        includeRiskOverview: event.currentTarget.checked,
                                    }),
                                )
                            }}
                        />
                        {t("settings:codeReview.includeRiskOverview")}
                    </label>
                    <label className={`flex items-center gap-2 ${TYPOGRAPHY.body}`}>
                        <input
                            checked={ccrSummarySettings.includeTimeline}
                            type="checkbox"
                            onChange={(event): void => {
                                setCcrSummarySettings(
                                    (prev): ICcrSummarySettings => ({
                                        ...prev,
                                        includeTimeline: event.currentTarget.checked,
                                    }),
                                )
                            }}
                        />
                        {t("settings:codeReview.includeTimeline")}
                    </label>
                </FormGroup>
                <FormGroup>
                    <select
                        aria-label={t("settings:ariaLabel.codeReview.summaryDetailLevel")}
                        className={NATIVE_FORM.select}
                        id="ccr-summary-detail-level"
                        value={ccrSummarySettings.detailLevel}
                        onChange={(event): void => {
                            const nextLevel = event.currentTarget.value
                            if (nextLevel.length === 0) {
                                return
                            }
                            setCcrSummarySettings(
                                (prev): ICcrSummarySettings => ({
                                    ...prev,
                                    detailLevel: nextLevel as TCcrSummaryDetailLevel,
                                }),
                            )
                        }}
                    >
                        <option value={CCR_SUMMARY_DETAIL_LEVEL.concise}>
                            {t("settings:codeReview.detailConcise")}
                        </option>
                        <option value={CCR_SUMMARY_DETAIL_LEVEL.standard}>
                            {t("settings:codeReview.detailStandard")}
                        </option>
                        <option value={CCR_SUMMARY_DETAIL_LEVEL.deep}>
                            {t("settings:codeReview.detailDeep")}
                        </option>
                    </select>
                    <SuggestionLimitConfig
                        value={ccrSummarySettings.maxSuggestions}
                        onChange={(nextValue): void => {
                            setCcrSummarySettings(
                                (prev): ICcrSummarySettings => ({
                                    ...prev,
                                    maxSuggestions: nextValue,
                                }),
                            )
                        }}
                    />
                </FormGroup>
                <p className={TYPOGRAPHY.captionMuted} data-testid="ccr-summary-state">
                    {ccrSummaryState}
                </p>
                <Button
                    color="primary"
                    type="button"
                    variant="solid"
                    onPress={handleSummarySettingsSave}
                >
                    {t("settings:codeReview.saveCcrSummarySettings")}
                </Button>
                <Button
                    isDisabled={
                        ccrSummary.generateSummary.isPending || normalizedRepositoryId.length === 0
                    }
                    type="button"
                    variant="flat"
                    onPress={handleGenerateCcrSummary}
                >
                    {t("settings:codeReview.generateCcrSummaryPreview")}
                </Button>
                <CCRSummaryPreview settings={ccrSummarySettings} />
                <PromptOverrideEditor
                    value={promptOverride}
                    onChange={setPromptOverride}
                    onReset={(): void => {
                        setPromptOverride(DEFAULT_CCR_PROMPT_OVERRIDE)
                    }}
                />
                {ccrSummary.summaryQuery.data === undefined ||
                ccrSummary.summaryQuery.data === null ? (
                    <p className={TYPOGRAPHY.captionMuted} data-testid="ccr-summary-output-empty">
                        {t("settings:codeReview.generateSummaryHint")}
                    </p>
                ) : (
                    (() => {
                        const generatedSummary = ccrSummary.summaryQuery.data
                        return (
                            <article
                                className={`space-y-2 rounded-md border border-border bg-surface ${PADDING.card}`}
                                data-testid="ccr-summary-output"
                            >
                                <p className={TYPOGRAPHY.captionMuted}>
                                    {t("settings:codeReview.generatedAt", {
                                        date: generatedSummary.result.generatedAt,
                                    })}
                                </p>
                                <p className={TYPOGRAPHY.body}>{generatedSummary.result.summary}</p>
                                <ul
                                    className={`list-disc space-y-1 pl-5 ${TYPOGRAPHY.captionMuted}`}
                                >
                                    {generatedSummary.result.highlights.map(
                                        (highlight): ReactElement => (
                                            <li key={highlight}>{highlight}</li>
                                        ),
                                    )}
                                </ul>
                            </article>
                        )
                    })()
                )}
            </FormSection>
            <FormSection
                description={t("settings:codeReview.ideSyncDescription")}
                heading={t("settings:codeReview.ideSyncHeading")}
            >
                <FormGroup withDivider>
                    <label className={`flex items-center gap-2 ${TYPOGRAPHY.body}`}>
                        <input
                            checked={ideSyncSettings.enabled}
                            type="checkbox"
                            onChange={(event): void => {
                                setIdeSyncSettings(
                                    (prev): IIdeSyncSettings => ({
                                        ...prev,
                                        enabled: event.currentTarget.checked,
                                    }),
                                )
                            }}
                        />
                        {t("settings:codeReview.enableIdeSync")}
                    </label>
                    <select
                        aria-label={t("settings:ariaLabel.codeReview.ideProviderScope")}
                        className={NATIVE_FORM.select}
                        id="ide-sync-provider"
                        value={ideSyncSettings.provider}
                        onChange={(event): void => {
                            const nextProvider = event.currentTarget.value
                            if (nextProvider.length === 0) {
                                return
                            }
                            setIdeSyncSettings(
                                (prev): IIdeSyncSettings => ({
                                    ...prev,
                                    provider: nextProvider as TIdeSyncProvider,
                                }),
                            )
                        }}
                    >
                        <option value={IDE_SYNC_PROVIDER.vscode}>
                            {t("settings:codeReview.ideProviderVscode")}
                        </option>
                        <option value={IDE_SYNC_PROVIDER.jetbrains}>
                            {t("settings:codeReview.ideProviderJetbrains")}
                        </option>
                        <option value={IDE_SYNC_PROVIDER.both}>
                            {t("settings:codeReview.ideProviderBoth")}
                        </option>
                    </select>
                </FormGroup>
                <FormGroup>
                    <label className={`flex items-center gap-2 ${TYPOGRAPHY.body}`}>
                        <input
                            checked={ideSyncSettings.syncOnPush}
                            type="checkbox"
                            onChange={(event): void => {
                                setIdeSyncSettings(
                                    (prev): IIdeSyncSettings => ({
                                        ...prev,
                                        syncOnPush: event.currentTarget.checked,
                                    }),
                                )
                            }}
                        />
                        {t("settings:codeReview.syncOnPush")}
                    </label>
                    <label className={`flex items-center gap-2 ${TYPOGRAPHY.body}`}>
                        <input
                            checked={ideSyncSettings.autoOpenDiffOnSync}
                            type="checkbox"
                            onChange={(event): void => {
                                setIdeSyncSettings(
                                    (prev): IIdeSyncSettings => ({
                                        ...prev,
                                        autoOpenDiffOnSync: event.currentTarget.checked,
                                    }),
                                )
                            }}
                        />
                        {t("settings:codeReview.autoOpenDiffs")}
                    </label>
                </FormGroup>
                <p className={TYPOGRAPHY.captionMuted} data-testid="ide-sync-state">
                    {ideSyncState}
                </p>
                <Button color="primary" type="button" variant="solid" onPress={handleIdeSyncSave}>
                    {t("settings:codeReview.saveIdeSyncSettings")}
                </Button>
            </FormSection>
            <FormSection
                description={t("settings:codeReview.mcpDescription")}
                heading={t("settings:codeReview.mcpHeading")}
            >
                <div className={`grid ${GAP.card} sm:grid-cols-3`}>
                    <article
                        className={`rounded-md border border-border bg-surface ${PADDING.card}`}
                    >
                        <p className={TYPOGRAPHY.overline}>
                            {t("settings:codeReview.totalToolCalls")}
                        </p>
                        <p className={TYPOGRAPHY.metricValue} data-testid="mcp-total-calls">
                            {mcpTotalCalls}
                        </p>
                    </article>
                    <article
                        className={`rounded-md border border-border bg-surface ${PADDING.card}`}
                    >
                        <p className={TYPOGRAPHY.overline}>
                            {t("settings:codeReview.successRate")}
                        </p>
                        <p className={TYPOGRAPHY.metricValue} data-testid="mcp-success-rate">
                            {mcpSuccessRate}%
                        </p>
                    </article>
                    <article
                        className={`rounded-md border border-border bg-surface ${PADDING.card}`}
                    >
                        <p className={TYPOGRAPHY.overline}>{t("settings:codeReview.avgLatency")}</p>
                        <p className={TYPOGRAPHY.metricValue} data-testid="mcp-avg-latency">
                            {mcpAverageLatencyMs} ms
                        </p>
                    </article>
                </div>
                <MCPToolList items={DEFAULT_MCP_TOOL_USAGE_STATS} />
            </FormSection>
            <DryRunResultViewer
                isRunning={dryRun.runDryRun.isPending}
                result={dryRunResult}
                onRunDryRun={handleRunDryRun}
            />
            <CodeReviewForm initialValues={formValues} onSubmit={saveReviewForm} />
            <IgnorePatternEditor
                helperText={t("settings:codeReview.ignorePatternHelper")}
                ignoredPatterns={ignoredPaths}
                onChange={handlePathsChange}
            />
            <RuleEditor
                id="code-review-rules-editor"
                label={t("settings:codeReview.reviewRulesLabel")}
                maxLength={4000}
                onChange={setRulesText}
                value={rulesText}
            />
            <form onSubmit={handlePathReset}>
                <Button
                    type="submit"
                    className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-background"
                >
                    {t("settings:codeReview.resetIgnorePaths")}
                </Button>
            </form>
        </FormLayout>
    )
}
