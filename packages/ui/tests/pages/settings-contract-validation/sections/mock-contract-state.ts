import { vi } from "vitest"

import type { IContractValidationState } from "@/pages/settings-contract-validation/use-contract-validation-state"

/**
 * Создает мок-состояние contract validation для тестирования секций.
 *
 * @param overrides Частичные переопределения полей.
 * @returns Мок-объект IContractValidationState.
 */
export function createMockContractState(
    overrides: Partial<IContractValidationState> = {},
): IContractValidationState {
    return {
        rawContract: '{"type":"theme-library","version":1}',
        setRawContract: vi.fn(),
        lastAppliedState: "No contract applied yet.",
        validationResult: { errors: [], migrationHints: [] },
        previewSummary: "theme-library contract v1",
        handleValidateContract: vi.fn(),
        handleApplyContract: vi.fn(),
        blueprintYaml: "layers:\n  - domain\n  - application",
        setBlueprintYaml: vi.fn(),
        blueprintValidationResult: {
            errors: [],
            nodes: [
                { id: "n1", kind: "layer", label: "domain", depth: 0 },
                { id: "n2", kind: "layer", label: "application", depth: 0 },
            ],
        },
        blueprintHighlightLines: [
            { id: "line-1", indent: 0, key: "layers", value: undefined, comment: undefined },
            { id: "line-2", indent: 12, key: undefined, value: "domain", comment: undefined },
        ],
        lastBlueprintApplyState: "No architecture blueprint applied yet.",
        handleValidateBlueprint: vi.fn(),
        handleApplyBlueprint: vi.fn(),
        handleUploadBlueprint: vi.fn(),
        guardrailsYaml: "rules:\n  - source: domain\n    target: infrastructure\n    mode: forbid",
        setGuardrailsYaml: vi.fn(),
        guardrailsValidationResult: {
            errors: [],
            rules: [
                { id: "r1", source: "domain", target: "infrastructure", mode: "forbid" as const },
            ],
        },
        guardrailsApplyStatus: "No guardrails applied yet.",
        handleValidateGuardrails: vi.fn(),
        handleApplyGuardrails: vi.fn(),
        driftSearchQuery: "",
        setDriftSearchQuery: vi.fn(),
        driftSeverityFilter: "all",
        setDriftSeverityFilter: vi.fn(),
        driftSortMode: "severity-desc",
        setDriftSortMode: vi.fn(),
        filteredSortedDriftViolations: [
            {
                id: "v1",
                rule: "no-cross-boundary",
                severity: "high" as const,
                rationale: "Domain imports infrastructure",
                affectedFiles: ["src/domain/service.ts"],
            },
        ],
        driftExportStatus: "No export yet.",
        driftExportPayload: "{}",
        handleExportDriftReport: vi.fn(),
        selectedDriftOverlayFileId: undefined,
        setSelectedDriftOverlayFileId: vi.fn(),
        selectedDriftOverlayFile: undefined,
        selectedDriftOverlayViolations: [],
        driftOverlayImpactedFiles: [],
        driftAlertSeverityThreshold: "high" as const,
        setDriftAlertSeverityThreshold: vi.fn(),
        driftAlertViolationThreshold: 3,
        handleDriftAlertThresholdChange: vi.fn(),
        driftAlertChannels: ["slack"] as ReadonlyArray<string>,
        handleDriftAlertChannelToggle: vi.fn(),
        driftAlertWouldTrigger: false,
        driftAlertRelevantViolationCount: 1,
        driftAlertSaveStatus: "Not saved.",
        handleSaveDriftAlertConfig: vi.fn(),
        architectureDifferenceSummary: "2 differences found",
        architectureDifferences: [
            {
                id: "d1",
                layer: "infrastructure",
                module: "cache",
                status: "missing" as const,
                description: "Module not found in runtime",
            },
        ],
        driftTrendAnnotations: [
            { period: "W03", driftScore: 42, architectureChange: "Added cache layer" },
        ],
        driftTrendSummary: "Drift score trending upward",
        ...overrides,
    } as unknown as IContractValidationState
}
