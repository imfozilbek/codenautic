import { type ChangeEvent, type Dispatch, type SetStateAction, useMemo, useState } from "react"

import type {
    ICodeCityTreemapFileDescriptor,
    ICodeCityTreemapImpactedFileDescriptor,
} from "@/components/codecity/codecity-treemap"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

import type {
    IArchitectureDifference,
    IBlueprintHighlightLine,
    IBlueprintValidationResult,
    IDriftTrendPoint,
    IDriftViolation,
    IGuardrailValidationResult,
    IValidationResult,
    TDriftAlertChannel,
    TDriftSeverity,
    TDriftSortMode,
} from "./contract-validation-types"
import {
    BLUEPRINT_STRUCTURE_NODES,
    DEFAULT_BLUEPRINT_YAML,
    DEFAULT_DRIFT_VIOLATIONS,
    DEFAULT_GUARDRAILS_YAML,
    DRIFT_CODE_CITY_FILES,
    DRIFT_TREND_POINTS,
    REALITY_STRUCTURE_NODES,
} from "./contract-validation-constants"
import { buildBlueprintHighlightLines, parseBlueprintYaml } from "./blueprint-parser"
import { parseContractEnvelope, parseGuardrailsYaml } from "./contract-validator"
import { SUPPORTED_SCHEMA } from "./contract-validator"
import {
    DRIFT_SEVERITY_PRIORITY,
    buildArchitectureDifferences,
    compareDriftViolations,
    resolveDriftViolationFileIds,
} from "./drift-analysis-utils"

/**
 * Custom hook encapsulating all state, derived data and event handlers
 * for the contract validation settings page.
 *
 * @returns Readonly object with state values, computed data and handler functions.
 */
export function useContractValidationState(): IContractValidationStateReturn {
    /* ------------------------------------------------------------------ */
    /*  State                                                              */
    /* ------------------------------------------------------------------ */

    const [rawContract, setRawContract] = useState(
        JSON.stringify(
            {
                payload: {
                    items: [
                        {
                            id: "theme-1",
                            name: "Security Focus",
                        },
                    ],
                },
                schema: SUPPORTED_SCHEMA,
                type: "theme-library",
                version: 1,
            },
            null,
            2,
        ),
    )
    const [lastAppliedState, setLastAppliedState] = useState("No contract applied yet.")
    const [validationResult, setValidationResult] = useState<IValidationResult>({
        errors: [],
        migrationHints: [],
    })
    const [blueprintYaml, setBlueprintYaml] = useState<string>(DEFAULT_BLUEPRINT_YAML)
    const [blueprintValidationResult, setBlueprintValidationResult] =
        useState<IBlueprintValidationResult>(() => parseBlueprintYaml(DEFAULT_BLUEPRINT_YAML))
    const [lastBlueprintApplyState, setLastBlueprintApplyState] = useState<string>(
        "No architecture blueprint applied yet.",
    )
    const [driftSeverityFilter, setDriftSeverityFilter] = useState<TDriftSeverity | "all">("all")
    const [driftSearchQuery, setDriftSearchQuery] = useState<string>("")
    const [driftSortMode, setDriftSortMode] = useState<TDriftSortMode>("severity-desc")
    const [driftExportPayload, setDriftExportPayload] = useState<string>(
        "No drift report exported yet.",
    )
    const [driftExportStatus, setDriftExportStatus] = useState<string>(
        "No drift report exported yet.",
    )
    const [selectedDriftOverlayFileId, setSelectedDriftOverlayFileId] = useState<
        string | undefined
    >()
    const [driftAlertSeverityThreshold, setDriftAlertSeverityThreshold] =
        useState<TDriftSeverity>("high")
    const [driftAlertViolationThreshold, setDriftAlertViolationThreshold] = useState<number>(2)
    const [driftAlertChannels, setDriftAlertChannels] = useState<ReadonlyArray<TDriftAlertChannel>>(
        ["slack"],
    )
    const [driftAlertSaveStatus, setDriftAlertSaveStatus] = useState<string>(
        "No drift alert configuration saved yet.",
    )
    const [guardrailsYaml, setGuardrailsYaml] = useState<string>(DEFAULT_GUARDRAILS_YAML)
    const [guardrailsValidationResult, setGuardrailsValidationResult] =
        useState<IGuardrailValidationResult>(() => parseGuardrailsYaml(DEFAULT_GUARDRAILS_YAML))
    const [guardrailsApplyStatus, setGuardrailsApplyStatus] = useState<string>(
        "No architecture guardrails applied yet.",
    )

    /* ------------------------------------------------------------------ */
    /*  Derived / memoized data                                            */
    /* ------------------------------------------------------------------ */

    const previewSummary = useMemo((): string => {
        const envelope = validationResult.normalizedEnvelope
        if (envelope === undefined) {
            return "No preview available."
        }

        const payloadString = JSON.stringify(envelope.payload)
        return `${envelope.type} v${String(envelope.version)} · payload size ${String(
            payloadString.length,
        )} chars`
    }, [validationResult.normalizedEnvelope])

    const blueprintHighlightLines = useMemo((): ReadonlyArray<IBlueprintHighlightLine> => {
        return buildBlueprintHighlightLines(blueprintYaml)
    }, [blueprintYaml])

    const filteredSortedDriftViolations = useMemo((): ReadonlyArray<IDriftViolation> => {
        const normalizedSearchQuery = driftSearchQuery.trim().toLowerCase()
        return DEFAULT_DRIFT_VIOLATIONS.filter((violation): boolean => {
            const matchesSeverity =
                driftSeverityFilter === "all" || violation.severity === driftSeverityFilter
            const matchesSearch =
                normalizedSearchQuery.length === 0 ||
                violation.rule.toLowerCase().includes(normalizedSearchQuery) ||
                violation.rationale.toLowerCase().includes(normalizedSearchQuery) ||
                violation.affectedFiles.some((file): boolean => {
                    return file.toLowerCase().includes(normalizedSearchQuery)
                })
            return matchesSeverity && matchesSearch
        })
            .slice()
            .sort((left, right): number => {
                return compareDriftViolations(left, right, driftSortMode)
            })
    }, [driftSearchQuery, driftSeverityFilter, driftSortMode])

    const driftOverlayImpactedFiles =
        useMemo((): ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor> => {
            const impactedByFileId = new Map<string, ICodeCityTreemapImpactedFileDescriptor>()
            for (const violation of DEFAULT_DRIFT_VIOLATIONS) {
                const affectedFileIds = resolveDriftViolationFileIds(violation)
                for (const fileId of affectedFileIds) {
                    impactedByFileId.set(fileId, {
                        fileId,
                        impactType: "changed",
                    })
                }
            }
            return Array.from(impactedByFileId.values())
        }, [])

    const driftViolationsByFileId = useMemo((): ReadonlyMap<
        string,
        ReadonlyArray<IDriftViolation>
    > => {
        const violationsByFileId = new Map<string, IDriftViolation[]>()
        for (const violation of DEFAULT_DRIFT_VIOLATIONS) {
            const affectedFileIds = resolveDriftViolationFileIds(violation)
            for (const fileId of affectedFileIds) {
                const currentViolations = violationsByFileId.get(fileId)
                if (currentViolations === undefined) {
                    violationsByFileId.set(fileId, [violation])
                    continue
                }
                currentViolations.push(violation)
            }
        }
        return violationsByFileId
    }, [])

    const selectedDriftOverlayFile = useMemo((): ICodeCityTreemapFileDescriptor | undefined => {
        if (selectedDriftOverlayFileId === undefined) {
            return undefined
        }
        return DRIFT_CODE_CITY_FILES.find((file): boolean => file.id === selectedDriftOverlayFileId)
    }, [selectedDriftOverlayFileId])

    const selectedDriftOverlayViolations = useMemo((): ReadonlyArray<IDriftViolation> => {
        if (selectedDriftOverlayFileId === undefined) {
            return []
        }
        return driftViolationsByFileId.get(selectedDriftOverlayFileId) ?? []
    }, [driftViolationsByFileId, selectedDriftOverlayFileId])

    const architectureDifferences = useMemo((): ReadonlyArray<IArchitectureDifference> => {
        return buildArchitectureDifferences(BLUEPRINT_STRUCTURE_NODES, REALITY_STRUCTURE_NODES)
    }, [])

    const architectureDifferenceSummary = useMemo((): string => {
        const matchCount = architectureDifferences.filter(
            (entry): boolean => entry.status === "match",
        ).length
        const missingCount = architectureDifferences.filter(
            (entry): boolean => entry.status === "missing",
        ).length
        const unexpectedCount = architectureDifferences.filter(
            (entry): boolean => entry.status === "unexpected",
        ).length
        return `Matches: ${String(matchCount)} · Missing: ${String(
            missingCount,
        )} · Unexpected: ${String(unexpectedCount)}`
    }, [architectureDifferences])

    const driftTrendAnnotations = useMemo(() => {
        return DRIFT_TREND_POINTS.filter((point): boolean => point.architectureChange !== undefined)
    }, [])

    const driftTrendSummary = useMemo((): string => {
        const baselinePoint = DRIFT_TREND_POINTS.at(0)
        const latestPoint = DRIFT_TREND_POINTS.at(-1)
        if (baselinePoint === undefined || latestPoint === undefined) {
            return "No drift trend data available."
        }

        const delta = latestPoint.driftScore - baselinePoint.driftScore
        if (delta === 0) {
            return `Current drift score: ${String(latestPoint.driftScore)} (no change vs baseline).`
        }

        const direction = delta < 0 ? "improvement" : "regression"
        return `Current drift score: ${String(latestPoint.driftScore)} (${String(
            Math.abs(delta),
        )} points ${direction} vs baseline).`
    }, [])

    const driftAlertRelevantViolationCount = useMemo((): number => {
        const thresholdPriority = DRIFT_SEVERITY_PRIORITY[driftAlertSeverityThreshold]
        return DEFAULT_DRIFT_VIOLATIONS.filter((violation): boolean => {
            return DRIFT_SEVERITY_PRIORITY[violation.severity] >= thresholdPriority
        }).length
    }, [driftAlertSeverityThreshold])

    const driftAlertWouldTrigger = useMemo((): boolean => {
        return driftAlertRelevantViolationCount >= driftAlertViolationThreshold
    }, [driftAlertRelevantViolationCount, driftAlertViolationThreshold])

    /* ------------------------------------------------------------------ */
    /*  Handlers                                                           */
    /* ------------------------------------------------------------------ */

    const handleValidateContract = (): void => {
        const nextResult = parseContractEnvelope(rawContract)
        setValidationResult(nextResult)

        if (nextResult.errors.length > 0) {
            showToastError("Contract validation failed.")
            return
        }

        showToastSuccess("Contract validation passed.")
    }

    const handleApplyContract = (): void => {
        const envelope = validationResult.normalizedEnvelope
        if (envelope === undefined) {
            setLastAppliedState("Apply blocked: validate contract first.")
            showToastError("Contract apply blocked.")
            return
        }

        setLastAppliedState(
            `Applied ${envelope.type} contract v${String(
                envelope.version,
            )} with deterministic preview.`,
        )
        showToastInfo("Contract applied.")
    }

    const handleValidateBlueprint = (): void => {
        const nextResult = parseBlueprintYaml(blueprintYaml)
        setBlueprintValidationResult(nextResult)

        if (nextResult.errors.length > 0) {
            showToastError("Blueprint validation failed.")
            return
        }

        showToastSuccess("Blueprint validation passed.")
    }

    const handleApplyBlueprint = (): void => {
        if (blueprintValidationResult.errors.length > 0) {
            setLastBlueprintApplyState("Apply blocked: fix blueprint validation issues first.")
            showToastError("Blueprint apply blocked.")
            return
        }

        setLastBlueprintApplyState(
            `Applied architecture blueprint with ${String(
                blueprintValidationResult.nodes.length,
            )} visual nodes.`,
        )
        showToastInfo("Architecture blueprint applied.")
    }

    const handleUploadBlueprint = (event: ChangeEvent<HTMLInputElement>): void => {
        const uploadedFile = event.currentTarget.files?.[0]
        if (uploadedFile === undefined) {
            return
        }

        void uploadedFile
            .text()
            .then((fileContent): void => {
                setBlueprintYaml(fileContent)
                setBlueprintValidationResult(parseBlueprintYaml(fileContent))
                showToastInfo("Blueprint YAML uploaded.")
            })
            .catch((): void => {
                showToastError("Failed to read blueprint YAML file.")
            })
        event.currentTarget.value = ""
    }

    const handleExportDriftReport = (): void => {
        const exportEnvelope = {
            generatedAt: new Date().toISOString(),
            searchQuery: driftSearchQuery,
            severityFilter: driftSeverityFilter,
            sortMode: driftSortMode,
            totalViolations: filteredSortedDriftViolations.length,
            violations: filteredSortedDriftViolations,
        }
        const payload = JSON.stringify(exportEnvelope, null, 2)
        setDriftExportPayload(payload)
        setDriftExportStatus(
            `Exported drift report with ${String(filteredSortedDriftViolations.length)} violations.`,
        )
        showToastInfo("Drift report exported.")
    }

    const handleDriftAlertChannelToggle = (channel: TDriftAlertChannel): void => {
        setDriftAlertChannels((currentChannels): ReadonlyArray<TDriftAlertChannel> => {
            if (currentChannels.includes(channel) === true) {
                return currentChannels.filter(
                    (currentChannel): boolean => currentChannel !== channel,
                )
            }
            return [...currentChannels, channel]
        })
    }

    const handleDriftAlertThresholdChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const parsedThreshold = Number.parseInt(event.currentTarget.value, 10)
        if (Number.isNaN(parsedThreshold) === true) {
            setDriftAlertViolationThreshold(0)
            return
        }
        setDriftAlertViolationThreshold(Math.max(0, parsedThreshold))
    }

    const handleSaveDriftAlertConfig = (): void => {
        if (driftAlertChannels.length === 0) {
            setDriftAlertSaveStatus("Save blocked: select at least one notification channel.")
            showToastError("Drift alert save blocked.")
            return
        }

        const channelsLabel = driftAlertChannels.join(", ")
        setDriftAlertSaveStatus(
            `Drift alerts saved: severity ${driftAlertSeverityThreshold}, threshold ${String(
                driftAlertViolationThreshold,
            )}, channels: ${channelsLabel}.`,
        )
        showToastSuccess("Drift alerts configuration saved.")
    }

    const handleValidateGuardrails = (): void => {
        const nextValidationResult = parseGuardrailsYaml(guardrailsYaml)
        setGuardrailsValidationResult(nextValidationResult)

        if (nextValidationResult.errors.length > 0) {
            showToastError("Architecture guardrails validation failed.")
            return
        }

        showToastSuccess("Architecture guardrails validation passed.")
    }

    const handleApplyGuardrails = (): void => {
        if (guardrailsValidationResult.errors.length > 0) {
            setGuardrailsApplyStatus("Apply blocked: fix guardrails validation issues first.")
            showToastError("Architecture guardrails apply blocked.")
            return
        }

        setGuardrailsApplyStatus(
            `Applied architecture guardrails with ${String(
                guardrailsValidationResult.rules.length,
            )} rules.`,
        )
        showToastInfo("Architecture guardrails applied.")
    }

    /* ------------------------------------------------------------------ */
    /*  Public API                                                         */
    /* ------------------------------------------------------------------ */

    return {
        architectureDifferenceSummary,
        architectureDifferences,
        blueprintHighlightLines,
        blueprintValidationResult,
        blueprintYaml,
        driftAlertChannels,
        driftAlertRelevantViolationCount,
        driftAlertSaveStatus,
        driftAlertSeverityThreshold,
        driftAlertViolationThreshold,
        driftAlertWouldTrigger,
        driftExportPayload,
        driftExportStatus,
        driftOverlayImpactedFiles,
        driftSearchQuery,
        driftSeverityFilter,
        driftSortMode,
        driftTrendAnnotations,
        driftTrendSummary,
        filteredSortedDriftViolations,
        guardrailsApplyStatus,
        guardrailsValidationResult,
        guardrailsYaml,
        handleApplyBlueprint,
        handleApplyContract,
        handleApplyGuardrails,
        handleDriftAlertChannelToggle,
        handleDriftAlertThresholdChange,
        handleExportDriftReport,
        handleSaveDriftAlertConfig,
        handleUploadBlueprint,
        handleValidateBlueprint,
        handleValidateContract,
        handleValidateGuardrails,
        lastAppliedState,
        lastBlueprintApplyState,
        previewSummary,
        rawContract,
        selectedDriftOverlayFile,
        selectedDriftOverlayFileId,
        selectedDriftOverlayViolations,
        setBlueprintYaml,
        setDriftAlertSeverityThreshold,
        setDriftSearchQuery,
        setDriftSeverityFilter,
        setDriftSortMode,
        setGuardrailsYaml,
        setRawContract,
        setSelectedDriftOverlayFileId,
        validationResult,
    }
}

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

/**
 * Explicit return type interface for the contract validation state hook.
 */
interface IContractValidationStateReturn {
    readonly architectureDifferenceSummary: string
    readonly architectureDifferences: ReadonlyArray<IArchitectureDifference>
    readonly blueprintHighlightLines: ReadonlyArray<IBlueprintHighlightLine>
    readonly blueprintValidationResult: IBlueprintValidationResult
    readonly blueprintYaml: string
    readonly driftAlertChannels: ReadonlyArray<TDriftAlertChannel>
    readonly driftAlertRelevantViolationCount: number
    readonly driftAlertSaveStatus: string
    readonly driftAlertSeverityThreshold: TDriftSeverity
    readonly driftAlertViolationThreshold: number
    readonly driftAlertWouldTrigger: boolean
    readonly driftExportPayload: string
    readonly driftExportStatus: string
    readonly driftOverlayImpactedFiles: ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor>
    readonly driftSearchQuery: string
    readonly driftSeverityFilter: TDriftSeverity | "all"
    readonly driftSortMode: TDriftSortMode
    readonly driftTrendAnnotations: IDriftTrendPoint[]
    readonly driftTrendSummary: string
    readonly filteredSortedDriftViolations: ReadonlyArray<IDriftViolation>
    readonly guardrailsApplyStatus: string
    readonly guardrailsValidationResult: IGuardrailValidationResult
    readonly guardrailsYaml: string
    readonly handleApplyBlueprint: () => void
    readonly handleApplyContract: () => void
    readonly handleApplyGuardrails: () => void
    readonly handleDriftAlertChannelToggle: (channel: TDriftAlertChannel) => void
    readonly handleDriftAlertThresholdChange: (event: ChangeEvent<HTMLInputElement>) => void
    readonly handleExportDriftReport: () => void
    readonly handleSaveDriftAlertConfig: () => void
    readonly handleUploadBlueprint: (event: ChangeEvent<HTMLInputElement>) => void
    readonly handleValidateBlueprint: () => void
    readonly handleValidateContract: () => void
    readonly handleValidateGuardrails: () => void
    readonly lastAppliedState: string
    readonly lastBlueprintApplyState: string
    readonly previewSummary: string
    readonly rawContract: string
    readonly selectedDriftOverlayFile: ICodeCityTreemapFileDescriptor | undefined
    readonly selectedDriftOverlayFileId: string | undefined
    readonly selectedDriftOverlayViolations: ReadonlyArray<IDriftViolation>
    readonly setBlueprintYaml: Dispatch<SetStateAction<string>>
    readonly setDriftAlertSeverityThreshold: Dispatch<SetStateAction<TDriftSeverity>>
    readonly setDriftSearchQuery: Dispatch<SetStateAction<string>>
    readonly setDriftSeverityFilter: Dispatch<SetStateAction<TDriftSeverity | "all">>
    readonly setDriftSortMode: Dispatch<SetStateAction<TDriftSortMode>>
    readonly setGuardrailsYaml: Dispatch<SetStateAction<string>>
    readonly setRawContract: Dispatch<SetStateAction<string>>
    readonly setSelectedDriftOverlayFileId: Dispatch<SetStateAction<string | undefined>>
    readonly validationResult: IValidationResult
}

/**
 * Inferred return type of the contract validation state hook.
 */
export type IContractValidationState = ReturnType<typeof useContractValidationState>
