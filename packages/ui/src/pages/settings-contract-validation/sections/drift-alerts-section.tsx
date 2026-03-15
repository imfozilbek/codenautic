import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader } from "@heroui/react"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import { DRIFT_ALERT_CHANNEL_OPTIONS } from "../contract-validation-constants"
import type { IContractValidationState } from "../use-contract-validation-state"

/**
 * Props for the drift alerts section.
 */
export interface IDriftAlertsSectionProps {
    /**
     * Shared contract validation page state.
     */
    readonly state: IContractValidationState
}

/**
 * Drift alert configuration section: severity threshold, violation count threshold,
 * notification channel checkboxes, alert trigger preview and save button.
 *
 * @param props Component props.
 * @returns The drift alerts section element.
 */
export function DriftAlertsSection({ state }: IDriftAlertsSectionProps): ReactElement {
    const { t } = useTranslation(["settings"])
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Drift alert configuration</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted">
                    Configure drift alerts by severity threshold, violation count, and delivery
                    channels.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                        <span className="font-semibold text-foreground">Severity threshold</span>
                        <select
                            aria-label={t(
                                "settings:ariaLabel.contractValidation.driftAlertSeverityThreshold",
                            )}
                            className={NATIVE_FORM.select}
                            value={state.driftAlertSeverityThreshold}
                            onChange={(event): void => {
                                const nextValue = event.currentTarget.value
                                if (
                                    nextValue === "critical" ||
                                    nextValue === "high" ||
                                    nextValue === "medium" ||
                                    nextValue === "low"
                                ) {
                                    state.setDriftAlertSeverityThreshold(nextValue)
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
                        <span className="font-semibold text-foreground">
                            Violation count threshold
                        </span>
                        <input
                            aria-label={t(
                                "settings:ariaLabel.contractValidation.driftAlertViolationThreshold",
                            )}
                            className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
                            min={0}
                            type="number"
                            value={String(state.driftAlertViolationThreshold)}
                            onChange={state.handleDriftAlertThresholdChange}
                        />
                    </label>
                </div>
                <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">
                        Notification channels
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {DRIFT_ALERT_CHANNEL_OPTIONS.map(
                            (channel): ReactElement => (
                                <label
                                    className="flex items-center gap-2 rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
                                    key={channel.id}
                                >
                                    <input
                                        aria-label={`Drift alert channel ${channel.id}`}
                                        checked={state.driftAlertChannels.includes(channel.id)}
                                        type="checkbox"
                                        onChange={(): void => {
                                            state.handleDriftAlertChannelToggle(channel.id)
                                        }}
                                    />
                                    <span>{channel.label}</span>
                                </label>
                            ),
                        )}
                    </div>
                </fieldset>
                <Alert status={state.driftAlertWouldTrigger === true ? "danger" : "accent"}>
                    <Alert.Title>Alert trigger preview</Alert.Title>
                    <Alert.Description>
                        Violations at or above threshold:{" "}
                        {String(state.driftAlertRelevantViolationCount)}.
                        {state.driftAlertWouldTrigger === true
                            ? " Alert will trigger with current drift data."
                            : " Alert will not trigger with current drift data."}
                    </Alert.Description>
                </Alert>
                <Button variant="primary" onPress={state.handleSaveDriftAlertConfig}>
                    Save drift alert config
                </Button>
                <Alert status="accent">
                    <Alert.Title>Drift alert save status</Alert.Title>
                    <Alert.Description>{state.driftAlertSaveStatus}</Alert.Description>
                </Alert>
            </CardContent>
        </Card>
    )
}
