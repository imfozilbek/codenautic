import type { ReactElement } from "react"

import { CodeCityTreemap } from "@/components/graphs/codecity-treemap"
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import { DRIFT_CODE_CITY_FILES } from "../contract-validation-mock-data"
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
    return (
        <>
            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Drift analysis report</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-text-secondary">
                        Review architecture drift violations with severity and affected files. Use
                        filters, sorting and export to share actionable reports.
                    </p>
                    <div className="grid gap-2 md:grid-cols-3">
                        <label className="space-y-1 text-sm text-text-tertiary">
                            Search
                            <input
                                aria-label="Drift report search query"
                                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                                placeholder="Rule, rationale or file"
                                type="text"
                                value={state.driftSearchQuery}
                                onChange={(event): void => {
                                    state.setDriftSearchQuery(event.currentTarget.value)
                                }}
                            />
                        </label>
                        <label className="space-y-1 text-sm text-text-tertiary">
                            Severity filter
                            <select
                                aria-label="Drift severity filter"
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
                                <option value="all">All severities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm text-text-tertiary">
                            Sort
                            <select
                                aria-label="Drift report sort mode"
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
                                <option value="severity-desc">Severity: high to low</option>
                                <option value="severity-asc">Severity: low to high</option>
                                <option value="files-desc">Affected files: many to few</option>
                                <option value="files-asc">Affected files: few to many</option>
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button color="primary" onPress={state.handleExportDriftReport}>
                            Export drift report
                        </Button>
                        <span className="text-xs text-text-secondary">
                            Filtered violations:{" "}
                            {String(state.filteredSortedDriftViolations.length)}
                        </span>
                    </div>
                    {state.filteredSortedDriftViolations.length === 0 ? (
                        <Alert color="warning" title="No drift violations found" variant="flat">
                            Change filters or search query to see drift analysis data.
                        </Alert>
                    ) : (
                        <ul aria-label="Drift violations list" className="space-y-2">
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
                                        <p className="text-xs text-muted-foreground">
                                            Affected files: {violation.affectedFiles.join(", ")}
                                        </p>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                    <Alert color="primary" title="Drift export status" variant="flat">
                        {state.driftExportStatus}
                    </Alert>
                    <pre
                        aria-label="Drift report export payload"
                        className="overflow-x-auto rounded-md border border-border bg-code-surface p-3 text-xs leading-6 text-emerald-200"
                    >
                        {state.driftExportPayload}
                    </pre>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Drift overlay CodeCity</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-text-secondary">
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
                    <div aria-label="Drift overlay file shortcuts" className="flex flex-wrap gap-2">
                        {DRIFT_CODE_CITY_FILES.map(
                            (file): ReactElement => (
                                <Button
                                    color="primary"
                                    key={file.id}
                                    size="sm"
                                    variant={
                                        state.selectedDriftOverlayFileId === file.id
                                            ? "solid"
                                            : "flat"
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
                        <Alert color="primary" title="Drift violation details" variant="flat">
                            Select a highlighted file in the treemap to view violation details.
                        </Alert>
                    ) : (
                        <Alert color="danger" title="Drift violation details" variant="flat">
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
                                    aria-label="Selected drift file violations"
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
                        </Alert>
                    )}
                </CardBody>
            </Card>
        </>
    )
}
