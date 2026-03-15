import type { ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

import {
    BlueprintSection,
    ContractSection,
    DriftAlertsSection,
    DriftTrendSection,
    DriftViolationsSection,
    GuardrailsSection,
} from "./sections"
import { useContractValidationState } from "./use-contract-validation-state"

/**
 * Settings page for import/export contract validation, architecture blueprint editing,
 * drift analysis, drift alerts, and architecture guardrails configuration.
 *
 * @returns The contract validation settings page element.
 */
export function SettingsContractValidationPage(): ReactElement {
    const state = useContractValidationState()

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]">
            <div className="space-y-1.5">
                <h1 className={TYPOGRAPHY.pageTitle}>Contract validation</h1>
                <p className={TYPOGRAPHY.bodyMuted}>
                    Validate schema/version for import/export payloads and preview before apply.
                </p>
            </div>
            <div className="space-y-6">
                <ContractSection state={state} />
                <BlueprintSection state={state} />
                <DriftViolationsSection state={state} />
                <DriftTrendSection state={state} />
                <DriftAlertsSection state={state} />
                <GuardrailsSection state={state} />
            </div>
        </div>
    )
}
