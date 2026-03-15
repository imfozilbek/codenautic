import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, TextArea } from "@heroui/react"
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
    const { t } = useTranslation(["settings"])
    return (
        <>
            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Architecture blueprint editor</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted">
                        Upload and edit architecture blueprint in YAML format with inline syntax
                        highlight and visual preview.
                    </p>
                    <TextArea
                        aria-label={t("settings:ariaLabel.contractValidation.blueprintYaml")}
                        className="min-h-[300px]"
                        value={state.blueprintYaml}
                        onChange={(e): void => {
                            state.setBlueprintYaml(e.target.value)
                        }}
                    />
                    <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground">
                            Upload blueprint YAML
                            <input
                                aria-label={t(
                                    "settings:ariaLabel.contractValidation.uploadBlueprintYaml",
                                )}
                                className="sr-only"
                                accept=".yml,.yaml,text/yaml"
                                onChange={state.handleUploadBlueprint}
                                type="file"
                            />
                        </label>
                        <Button variant="primary" onPress={state.handleValidateBlueprint}>
                            Validate blueprint
                        </Button>
                        <Button variant="secondary" onPress={state.handleApplyBlueprint}>
                            Apply blueprint
                        </Button>
                    </div>
                    {state.blueprintValidationResult.errors.length === 0 ? (
                        <Alert status="success">
                            <Alert.Title>Blueprint is valid</Alert.Title>
                            <Alert.Description>
                                Visual nodes: {String(state.blueprintValidationResult.nodes.length)}
                            </Alert.Description>
                        </Alert>
                    ) : (
                        <Alert status="danger">
                            <Alert.Title>Blueprint validation errors</Alert.Title>
                            <Alert.Description>
                                <ul
                                    aria-label={t(
                                        "settings:ariaLabel.contractValidation.blueprintErrorsList",
                                    )}
                                    className="space-y-1"
                                >
                                    {state.blueprintValidationResult.errors.map(
                                        (error): ReactElement => (
                                            <li key={error}>{error}</li>
                                        ),
                                    )}
                                </ul>
                            </Alert.Description>
                        </Alert>
                    )}
                    <Alert status="accent">
                        <Alert.Title>Blueprint apply status</Alert.Title>
                        <Alert.Description>{state.lastBlueprintApplyState}</Alert.Description>
                    </Alert>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>YAML syntax highlight preview</p>
                </CardHeader>
                <CardContent>
                    <pre
                        aria-label={t(
                            "settings:ariaLabel.contractValidation.blueprintSyntaxHighlightPreview",
                        )}
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
                                        <span className="text-muted">
                                            {line.comment}
                                        </span>
                                    )}
                                    {line.key === undefined ? null : (
                                        <span className="text-sky-300">{line.key}</span>
                                    )}
                                    {line.key === undefined ? null : (
                                        <span className="text-muted">: </span>
                                    )}
                                    {line.value === undefined ? null : (
                                        <span className="text-emerald-300">{line.value}</span>
                                    )}
                                </div>
                            ),
                        )}
                    </pre>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Blueprint visual preview</p>
                </CardHeader>
                <CardContent>
                    <ul
                        aria-label={t(
                            "settings:ariaLabel.contractValidation.blueprintVisualNodesList",
                        )}
                        className="space-y-1"
                    >
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
                                        <span className="text-muted">{node.value}</span>
                                    )}
                                </li>
                            ),
                        )}
                    </ul>
                </CardContent>
            </Card>
        </>
    )
}
