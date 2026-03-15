import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { CodeCityTreemap } from "@/components/codecity/codecity-treemap"
import { Alert, Button, Card, CardContent, CardHeader } from "@heroui/react"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import { DRIFT_CODE_CITY_FILES } from "../contract-validation-constants"
import type { IContractValidationState } from "../use-contract-validation-state"

/**
 * Props for the drift violations section.
 */
export interface IDriftViolationsSectionProps {
    /**
     * Shared contract validation page state.
     */
    readonly state: IContractValidationState
}

/**
 * Drift violations section: search, severity filter, sort mode, violations list,
 * export button with payload preview, CodeCity treemap overlay with file shortcuts
 * and selected file violation details.
 *
 * @param props Component props.
 * @returns The drift violations section element.
 */
export function DriftViolationsSection({ state }: IDriftViolationsSectionProps): ReactElement {
    const { t } = useTranslation(["settings"])
    return (
        <>
            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Drift analysis report</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted">
                        Review architecture drift violations with severity and affected files. Use
                        filters, sorting and export to share actionable reports.
                    </p>
                    <div className="grid gap-2 md:grid-cols-3">
                        <label className="space-y-1 text-sm text-muted">
                            Search
                            <input
                                aria-label={t(
                                    "settings:ariaLabel.contractValidation.driftReportSearchQuery",
                                )}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                                placeholder="Rule, rationale or file"
                                type="text"
                                value={state.driftSearchQuery}
                                onChange={(event): void => {
                                    state.setDriftSearchQuery(event.currentTarget.value)
                                }}
                            />
                        </label>
                        <label className="space-y-1 text-sm text-muted">
                            Severity filter
                            <select
                                aria-label={t(
                                    "settings:ariaLabel.contractValidation.driftSeverityFilter",
                                )}
                                className={NATIVE_FORM.select}
                                value={state.driftSeverityFilter}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "all" ||
                                        nextValue === "critical" ||
                                        nextValue === "high" ||
                                        nextValue === "medium" ||
                                        nextValue === "low"
                                    ) {
                                        state.setDriftSeverityFilter(nextValue)
                                    }
                                }}
                            >
                                <option value="all">
                                    {t("settings:contractValidation.drift.allSeverities")}
                                </option>
                                <option value="critical">
                                    {t("settings:contractValidation.drift.critical")}
                                </option>
                                <option value="high">
                                    {t("settings:contractValidation.drift.high")}
                                </option>
                                <option value="medium">
                                    {t("settings:contractValidation.drift.medium")}
                                </option>
                                <option value="low">
                                    {t("settings:contractValidation.drift.low")}
                                </option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm text-muted">
                            Sort
                            <select
                                aria-label={t(
                                    "settings:ariaLabel.contractValidation.driftReportSortMode",
                                )}
                                className={NATIVE_FORM.select}
                                value={state.driftSortMode}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "severity-desc" ||
                                        nextValue === "severity-asc" ||
                                        nextValue === "files-desc" ||
                                        nextValue === "files-asc"
                                    ) {
                                        state.setDriftSortMode(nextValue)
                                    }
                                }}
                            >
                                <option value="severity-desc">
                                    {t("settings:contractValidation.drift.severityDesc")}
                                </option>
                                <option value="severity-asc">
                                    {t("settings:contractValidation.drift.severityAsc")}
                                </option>
                                <option value="files-desc">
                                    {t("settings:contractValidation.drift.filesDesc")}
                                </option>
                                <option value="files-asc">
                                    {t("settings:contractValidation.drift.filesAsc")}
                                </option>
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="primary" onPress={state.handleExportDriftReport}>
                            Export drift report
                        </Button>
                        <span className="text-xs text-muted">
                            Filtered violations:{" "}
                            {String(state.filteredSortedDriftViolations.length)}
                        </span>
                    </div>
                    {state.filteredSortedDriftViolations.length === 0 ? (
                        <Alert status="warning">
                            <Alert.Title>No drift violations found</Alert.Title>
                            <Alert.Description>
                                Change filters or search query to see drift analysis data.
                            </Alert.Description>
                        </Alert>
                    ) : (
                        <ul
                            aria-label={t(
                                "settings:ariaLabel.contractValidation.driftViolationsList",
                            )}
                            className="space-y-2"
                        >
                            {state.filteredSortedDriftViolations.map(
                                (violation): ReactElement => (
                                    <li
                                        className="space-y-1 rounded-md border border-border bg-surface p-3 text-sm"
                                        key={violation.id}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-foreground">
                                                {violation.rule}
                                            </span>
                                            <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                                                {violation.severity}
                                            </span>
                                        </div>
                                        <p className="text-foreground">{violation.rationale}</p>
                                        <p className="text-xs text-muted">
                                            Affected files: {violation.affectedFiles.join(", ")}
                                        </p>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                    <Alert status="accent">
                        <Alert.Title>Drift export status</Alert.Title>
                        <Alert.Description>{state.driftExportStatus}</Alert.Description>
                    </Alert>
                    <pre
                        aria-label={t(
                            "settings:ariaLabel.contractValidation.driftReportExportPayload",
                        )}
                        className="overflow-x-auto rounded-md border border-border bg-code-surface p-3 text-xs leading-6 text-emerald-200"
                    >
                        {state.driftExportPayload}
                    </pre>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Drift overlay CodeCity</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted">
                        Files violating architecture blueprint are highlighted in red. Click any
                        highlighted file to inspect related drift violations.
                    </p>
                    <CodeCityTreemap
                        files={DRIFT_CODE_CITY_FILES}
                        height="360px"
                        highlightedFileId={state.selectedDriftOverlayFileId}
                        impactedFiles={state.driftOverlayImpactedFiles}
                        onFileSelect={state.setSelectedDriftOverlayFileId}
                        title="Architecture drift overlay treemap"
                    />
                    <div
                        aria-label={t(
                            "settings:ariaLabel.contractValidation.driftOverlayFileShortcuts",
                        )}
                        className="flex flex-wrap gap-2"
                    >
                        {DRIFT_CODE_CITY_FILES.map(
                            (file): ReactElement => (
                                <Button
                                    key={file.id}
                                    size="sm"
                                    variant={
                                        state.selectedDriftOverlayFileId === file.id
                                            ? "primary"
                                            : "secondary"
                                    }
                                    onPress={(): void => {
                                        state.setSelectedDriftOverlayFileId(file.id)
                                    }}
                                >
                                    {file.path}
                                </Button>
                            ),
                        )}
                    </div>
                    {state.selectedDriftOverlayFile === undefined ? (
                        <Alert status="accent">
                            <Alert.Title>Drift violation details</Alert.Title>
                            <Alert.Description>
                                Select a highlighted file in the treemap to view violation details.
                            </Alert.Description>
                        </Alert>
                    ) : (
                        <Alert status="danger">
                            <Alert.Title>Drift violation details</Alert.Title>
                            <Alert.Description>
                                <p className="mb-2 text-sm">
                                    File:{" "}
                                    <span className="font-semibold">
                                        {state.selectedDriftOverlayFile.path}
                                    </span>
                                </p>
                                {state.selectedDriftOverlayViolations.length === 0 ? (
                                    <p className="text-sm">
                                        No mapped drift violations for selected file.
                                    </p>
                                ) : (
                                    <ul
                                        aria-label={t(
                                            "settings:ariaLabel.contractValidation.selectedDriftFileViolations",
                                        )}
                                        className="space-y-1"
                                    >
                                        {state.selectedDriftOverlayViolations.map(
                                            (violation): ReactElement => (
                                                <li
                                                    key={`${state.selectedDriftOverlayFile?.id ?? "unknown"}-${violation.id}`}
                                                >
                                                    <span className="font-semibold">
                                                        {violation.severity}
                                                    </span>
                                                    : {violation.rule}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </Alert.Description>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
