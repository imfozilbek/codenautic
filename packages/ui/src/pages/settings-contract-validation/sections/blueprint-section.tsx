import type { ReactElement } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import type { IContractValidationState } from "../use-contract-validation-state"

/**
 * Props for the architecture blueprint section.
 */
export interface IBlueprintSectionProps {
    /**
     * Shared contract validation page state.
     */
    readonly state: IContractValidationState
}

/**
 * Architecture blueprint section: YAML editor with upload, validate/apply,
 * syntax highlight preview and visual node tree preview.
 *
 * @param props Component props.
 * @returns The blueprint section element.
 */
export function BlueprintSection({ state }: IBlueprintSectionProps): ReactElement {
    return (
        <>
            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Architecture blueprint editor</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-text-secondary">
                        Upload and edit architecture blueprint in YAML format with inline syntax
                        highlight and visual preview.
                    </p>
                    <Textarea
                        aria-label="Architecture blueprint yaml"
                        minRows={12}
                        value={state.blueprintYaml}
                        onValueChange={state.setBlueprintYaml}
                    />
                    <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground">
                            Upload blueprint YAML
                            <input
                                aria-label="Upload blueprint yaml"
                                className="sr-only"
                                accept=".yml,.yaml,text/yaml"
                                onChange={state.handleUploadBlueprint}
                                type="file"
                            />
                        </label>
                        <Button color="primary" onPress={state.handleValidateBlueprint}>
                            Validate blueprint
                        </Button>
                        <Button variant="flat" onPress={state.handleApplyBlueprint}>
                            Apply blueprint
                        </Button>
                    </div>
                    {state.blueprintValidationResult.errors.length === 0 ? (
                        <Alert color="success" title="Blueprint is valid" variant="flat">
                            Visual nodes: {String(state.blueprintValidationResult.nodes.length)}
                        </Alert>
                    ) : (
                        <Alert color="danger" title="Blueprint validation errors" variant="flat">
                            <ul aria-label="Blueprint errors list" className="space-y-1">
                                {state.blueprintValidationResult.errors.map(
                                    (error): ReactElement => (
                                        <li key={error}>{error}</li>
                                    ),
                                )}
                            </ul>
                        </Alert>
                    )}
                    <Alert color="primary" title="Blueprint apply status" variant="flat">
                        {state.lastBlueprintApplyState}
                    </Alert>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>YAML syntax highlight preview</p>
                </CardHeader>
                <CardBody>
                    <pre
                        aria-label="Blueprint syntax highlight preview"
                        className="overflow-x-auto rounded-md border border-border bg-code-surface p-3 text-xs leading-6"
                    >
                        {state.blueprintHighlightLines.map(
                            (line): ReactElement => (
                                <div
                                    key={line.id}
                                    style={{
                                        paddingLeft: `${String(line.indent)}px`,
                                    }}
                                >
                                    {line.comment === undefined ? null : (
                                        <span className="text-muted-foreground">
                                            {line.comment}
                                        </span>
                                    )}
                                    {line.key === undefined ? null : (
                                        <span className="text-sky-300">{line.key}</span>
                                    )}
                                    {line.key === undefined ? null : (
                                        <span className="text-muted-foreground">: </span>
                                    )}
                                    {line.value === undefined ? null : (
                                        <span className="text-emerald-300">{line.value}</span>
                                    )}
                                </div>
                            ),
                        )}
                    </pre>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Blueprint visual preview</p>
                </CardHeader>
                <CardBody>
                    <ul aria-label="Blueprint visual nodes list" className="space-y-1">
                        {state.blueprintValidationResult.nodes.map(
                            (node): ReactElement => (
                                <li
                                    className="flex items-center gap-2 rounded border border-border bg-surface px-2 py-1 text-xs"
                                    key={node.id}
                                    style={{
                                        marginLeft: `${String(node.depth * 12)}px`,
                                    }}
                                >
                                    <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                                        {node.kind}
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {node.label}
                                    </span>
                                    {node.value === undefined ? null : (
                                        <span className="text-muted-foreground">{node.value}</span>
                                    )}
                                </li>
                            ),
                        )}
                    </ul>
                </CardBody>
            </Card>
        </>
    )
}
