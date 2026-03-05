import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"

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
        </section>
    )
}
