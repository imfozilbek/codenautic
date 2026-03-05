import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

import {
    CodeCityTreemap,
    type ICodeCityTreemapFileDescriptor,
    type ICodeCityTreemapImpactedFileDescriptor,
} from "@/components/graphs/codecity-treemap"
import { Alert, Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TContractType = "rules-library" | "theme-library"

interface IContractEnvelope {
    readonly schema: string
    readonly version: number
    readonly type: TContractType
    readonly payload: unknown
}

interface IValidationResult {
    readonly errors: ReadonlyArray<string>
    readonly migrationHints: ReadonlyArray<string>
    readonly normalizedEnvelope?: IContractEnvelope
}

const SUPPORTED_SCHEMA = "codenautic.contract.v1"
const SUPPORTED_VERSIONS: ReadonlyArray<number> = [1, 2]

interface IBlueprintNode {
    readonly id: string
    readonly depth: number
    readonly kind: "layer" | "rule" | "metadata"
    readonly label: string
    readonly value?: string
}

interface IBlueprintHighlightLine {
    readonly id: string
    readonly indent: number
    readonly key?: string
    readonly value?: string
    readonly comment?: string
}

interface IBlueprintValidationResult {
    readonly errors: ReadonlyArray<string>
    readonly nodes: ReadonlyArray<IBlueprintNode>
}

type TDriftSeverity = "critical" | "high" | "medium" | "low"
type TDriftSortMode = "severity-desc" | "severity-asc" | "files-desc" | "files-asc"
type TDriftAlertChannel = "slack" | "email" | "teams" | "webhook"

interface IDriftViolation {
    readonly id: string
    readonly rule: string
    readonly severity: TDriftSeverity
    readonly affectedFiles: ReadonlyArray<string>
    readonly rationale: string
}

type TArchitectureDiffStatus = "match" | "missing" | "unexpected"

interface IArchitectureStructureNode {
    readonly id: string
    readonly layer: string
    readonly module: string
    readonly dependsOn: ReadonlyArray<string>
}

interface IArchitectureDifference {
    readonly id: string
    readonly layer: string
    readonly module: string
    readonly status: TArchitectureDiffStatus
    readonly description: string
}

interface IDriftTrendPoint {
    readonly period: string
    readonly driftScore: number
    readonly architectureChange?: string
}

interface IDriftAlertChannelOption {
    readonly id: TDriftAlertChannel
    readonly label: string
}

const DEFAULT_BLUEPRINT_YAML = [
    "version: 1",
    "layers:",
    "  - name: domain",
    "    allow:",
    "      - domain",
    "  - name: application",
    "    allow:",
    "      - domain",
    "      - application",
    "rules:",
    "  - source: infrastructure",
    "    target: domain",
    "    mode: forbid",
].join("\n")

const DRIFT_SEVERITY_PRIORITY: Record<TDriftSeverity, number> = {
    critical: 4,
    high: 3,
    low: 1,
    medium: 2,
}

const DEFAULT_DRIFT_VIOLATIONS: ReadonlyArray<IDriftViolation> = [
    {
        affectedFiles: ["src/infrastructure/http/review.controller.ts", "src/domain/review.aggregate.ts"],
        id: "drift-001",
        rationale: "Controller layer imports aggregate directly, bypassing application use case.",
        rule: "Layer violation: infrastructure imports domain directly",
        severity: "high",
    },
    {
        affectedFiles: [
            "src/application/use-cases/review-merge-request.use-case.ts",
            "src/infrastructure/repository/review.repository.ts",
            "src/infrastructure/messaging/review.events.ts",
        ],
        id: "drift-002",
        rationale: "Mutual dependency chain creates cycle between application and infrastructure.",
        rule: "Dependency cycle between application and infrastructure",
        severity: "critical",
    },
    {
        affectedFiles: ["src/domain/entities/review.ts", "src/domain/value-objects/risk-score.ts"],
        id: "drift-003",
        rationale: "Rule requires explicit domain events but several state transitions are silent.",
        rule: "Domain events missing in aggregate state transitions",
        severity: "medium",
    },
    {
        affectedFiles: ["src/adapters/git/gitlab-client.ts"],
        id: "drift-004",
        rationale: "Adapter naming is inconsistent with anti-corruption layer naming convention.",
        rule: "Naming drift in adapter boundary",
        severity: "low",
    },
]

const DRIFT_FILE_ID_BY_PATH: Readonly<Record<string, string>> = {
    "src/infrastructure/http/review.controller.ts": "drift-file-review-controller",
    "src/domain/review.aggregate.ts": "drift-file-review-aggregate",
    "src/application/use-cases/review-merge-request.use-case.ts": "drift-file-review-usecase",
    "src/infrastructure/repository/review.repository.ts": "drift-file-review-repository",
    "src/infrastructure/messaging/review.events.ts": "drift-file-review-events",
    "src/domain/entities/review.ts": "drift-file-review-entity",
    "src/domain/value-objects/risk-score.ts": "drift-file-risk-score",
    "src/adapters/git/gitlab-client.ts": "drift-file-gitlab-client",
}

const DRIFT_CODE_CITY_FILES: ReadonlyArray<ICodeCityTreemapFileDescriptor> = [
    {
        complexity: 28,
        coverage: 62,
        id: "drift-file-review-controller",
        issueCount: 5,
        loc: 240,
        path: "src/infrastructure/http/review.controller.ts",
    },
    {
        complexity: 31,
        coverage: 71,
        id: "drift-file-review-aggregate",
        issueCount: 4,
        loc: 212,
        path: "src/domain/review.aggregate.ts",
    },
    {
        complexity: 37,
        coverage: 58,
        id: "drift-file-review-usecase",
        issueCount: 6,
        loc: 298,
        path: "src/application/use-cases/review-merge-request.use-case.ts",
    },
    {
        complexity: 29,
        coverage: 64,
        id: "drift-file-review-repository",
        issueCount: 5,
        loc: 250,
        path: "src/infrastructure/repository/review.repository.ts",
    },
    {
        complexity: 24,
        coverage: 66,
        id: "drift-file-review-events",
        issueCount: 4,
        loc: 172,
        path: "src/infrastructure/messaging/review.events.ts",
    },
    {
        complexity: 22,
        coverage: 78,
        id: "drift-file-review-entity",
        issueCount: 3,
        loc: 166,
        path: "src/domain/entities/review.ts",
    },
    {
        complexity: 16,
        coverage: 84,
        id: "drift-file-risk-score",
        issueCount: 2,
        loc: 118,
        path: "src/domain/value-objects/risk-score.ts",
    },
    {
        complexity: 18,
        coverage: 74,
        id: "drift-file-gitlab-client",
        issueCount: 1,
        loc: 186,
        path: "src/adapters/git/gitlab-client.ts",
    },
]

const BLUEPRINT_STRUCTURE_NODES: ReadonlyArray<IArchitectureStructureNode> = [
    {
        dependsOn: [],
        id: "blueprint-domain-review-aggregate",
        layer: "domain",
        module: "review.aggregate",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "blueprint-application-review-usecase",
        layer: "application",
        module: "review-merge-request.use-case",
    },
    {
        dependsOn: ["application/review-merge-request.use-case"],
        id: "blueprint-infrastructure-review-controller",
        layer: "infrastructure",
        module: "review.controller",
    },
]

const REALITY_STRUCTURE_NODES: ReadonlyArray<IArchitectureStructureNode> = [
    {
        dependsOn: ["infrastructure/review.events"],
        id: "reality-domain-review-aggregate",
        layer: "domain",
        module: "review.aggregate",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "reality-application-review-usecase",
        layer: "application",
        module: "review-merge-request.use-case",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "reality-infrastructure-review-controller",
        layer: "infrastructure",
        module: "review.controller",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "reality-infrastructure-review-events",
        layer: "infrastructure",
        module: "review.events",
    },
]

const DRIFT_TREND_POINTS: ReadonlyArray<IDriftTrendPoint> = [
    {
        driftScore: 78,
        period: "Jan",
    },
    {
        architectureChange: "ADR-018: Introduced import boundaries for application layer.",
        driftScore: 69,
        period: "Feb",
    },
    {
        driftScore: 64,
        period: "Mar",
    },
    {
        architectureChange: "ADR-021: Introduced anti-corruption layer for provider boundaries.",
        driftScore: 55,
        period: "Apr",
    },
    {
        driftScore: 48,
        period: "May",
    },
    {
        architectureChange: "ADR-024: Isolated domain events from infrastructure handlers.",
        driftScore: 41,
        period: "Jun",
    },
]

const DRIFT_ALERT_CHANNEL_OPTIONS: ReadonlyArray<IDriftAlertChannelOption> = [
    {
        id: "slack",
        label: "Slack",
    },
    {
        id: "email",
        label: "Email",
    },
    {
        id: "teams",
        label: "Teams",
    },
    {
        id: "webhook",
        label: "Webhook",
    },
]

function resolveBlueprintNodeKind(key: string): IBlueprintNode["kind"] {
    if (key === "layers" || key === "name" || key === "layer") {
        return "layer"
    }
    if (key === "rules" || key === "source" || key === "target" || key === "mode") {
        return "rule"
    }
    return "metadata"
}

/**
 * Разбирает YAML blueprint в lightweight visual model и валидирует обязательные секции.
 *
 * @param rawYaml Текст blueprint.
 * @returns Ошибки валидации и узлы для визуального превью.
 */
function parseBlueprintYaml(rawYaml: string): IBlueprintValidationResult {
    const normalizedYaml = rawYaml.replaceAll("\r\n", "\n")
    const lines = normalizedYaml.split("\n")
    const errors: Array<string> = []
    const nodes: Array<IBlueprintNode> = []
    let hasLayers = false
    let hasRules = false
    let activeSectionKind: IBlueprintNode["kind"] = "metadata"

    for (const [index, line] of lines.entries()) {
        if (line.includes("\t")) {
            errors.push(`Line ${String(index + 1)}: tabs are not allowed, use spaces.`)
            continue
        }

        const trimmedLine = line.trim()
        if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
            continue
        }

        const indentation = line.length - line.trimStart().length
        const depth = Math.max(0, Math.floor(indentation / 2))
        const isListItem = trimmedLine.startsWith("- ")
        const normalizedLine = isListItem ? trimmedLine.slice(2).trim() : trimmedLine
        const separatorIndex = normalizedLine.indexOf(":")
        if (separatorIndex <= 0) {
            if (isListItem === true && normalizedLine.length > 0) {
                nodes.push({
                    depth,
                    id: `blueprint-node-${String(index)}-item`,
                    kind: activeSectionKind,
                    label: "item",
                    value: normalizedLine,
                })
                continue
            }
            errors.push(`Line ${String(index + 1)}: expected key-value pair in YAML format.`)
            continue
        }

        const key = normalizedLine.slice(0, separatorIndex).trim()
        const value = normalizedLine.slice(separatorIndex + 1).trim()
        if (key === "layers") {
            hasLayers = true
            activeSectionKind = "layer"
        }
        if (key === "rules") {
            hasRules = true
            activeSectionKind = "rule"
        }

        nodes.push({
            depth,
            id: `blueprint-node-${String(index)}-${key}`,
            kind: resolveBlueprintNodeKind(key),
            label: key,
            value: value.length === 0 ? undefined : value,
        })
    }

    if (hasLayers === false) {
        errors.push("Blueprint must include `layers` section.")
    }
    if (hasRules === false) {
        errors.push("Blueprint must include `rules` section.")
    }

    return {
        errors,
        nodes,
    }
}

/**
 * Формирует строки с псевдо-подсветкой key/value для YAML редактора.
 *
 * @param rawYaml YAML текст.
 * @returns Набор строк для syntax highlight preview.
 */
function buildBlueprintHighlightLines(rawYaml: string): ReadonlyArray<IBlueprintHighlightLine> {
    return rawYaml
        .replaceAll("\r\n", "\n")
        .split("\n")
        .map((line, index): IBlueprintHighlightLine => {
            const indentation = line.length - line.trimStart().length
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith("#")) {
                return {
                    comment: trimmedLine,
                    id: `blueprint-highlight-${String(index)}`,
                    indent: indentation,
                }
            }
            const normalizedLine = trimmedLine.startsWith("- ")
                ? trimmedLine.slice(2).trim()
                : trimmedLine
            const separatorIndex = normalizedLine.indexOf(":")
            if (separatorIndex <= 0) {
                return {
                    id: `blueprint-highlight-${String(index)}`,
                    indent: indentation,
                    value: trimmedLine,
                }
            }

            const key = normalizedLine.slice(0, separatorIndex).trim()
            const value = normalizedLine.slice(separatorIndex + 1).trim()
            return {
                id: `blueprint-highlight-${String(index)}`,
                indent: indentation,
                key,
                value,
            }
        })
}

function compareDriftViolations(
    left: IDriftViolation,
    right: IDriftViolation,
    sortMode: TDriftSortMode,
): number {
    if (sortMode === "severity-desc") {
        return DRIFT_SEVERITY_PRIORITY[right.severity] - DRIFT_SEVERITY_PRIORITY[left.severity]
    }

    if (sortMode === "severity-asc") {
        return DRIFT_SEVERITY_PRIORITY[left.severity] - DRIFT_SEVERITY_PRIORITY[right.severity]
    }

    if (sortMode === "files-desc") {
        return right.affectedFiles.length - left.affectedFiles.length
    }

    return left.affectedFiles.length - right.affectedFiles.length
}

function resolveDriftViolationFileIds(violation: IDriftViolation): ReadonlyArray<string> {
    return violation.affectedFiles
        .map((filePath): string | undefined => {
            return DRIFT_FILE_ID_BY_PATH[filePath]
        })
        .filter((fileId): fileId is string => fileId !== undefined)
}

function buildArchitectureDifferences(
    blueprintNodes: ReadonlyArray<IArchitectureStructureNode>,
    realityNodes: ReadonlyArray<IArchitectureStructureNode>,
): ReadonlyArray<IArchitectureDifference> {
    const realityByKey = new Map<string, IArchitectureStructureNode>()
    const blueprintByKey = new Map<string, IArchitectureStructureNode>()
    const differences: IArchitectureDifference[] = []

    for (const node of realityNodes) {
        realityByKey.set(`${node.layer}/${node.module}`, node)
    }
    for (const node of blueprintNodes) {
        blueprintByKey.set(`${node.layer}/${node.module}`, node)
    }

    for (const blueprintNode of blueprintNodes) {
        const nodeKey = `${blueprintNode.layer}/${blueprintNode.module}`
        const realityNode = realityByKey.get(nodeKey)
        if (realityNode === undefined) {
            differences.push({
                description: "Module is declared in blueprint but missing in runtime structure.",
                id: `architecture-diff-missing-${nodeKey}`,
                layer: blueprintNode.layer,
                module: blueprintNode.module,
                status: "missing",
            })
            continue
        }

        const blueprintDependsOn = blueprintNode.dependsOn.join(",")
        const realityDependsOn = realityNode.dependsOn.join(",")
        differences.push({
            description:
                blueprintDependsOn === realityDependsOn
                    ? "Module dependency direction matches blueprint."
                    : "Dependency direction mismatch for aggregate access path.",
            id: `architecture-diff-match-${nodeKey}`,
            layer: blueprintNode.layer,
            module: blueprintNode.module,
            status: "match",
        })
    }

    for (const realityNode of realityNodes) {
        const nodeKey = `${realityNode.layer}/${realityNode.module}`
        if (blueprintByKey.has(nodeKey) === true) {
            continue
        }
        differences.push({
            description: "Module exists in runtime structure but not defined in blueprint.",
            id: `architecture-diff-unexpected-${nodeKey}`,
            layer: realityNode.layer,
            module: realityNode.module,
            status: "unexpected",
        })
    }

    return differences
}

function resolveArchitectureDifferenceBadgeClass(status: TArchitectureDiffStatus): string {
    if (status === "match") {
        return "border-emerald-300 bg-emerald-50 text-emerald-700"
    }
    if (status === "missing") {
        return "border-amber-300 bg-amber-50 text-amber-700"
    }
    return "border-rose-300 bg-rose-50 text-rose-700"
}

function parseContractEnvelope(rawValue: string): IValidationResult {
    let parsedValue: unknown
    try {
        parsedValue = JSON.parse(rawValue)
    } catch (_error: unknown) {
        return {
            errors: ["Invalid JSON format. Provide a valid JSON object."],
            migrationHints: [],
        }
    }

    if (typeof parsedValue !== "object" || parsedValue === null) {
        return {
            errors: ["Contract root must be an object envelope."],
            migrationHints: [],
        }
    }

    const candidate = parsedValue as {
        readonly schema?: unknown
        readonly version?: unknown
        readonly type?: unknown
        readonly payload?: unknown
    }

    const errors: Array<string> = []
    const migrationHints: Array<string> = []

    if (candidate.schema !== SUPPORTED_SCHEMA) {
        errors.push(`Unsupported schema. Expected "${SUPPORTED_SCHEMA}".`)
    }

    if (typeof candidate.version !== "number") {
        errors.push("Version is required and must be a number.")
    } else if (SUPPORTED_VERSIONS.includes(candidate.version) !== true) {
        errors.push(`Version ${String(candidate.version)} is not supported.`)
    }

    if (candidate.type !== "theme-library" && candidate.type !== "rules-library") {
        errors.push('Type must be either "theme-library" or "rules-library".')
    }

    if (candidate.payload === undefined) {
        errors.push("Payload is required.")
    }

    if (
        errors.length === 0
        && typeof candidate.version === "number"
        && candidate.version === 1
    ) {
        migrationHints.push(
            "Version 1 contract is accepted with migration. Add explicit `metadata` block for v2.",
        )
    }

    if (errors.length > 0) {
        return {
            errors,
            migrationHints,
        }
    }

    return {
        errors: [],
        migrationHints,
        normalizedEnvelope: {
            payload: candidate.payload,
            schema: candidate.schema as string,
            type: candidate.type as TContractType,
            version: candidate.version as number,
        },
    }
}

/**
 * Экран import/export contract validation.
 *
 * @returns Validation, migration hints и preview before apply.
 */
export function SettingsContractValidationPage(): ReactElement {
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
    const [driftExportStatus, setDriftExportStatus] = useState<string>("No drift report exported yet.")
    const [selectedDriftOverlayFileId, setSelectedDriftOverlayFileId] = useState<string | undefined>()
    const [driftAlertSeverityThreshold, setDriftAlertSeverityThreshold] =
        useState<TDriftSeverity>("high")
    const [driftAlertViolationThreshold, setDriftAlertViolationThreshold] = useState<number>(2)
    const [driftAlertChannels, setDriftAlertChannels] = useState<ReadonlyArray<TDriftAlertChannel>>(
        ["slack"],
    )
    const [driftAlertSaveStatus, setDriftAlertSaveStatus] = useState<string>(
        "No drift alert configuration saved yet.",
    )

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
                normalizedSearchQuery.length === 0
                || violation.rule.toLowerCase().includes(normalizedSearchQuery)
                || violation.rationale.toLowerCase().includes(normalizedSearchQuery)
                || violation.affectedFiles.some((file): boolean => {
                    return file.toLowerCase().includes(normalizedSearchQuery)
                })
            return matchesSeverity && matchesSearch
        })
            .slice()
            .sort((left, right): number => {
                return compareDriftViolations(left, right, driftSortMode)
            })
    }, [driftSearchQuery, driftSeverityFilter, driftSortMode])
    const driftOverlayImpactedFiles = useMemo(
        (): ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor> => {
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
        },
        [],
    )
    const driftViolationsByFileId = useMemo((): ReadonlyMap<string, ReadonlyArray<IDriftViolation>> => {
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
        const matchCount = architectureDifferences.filter((entry): boolean => entry.status === "match").length
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
    const driftTrendAnnotations = useMemo((): ReadonlyArray<IDriftTrendPoint> => {
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
                return currentChannels.filter((currentChannel): boolean => currentChannel !== channel)
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

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Contract validation</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Validate schema/version for import/export payloads and preview before apply.
            </p>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Contract payload</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Textarea
                        aria-label="Contract json"
                        minRows={10}
                        value={rawContract}
                        onValueChange={setRawContract}
                    />
                    <div className="flex gap-2">
                        <Button onPress={handleValidateContract}>Validate contract</Button>
                        <Button variant="flat" onPress={handleApplyContract}>
                            Apply validated contract
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Validation result</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {validationResult.errors.length === 0 ? (
                        <Alert color="success" title="Contract is valid" variant="flat">
                            {previewSummary}
                        </Alert>
                    ) : (
                        <Alert color="danger" title="Contract validation errors" variant="flat">
                            <ul aria-label="Contract errors list" className="space-y-1">
                                {validationResult.errors.map((error): ReactElement => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                    {validationResult.migrationHints.length === 0 ? null : (
                        <Alert color="warning" title="Migration hints" variant="flat">
                            <ul aria-label="Contract migration hints list" className="space-y-1">
                                {validationResult.migrationHints.map((hint): ReactElement => (
                                    <li key={hint}>{hint}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                    <Alert color="primary" title="Apply status" variant="flat">
                        {lastAppliedState}
                    </Alert>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Architecture blueprint editor
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-[var(--foreground)]/70">
                        Upload and edit architecture blueprint in YAML format with inline syntax
                        highlight and visual preview.
                    </p>
                    <Textarea
                        aria-label="Architecture blueprint yaml"
                        minRows={12}
                        value={blueprintYaml}
                        onValueChange={setBlueprintYaml}
                    />
                    <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                            Upload blueprint YAML
                            <input
                                aria-label="Upload blueprint yaml"
                                className="sr-only"
                                accept=".yml,.yaml,text/yaml"
                                onChange={handleUploadBlueprint}
                                type="file"
                            />
                        </label>
                        <Button onPress={handleValidateBlueprint}>Validate blueprint</Button>
                        <Button variant="flat" onPress={handleApplyBlueprint}>
                            Apply blueprint
                        </Button>
                    </div>
                    {blueprintValidationResult.errors.length === 0 ? (
                        <Alert color="success" title="Blueprint is valid" variant="flat">
                            Visual nodes: {String(blueprintValidationResult.nodes.length)}
                        </Alert>
                    ) : (
                        <Alert color="danger" title="Blueprint validation errors" variant="flat">
                            <ul aria-label="Blueprint errors list" className="space-y-1">
                                {blueprintValidationResult.errors.map((error): ReactElement => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                    <Alert color="primary" title="Blueprint apply status" variant="flat">
                        {lastBlueprintApplyState}
                    </Alert>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        YAML syntax highlight preview
                    </p>
                </CardHeader>
                <CardBody>
                    <pre
                        aria-label="Blueprint syntax highlight preview"
                        className="overflow-x-auto rounded-md border border-slate-200 bg-slate-950 p-3 text-xs leading-6"
                    >
                        {blueprintHighlightLines.map((line): ReactElement => (
                            <div key={line.id} style={{ paddingLeft: `${String(line.indent)}px` }}>
                                {line.comment === undefined ? null : (
                                    <span className="text-slate-400">{line.comment}</span>
                                )}
                                {line.key === undefined ? null : (
                                    <span className="text-sky-300">{line.key}</span>
                                )}
                                {line.key === undefined ? null : (
                                    <span className="text-slate-500">: </span>
                                )}
                                {line.value === undefined ? null : (
                                    <span className="text-emerald-300">{line.value}</span>
                                )}
                            </div>
                        ))}
                    </pre>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Blueprint visual preview
                    </p>
                </CardHeader>
                <CardBody>
                    <ul aria-label="Blueprint visual nodes list" className="space-y-1">
                        {blueprintValidationResult.nodes.map((node): ReactElement => (
                            <li
                                className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                                key={node.id}
                                style={{ marginLeft: `${String(node.depth * 12)}px` }}
                            >
                                <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                    {node.kind}
                                </span>
                                <span className="font-semibold text-slate-900">{node.label}</span>
                                {node.value === undefined ? null : (
                                    <span className="text-slate-600">{node.value}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Drift analysis report
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-[var(--foreground)]/70">
                        Review architecture drift violations with severity and affected files. Use
                        filters, sorting and export to share actionable reports.
                    </p>
                    <div className="grid gap-2 md:grid-cols-3">
                        <label className="space-y-1 text-sm text-[var(--foreground)]/80">
                            Search
                            <input
                                aria-label="Drift report search query"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                                placeholder="Rule, rationale or file"
                                type="text"
                                value={driftSearchQuery}
                                onChange={(event): void => {
                                    setDriftSearchQuery(event.currentTarget.value)
                                }}
                            />
                        </label>
                        <label className="space-y-1 text-sm text-[var(--foreground)]/80">
                            Severity filter
                            <select
                                aria-label="Drift severity filter"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                                value={driftSeverityFilter}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "all"
                                        || nextValue === "critical"
                                        || nextValue === "high"
                                        || nextValue === "medium"
                                        || nextValue === "low"
                                    ) {
                                        setDriftSeverityFilter(nextValue)
                                    }
                                }}
                            >
                                <option value="all">All severities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm text-[var(--foreground)]/80">
                            Sort
                            <select
                                aria-label="Drift report sort mode"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                                value={driftSortMode}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "severity-desc"
                                        || nextValue === "severity-asc"
                                        || nextValue === "files-desc"
                                        || nextValue === "files-asc"
                                    ) {
                                        setDriftSortMode(nextValue)
                                    }
                                }}
                            >
                                <option value="severity-desc">Severity: high to low</option>
                                <option value="severity-asc">Severity: low to high</option>
                                <option value="files-desc">Affected files: many to few</option>
                                <option value="files-asc">Affected files: few to many</option>
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button onPress={handleExportDriftReport}>Export drift report</Button>
                        <span className="text-xs text-[var(--foreground)]/70">
                            Filtered violations: {String(filteredSortedDriftViolations.length)}
                        </span>
                    </div>
                    {filteredSortedDriftViolations.length === 0 ? (
                        <Alert color="warning" title="No drift violations found" variant="flat">
                            Change filters or search query to see drift analysis data.
                        </Alert>
                    ) : (
                        <ul aria-label="Drift violations list" className="space-y-2">
                            {filteredSortedDriftViolations.map((violation): ReactElement => (
                                <li
                                    className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"
                                    key={violation.id}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-slate-900">
                                            {violation.rule}
                                        </span>
                                        <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                            {violation.severity}
                                        </span>
                                    </div>
                                    <p className="text-slate-700">{violation.rationale}</p>
                                    <p className="text-xs text-slate-600">
                                        Affected files: {violation.affectedFiles.join(", ")}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Alert color="primary" title="Drift export status" variant="flat">
                        {driftExportStatus}
                    </Alert>
                    <pre
                        aria-label="Drift report export payload"
                        className="overflow-x-auto rounded-md border border-slate-200 bg-slate-950 p-3 text-xs leading-6 text-emerald-200"
                    >
                        {driftExportPayload}
                    </pre>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Drift overlay CodeCity
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-[var(--foreground)]/70">
                        Files violating architecture blueprint are highlighted in red. Click any
                        highlighted file to inspect related drift violations.
                    </p>
                    <CodeCityTreemap
                        files={DRIFT_CODE_CITY_FILES}
                        height="360px"
                        highlightedFileId={selectedDriftOverlayFileId}
                        impactedFiles={driftOverlayImpactedFiles}
                        onFileSelect={setSelectedDriftOverlayFileId}
                        title="Architecture drift overlay treemap"
                    />
                    <div
                        aria-label="Drift overlay file shortcuts"
                        className="flex flex-wrap gap-2"
                    >
                        {DRIFT_CODE_CITY_FILES.map((file): ReactElement => (
                            <Button
                                key={file.id}
                                size="sm"
                                variant={
                                    selectedDriftOverlayFileId === file.id ? "solid" : "flat"
                                }
                                onPress={(): void => {
                                    setSelectedDriftOverlayFileId(file.id)
                                }}
                            >
                                {file.path}
                            </Button>
                        ))}
                    </div>
                    {selectedDriftOverlayFile === undefined ? (
                        <Alert color="primary" title="Drift violation details" variant="flat">
                            Select a highlighted file in the treemap to view violation details.
                        </Alert>
                    ) : (
                        <Alert color="danger" title="Drift violation details" variant="flat">
                            <p className="mb-2 text-sm">
                                File: <span className="font-semibold">{selectedDriftOverlayFile.path}</span>
                            </p>
                            {selectedDriftOverlayViolations.length === 0 ? (
                                <p className="text-sm">No mapped drift violations for selected file.</p>
                            ) : (
                                <ul aria-label="Selected drift file violations" className="space-y-1">
                                    {selectedDriftOverlayViolations.map((violation): ReactElement => (
                                        <li key={`${selectedDriftOverlayFile.id}-${violation.id}`}>
                                            <span className="font-semibold">{violation.severity}</span>:{" "}
                                            {violation.rule}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Alert>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Blueprint vs reality view
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-[var(--foreground)]/70">
                        Compare intended architecture from blueprint with actual runtime structure.
                        Differences are color-coded to highlight missing and unexpected modules.
                    </p>
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-900">
                                Intended architecture
                            </p>
                            <ul
                                aria-label="Blueprint intended architecture list"
                                className="space-y-2"
                            >
                                {BLUEPRINT_STRUCTURE_NODES.map((node): ReactElement => (
                                    <li
                                        className="rounded border border-slate-200 bg-slate-50 p-2 text-xs"
                                        key={node.id}
                                    >
                                        <p className="font-semibold text-slate-900">
                                            {node.layer} / {node.module}
                                        </p>
                                        <p className="text-slate-600">
                                            Depends on:{" "}
                                            {node.dependsOn.length === 0 ? "—" : node.dependsOn.join(", ")}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-900">
                                Runtime structure
                            </p>
                            <ul aria-label="Reality architecture list" className="space-y-2">
                                {REALITY_STRUCTURE_NODES.map((node): ReactElement => (
                                    <li
                                        className="rounded border border-slate-200 bg-slate-50 p-2 text-xs"
                                        key={node.id}
                                    >
                                        <p className="font-semibold text-slate-900">
                                            {node.layer} / {node.module}
                                        </p>
                                        <p className="text-slate-600">
                                            Depends on:{" "}
                                            {node.dependsOn.length === 0 ? "—" : node.dependsOn.join(", ")}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <Alert color="primary" title="Difference summary" variant="flat">
                        {architectureDifferenceSummary}
                    </Alert>
                    <ul aria-label="Architecture differences list" className="space-y-2">
                        {architectureDifferences.map((difference): ReactElement => (
                            <li
                                className="rounded border border-slate-200 bg-white p-2 text-xs"
                                key={difference.id}
                            >
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-slate-900">
                                        {difference.layer} / {difference.module}
                                    </span>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveArchitectureDifferenceBadgeClass(
                                            difference.status,
                                        )}`}
                                    >
                                        {difference.status}
                                    </span>
                                </div>
                                <p className="text-slate-700">{difference.description}</p>
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Drift trend chart</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-[var(--foreground)]/70">
                        Drift score trend over time with architecture change annotations.
                    </p>
                    <div aria-label="Drift score trend chart" className="h-72 w-full">
                        <ResponsiveContainer height="100%" width="100%">
                            <LineChart data={DRIFT_TREND_POINTS} margin={{ bottom: 8, left: 8, right: 12, top: 12 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Line
                                    activeDot={{ r: 6 }}
                                    dataKey="driftScore"
                                    dot={{
                                        fill: "#2563eb",
                                        r: 3,
                                        stroke: "#ffffff",
                                        strokeWidth: 1,
                                    }}
                                    stroke="#2563eb"
                                    strokeWidth={2.5}
                                    type="monotone"
                                />
                                {driftTrendAnnotations.map((point): ReactElement => (
                                    <ReferenceDot
                                        fill="#dc2626"
                                        key={`${point.period}-annotation`}
                                        r={5}
                                        stroke="#ffffff"
                                        strokeWidth={1}
                                        x={point.period}
                                        y={point.driftScore}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <Alert color="primary" title="Trend summary" variant="flat">
                        {driftTrendSummary}
                    </Alert>
                    <ul aria-label="Architecture change annotations list" className="space-y-1 text-sm">
                        {driftTrendAnnotations.map((point): ReactElement => (
                            <li key={`${point.period}-${String(point.driftScore)}`}>
                                <span className="font-semibold">{point.period}</span>:{" "}
                                {point.architectureChange}
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Drift alert configuration
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-[var(--foreground)]/70">
                        Configure drift alerts by severity threshold, violation count, and delivery
                        channels.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">
                                Severity threshold
                            </span>
                            <select
                                aria-label="Drift alert severity threshold"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                value={driftAlertSeverityThreshold}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "critical"
                                        || nextValue === "high"
                                        || nextValue === "medium"
                                        || nextValue === "low"
                                    ) {
                                        setDriftAlertSeverityThreshold(nextValue)
                                    }
                                }}
                            >
                                <option value="critical">critical</option>
                                <option value="high">high</option>
                                <option value="medium">medium</option>
                                <option value="low">low</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">
                                Violation count threshold
                            </span>
                            <input
                                aria-label="Drift alert violation threshold"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                min={0}
                                type="number"
                                value={String(driftAlertViolationThreshold)}
                                onChange={handleDriftAlertThresholdChange}
                            />
                        </label>
                    </div>
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold text-[var(--foreground)]">
                            Notification channels
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {DRIFT_ALERT_CHANNEL_OPTIONS.map((channel): ReactElement => (
                                <label
                                    className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900"
                                    key={channel.id}
                                >
                                    <input
                                        aria-label={`Drift alert channel ${channel.id}`}
                                        checked={driftAlertChannels.includes(channel.id)}
                                        type="checkbox"
                                        onChange={(): void => {
                                            handleDriftAlertChannelToggle(channel.id)
                                        }}
                                    />
                                    <span>{channel.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <Alert color={driftAlertWouldTrigger === true ? "danger" : "primary"} title="Alert trigger preview" variant="flat">
                        Violations at or above threshold: {String(driftAlertRelevantViolationCount)}.
                        {driftAlertWouldTrigger === true
                            ? " Alert will trigger with current drift data."
                            : " Alert will not trigger with current drift data."}
                    </Alert>
                    <Button onPress={handleSaveDriftAlertConfig}>Save drift alert config</Button>
                    <Alert color="primary" title="Drift alert save status" variant="flat">
                        {driftAlertSaveStatus}
                    </Alert>
                </CardBody>
            </Card>
        </section>
    )
}
