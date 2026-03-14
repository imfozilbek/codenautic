import type { ReactElement } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import type { IContractValidationState } from "../use-contract-validation-state"

/**
 * Props for the architecture guardrails section.
 */
export interface IGuardrailsSectionProps {
    /**
     * Shared contract validation page state.
     */
    readonly state: IContractValidationState
}

/**
 * Architecture guardrails section: YAML editor for allowed/forbidden import rules,
 * validate/apply buttons, validation result, visual rule list and apply status.
 *
 * @param props Component props.
 * @returns The guardrails section element.
 */
export function GuardrailsSection({ state }: IGuardrailsSectionProps): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Architecture guardrails</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p className="text-sm text-text-secondary">
                    Configure allowed and forbidden import rules with YAML and visual rule preview.
                </p>
                <Textarea
                    aria-label="Architecture guardrails yaml"
                    minRows={10}
                    value={state.guardrailsYaml}
                    onValueChange={state.setGuardrailsYaml}
                />
                <div className="flex gap-2">
                    <Button color="primary" onPress={state.handleValidateGuardrails}>
                        Validate guardrails
                    </Button>
                    <Button variant="flat" onPress={state.handleApplyGuardrails}>
                        Apply guardrails
                    </Button>
                </div>
                {state.guardrailsValidationResult.errors.length === 0 ? (
                    <Alert color="success" title="Guardrails are valid" variant="flat">
                        {`Parsed ${String(state.guardrailsValidationResult.rules.length)} guardrail rules.`}
                    </Alert>
                ) : (
                    <Alert color="danger" title="Guardrails validation errors" variant="flat">
                        <ul aria-label="Guardrails errors list" className="space-y-1">
                            {state.guardrailsValidationResult.errors.map(
                                (error): ReactElement => (
                                    <li key={error}>{error}</li>
                                ),
                            )}
                        </ul>
                    </Alert>
                )}
                <ul aria-label="Guardrail visual rules list" className="space-y-2">
                    {state.guardrailsValidationResult.rules.map(
                        (rule): ReactElement => (
                            <li
                                className="rounded border border-border bg-surface p-2 text-xs"
                                key={rule.id}
                            >
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-foreground">
                                        {rule.source} &rarr; {rule.target}
                                    </span>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                            rule.mode === "allow"
                                                ? "border-success/40 bg-success/10 text-success"
                                                : "border-danger/40 bg-danger/10 text-danger"
                                        }`}
                                    >
                                        {rule.mode}
                                    </span>
                                </div>
                                <p className="text-foreground">
                                    {rule.mode === "allow"
                                        ? "Import direction is explicitly allowed."
                                        : "Import direction is explicitly forbidden."}
                                </p>
                            </li>
                        ),
                    )}
                </ul>
                <Alert color="primary" title="Guardrails apply status" variant="flat">
                    {state.guardrailsApplyStatus}
                </Alert>
            </CardBody>
        </Card>
    )
}
