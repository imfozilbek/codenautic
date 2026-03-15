import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, TextArea } from "@heroui/react"
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
    const { t } = useTranslation(["settings"])
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Architecture guardrails</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted">
                    Configure allowed and forbidden import rules with YAML and visual rule preview.
                </p>
                <TextArea
                    aria-label={t("settings:ariaLabel.contractValidation.guardrailsYaml")}
                    className="min-h-[250px]"
                    value={state.guardrailsYaml}
                    onChange={(e): void => {
                        state.setGuardrailsYaml(e.target.value)
                    }}
                />
                <div className="flex gap-2">
                    <Button variant="primary" onPress={state.handleValidateGuardrails}>
                        Validate guardrails
                    </Button>
                    <Button variant="secondary" onPress={state.handleApplyGuardrails}>
                        Apply guardrails
                    </Button>
                </div>
                {state.guardrailsValidationResult.errors.length === 0 ? (
                    <Alert status="success">
                        <Alert.Title>Guardrails are valid</Alert.Title>
                        <Alert.Description>{`Parsed ${String(state.guardrailsValidationResult.rules.length)} guardrail rules.`}</Alert.Description>
                    </Alert>
                ) : (
                    <Alert status="danger">
                        <Alert.Title>Guardrails validation errors</Alert.Title>
                        <Alert.Description>
                            <ul
                                aria-label={t(
                                    "settings:ariaLabel.contractValidation.guardrailsErrorsList",
                                )}
                                className="space-y-1"
                            >
                                {state.guardrailsValidationResult.errors.map(
                                    (error): ReactElement => (
                                        <li key={error}>{error}</li>
                                    ),
                                )}
                            </ul>
                        </Alert.Description>
                    </Alert>
                )}
                <ul
                    aria-label={t("settings:ariaLabel.contractValidation.guardrailVisualRulesList")}
                    className="space-y-2"
                >
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
                <Alert status="accent">
                    <Alert.Title>Guardrails apply status</Alert.Title>
                    <Alert.Description>{state.guardrailsApplyStatus}</Alert.Description>
                </Alert>
            </CardContent>
        </Card>
    )
}
