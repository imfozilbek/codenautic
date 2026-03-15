import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
    Alert,
    Button,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Switch,
} from "@heroui/react"
import { FormLayout } from "@/components/forms/form-layout"
import { FormSection } from "@/components/forms/form-section"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TSeverity = "high" | "low" | "medium"
type TConflictDecision = "merge" | "reload" | "retry"

interface IAdminConfigValues {
    /** Severity threshold policy. */
    readonly severityThreshold: TSeverity
    /** Ignore paths configuration. */
    readonly ignorePaths: string
    /** Toggle для обязательного reviewer approval. */
    readonly requireReviewerApproval: boolean
}

interface IAdminConfigSnapshot {
    /** ETag/version для optimistic concurrency. */
    readonly etag: number
    /** Значения админ-конфига. */
    readonly values: IAdminConfigValues
}

interface IConfigConflictState {
    /** Локальный snapshot оператора. */
    readonly local: IAdminConfigSnapshot
    /** Актуальный snapshot backend. */
    readonly remote: IAdminConfigSnapshot
}

interface IConcurrencyAuditEntry {
    /** Идентификатор события. */
    readonly id: string
    /** Решение оператора при конфликте. */
    readonly decision: TConflictDecision
    /** ETag после применения решения. */
    readonly resultingEtag: number
    /** Краткий итог. */
    readonly summary: string
    /** Время события. */
    readonly occurredAt: string
}

const DEFAULT_REMOTE_CONFIG: IAdminConfigSnapshot = {
    etag: 7,
    values: {
        ignorePaths: "dist/**,coverage/**",
        requireReviewerApproval: true,
        severityThreshold: "medium",
    },
}

function formatTimestamp(rawValue: string): string {
    const date = new Date(rawValue)
    if (Number.isNaN(date.getTime())) {
        return "—"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
    })
}

function resolveDiffRows(
    local: IAdminConfigSnapshot,
    remote: IAdminConfigSnapshot,
): ReadonlyArray<{
    readonly field: string
    readonly localValue: string
    readonly remoteValue: string
}> {
    const rows: Array<{ field: string; localValue: string; remoteValue: string }> = []

    if (local.values.severityThreshold !== remote.values.severityThreshold) {
        rows.push({
            field: "severityThreshold",
            localValue: local.values.severityThreshold,
            remoteValue: remote.values.severityThreshold,
        })
    }

    if (local.values.ignorePaths !== remote.values.ignorePaths) {
        rows.push({
            field: "ignorePaths",
            localValue: local.values.ignorePaths,
            remoteValue: remote.values.ignorePaths,
        })
    }

    if (local.values.requireReviewerApproval !== remote.values.requireReviewerApproval) {
        rows.push({
            field: "requireReviewerApproval",
            localValue: String(local.values.requireReviewerApproval),
            remoteValue: String(remote.values.requireReviewerApproval),
        })
    }

    return rows
}

/**
 * Экран optimistic concurrency resolver для admin settings.
 *
 * @returns Conflict dialog с merge/reload/retry и audit trail решений.
 */
export function SettingsConcurrencyPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const [remoteSnapshot, setRemoteSnapshot] =
        useState<IAdminConfigSnapshot>(DEFAULT_REMOTE_CONFIG)
    const [localDraft, setLocalDraft] = useState<IAdminConfigSnapshot>(DEFAULT_REMOTE_CONFIG)
    const [conflictState, setConflictState] = useState<IConfigConflictState | undefined>(undefined)
    const [audit, setAudit] = useState<ReadonlyArray<IConcurrencyAuditEntry>>([])

    const diffRows = useMemo((): ReadonlyArray<{
        readonly field: string
        readonly localValue: string
        readonly remoteValue: string
    }> => {
        if (conflictState === undefined) {
            return []
        }

        return resolveDiffRows(conflictState.local, conflictState.remote)
    }, [conflictState])

    const appendAudit = (
        decision: TConflictDecision,
        resultingEtag: number,
        summary: string,
    ): void => {
        setAudit(
            (previous): ReadonlyArray<IConcurrencyAuditEntry> => [
                {
                    decision,
                    id: `CONC-${Date.now().toString(36)}`,
                    occurredAt: new Date().toISOString(),
                    resultingEtag,
                    summary,
                },
                ...previous,
            ],
        )
    }

    const applySave = (nextSnapshot: IAdminConfigSnapshot): void => {
        setRemoteSnapshot(nextSnapshot)
        setLocalDraft(nextSnapshot)
    }

    const handleSave = (): void => {
        if (localDraft.etag !== remoteSnapshot.etag) {
            setConflictState({
                local: localDraft,
                remote: remoteSnapshot,
            })
            showToastInfo(t("settings:concurrency.toast.concurrencyConflictDetected"))
            return
        }

        const nextSnapshot: IAdminConfigSnapshot = {
            etag: remoteSnapshot.etag + 1,
            values: localDraft.values,
        }
        applySave(nextSnapshot)
        appendAudit("retry", nextSnapshot.etag, "Config saved without conflict.")
        showToastSuccess(t("settings:concurrency.toast.configSaved"))
    }

    const handleSimulateRemoteChange = (): void => {
        const nextRemoteSnapshot: IAdminConfigSnapshot = {
            etag: remoteSnapshot.etag + 1,
            values: {
                ignorePaths: "dist/**,coverage/**,generated/**",
                requireReviewerApproval: true,
                severityThreshold:
                    remoteSnapshot.values.severityThreshold === "medium" ? "high" : "medium",
            },
        }

        setRemoteSnapshot(nextRemoteSnapshot)
        showToastInfo(t("settings:concurrency.toast.externalUpdateApplied"))
    }

    const handleConflictMerge = (): void => {
        if (conflictState === undefined) {
            return
        }

        const nextSnapshot: IAdminConfigSnapshot = {
            etag: conflictState.remote.etag + 1,
            values: conflictState.local.values,
        }
        applySave(nextSnapshot)
        appendAudit("merge", nextSnapshot.etag, "Conflict merged with local priority.")
        setConflictState(undefined)
        showToastSuccess(t("settings:concurrency.toast.conflictResolvedByMerge"))
    }

    const handleConflictReload = (): void => {
        if (conflictState === undefined) {
            return
        }

        setLocalDraft(conflictState.remote)
        appendAudit(
            "reload",
            conflictState.remote.etag,
            "Local draft reloaded from remote snapshot.",
        )
        setConflictState(undefined)
        showToastInfo(t("settings:concurrency.toast.localDraftReplacedWithRemote"))
    }

    const handleConflictRetry = (): void => {
        if (conflictState === undefined) {
            return
        }

        const nextDraft: IAdminConfigSnapshot = {
            ...conflictState.local,
            etag: conflictState.remote.etag,
        }
        setLocalDraft(nextDraft)
        appendAudit(
            "retry",
            conflictState.remote.etag,
            "Local draft aligned to latest etag for retry.",
        )
        setConflictState(undefined)
        showToastInfo(t("settings:concurrency.toast.draftAlignedToLatestEtag"))
    }

    return (
        <FormLayout
            title={t("settings:concurrency.pageTitle")}
            description={t("settings:concurrency.pageSubtitle")}
        >
            <FormSection heading={t("settings:concurrency.snapshotVersions")}>
                <div className="flex flex-wrap gap-2">
                    <Chip size="sm" variant="soft">
                        {t("settings:concurrency.localEtag", { etag: localDraft.etag })}
                    </Chip>
                    <Chip size="sm" variant="soft">
                        {t("settings:concurrency.remoteEtag", { etag: remoteSnapshot.etag })}
                    </Chip>
                </div>
                <Input
                    aria-label={t("settings:concurrency.ignorePaths")}
                    value={localDraft.values.ignorePaths}
                    onChange={(e): void => {
                        setLocalDraft(
                            (previous): IAdminConfigSnapshot => ({
                                ...previous,
                                values: {
                                    ...previous.values,
                                    ignorePaths: e.target.value,
                                },
                            }),
                        )
                    }}
                />
                <select
                    aria-label={t("settings:ariaLabel.concurrency.severityThreshold")}
                    className={NATIVE_FORM.select}
                    id="concurrency-severity"
                    value={localDraft.values.severityThreshold}
                    onChange={(event): void => {
                        const nextValue = event.currentTarget.value
                        if (nextValue === "low" || nextValue === "medium" || nextValue === "high") {
                            setLocalDraft(
                                (previous): IAdminConfigSnapshot => ({
                                    ...previous,
                                    values: {
                                        ...previous.values,
                                        severityThreshold: nextValue,
                                    },
                                }),
                            )
                        }
                    }}
                >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                </select>
                <Switch
                    aria-label={t("settings:ariaLabel.concurrency.requireReviewerApproval")}
                    isSelected={localDraft.values.requireReviewerApproval}
                    onChange={(isSelected: boolean): void => {
                        setLocalDraft(
                            (previous): IAdminConfigSnapshot => ({
                                ...previous,
                                values: {
                                    ...previous.values,
                                    requireReviewerApproval: isSelected,
                                },
                            }),
                        )
                    }}
                >
                    {t("settings:concurrency.requireReviewerApproval")}
                </Switch>
                <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onPress={handleSave}>
                        {t("settings:concurrency.saveSettingsOptimistic")}
                    </Button>
                    <Button variant="secondary" onPress={handleSimulateRemoteChange}>
                        {t("settings:concurrency.simulateExternalUpdate")}
                    </Button>
                </div>
            </FormSection>

            <FormSection heading={t("settings:concurrency.conflictResolutionAudit")}>
                {audit.length === 0 ? (
                    <Alert status="warning">
                        <Alert.Title>
                            {t("settings:concurrency.noConcurrencyDecisionsTitle")}
                        </Alert.Title>
                        <Alert.Description>
                            {t("settings:concurrency.noConcurrencyDecisionsDescription")}
                        </Alert.Description>
                    </Alert>
                ) : (
                    <ul
                        aria-label={t("settings:ariaLabel.concurrency.auditList")}
                        className="space-y-2"
                    >
                        {audit.map(
                            (entry): ReactElement => (
                                <li
                                    className="rounded-lg border border-border bg-surface p-3 text-sm"
                                    key={entry.id}
                                >
                                    <p className="font-semibold text-foreground">
                                        {entry.decision} · etag {entry.resultingEtag}
                                    </p>
                                    <p className="text-muted">{entry.summary}</p>
                                    <p className="text-xs text-muted">
                                        {formatTimestamp(entry.occurredAt)}
                                    </p>
                                </li>
                            ),
                        )}
                    </ul>
                )}
            </FormSection>

            <Modal
                isOpen={conflictState !== undefined}
                onOpenChange={(isOpen): void => {
                    if (isOpen === false) {
                        setConflictState(undefined)
                    }
                }}
            >
                <Modal.Container>
                    <Modal.Dialog>
                        <ModalHeader>
                            {t("settings:concurrency.configConflictDetected")}
                        </ModalHeader>
                        <ModalBody>
                            <p className="text-sm text-muted">
                                {t("settings:concurrency.conflictDescription")}
                            </p>
                            <ul
                                aria-label={t("settings:ariaLabel.concurrency.conflictDiffList")}
                                className="space-y-2"
                            >
                                {diffRows.map(
                                    (row): ReactElement => (
                                        <li
                                            className="rounded-md border border-border bg-surface p-2 text-xs"
                                            key={row.field}
                                        >
                                            <p className="font-semibold text-foreground">
                                                {row.field}
                                            </p>
                                            <p>
                                                {t("settings:concurrency.local", {
                                                    value: row.localValue,
                                                })}
                                            </p>
                                            <p>
                                                {t("settings:concurrency.remote", {
                                                    value: row.remoteValue,
                                                })}
                                            </p>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="secondary" onPress={handleConflictReload}>
                                {t("settings:concurrency.reloadRemote")}
                            </Button>
                            <Button variant="secondary" onPress={handleConflictRetry}>
                                {t("settings:concurrency.retryWithLatestEtag")}
                            </Button>
                            <Button variant="primary" onPress={handleConflictMerge}>
                                {t("settings:concurrency.mergeAndSave")}
                            </Button>
                        </ModalFooter>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal>
        </FormLayout>
    )
}
