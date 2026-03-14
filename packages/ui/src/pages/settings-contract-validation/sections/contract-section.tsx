import type { ReactElement } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import type { IContractValidationState } from "../use-contract-validation-state"

/**
 * Props for the contract payload section.
 */
export interface IContractSectionProps {
    /**
     * Shared contract validation page state.
     */
    readonly state: IContractValidationState
}

/**
 * Contract payload section: textarea for raw JSON contract input,
 * validate/apply buttons, validation result display with errors,
 * migration hints and apply status.
 *
 * @param props Component props.
 * @returns The contract section element.
 */
export function ContractSection({ state }: IContractSectionProps): ReactElement {
    return (
        <>
            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Contract payload</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Textarea
                        aria-label="Contract json"
                        minRows={10}
                        value={state.rawContract}
                        onValueChange={state.setRawContract}
                    />
                    <div className="flex gap-2">
                        <Button color="primary" onPress={state.handleValidateContract}>
                            Validate contract
                        </Button>
                        <Button variant="flat" onPress={state.handleApplyContract}>
                            Apply validated contract
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Validation result</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {state.validationResult.errors.length === 0 ? (
                        <Alert color="success" title="Contract is valid" variant="flat">
                            {state.previewSummary}
                        </Alert>
                    ) : (
                        <Alert color="danger" title="Contract validation errors" variant="flat">
                            <ul aria-label="Contract errors list" className="space-y-1">
                                {state.validationResult.errors.map(
                                    (error): ReactElement => (
                                        <li key={error}>{error}</li>
                                    ),
                                )}
                            </ul>
                        </Alert>
                    )}
                    {state.validationResult.migrationHints.length === 0 ? null : (
                        <Alert color="warning" title="Migration hints" variant="flat">
                            <ul aria-label="Contract migration hints list" className="space-y-1">
                                {state.validationResult.migrationHints.map(
                                    (hint): ReactElement => (
                                        <li key={hint}>{hint}</li>
                                    ),
                                )}
                            </ul>
                        </Alert>
                    )}
                    <Alert color="primary" title="Apply status" variant="flat">
                        {state.lastAppliedState}
                    </Alert>
                </CardBody>
            </Card>
        </>
    )
}
