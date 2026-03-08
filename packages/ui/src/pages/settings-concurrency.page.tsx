import { type ReactElement, useMemo, useState } from "react"

import {
    Alert,
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Switch,
} from "@/components/ui"
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
            showToastInfo("Concurrency conflict detected.")
            return
        }

        const nextSnapshot: IAdminConfigSnapshot = {
            etag: remoteSnapshot.etag + 1,
            values: localDraft.values,
        }
        applySave(nextSnapshot)
        appendAudit("retry", nextSnapshot.etag, "Config saved without conflict.")
        showToastSuccess("Config saved.")
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
        showToastInfo("External update applied on server snapshot.")
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
        showToastSuccess("Conflict resolved by merge.")
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
        showToastInfo("Local draft replaced with remote data.")
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
        showToastInfo("Draft aligned to latest etag. Retry save is now available.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Concurrent config resolver</h1>
            <p className="text-sm text-text-secondary">
                Optimistic concurrency flow for admin settings with explicit conflict outcomes.
            </p>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-foreground">Snapshot versions</p>
                    <div className="flex gap-2">
                        <Chip size="sm" variant="flat">
                            Local etag: {localDraft.etag}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            Remote etag: {remoteSnapshot.etag}
                        </Chip>
                    </div>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Input
                        label="Ignore paths"
                        value={localDraft.values.ignorePaths}
                        onValueChange={(value): void => {
                            setLocalDraft(
                                (previous): IAdminConfigSnapshot => ({
                                    ...previous,
                                    values: {
                                        ...previous.values,
                                        ignorePaths: value,
                                    },
                                }),
                            )
                        }}
                    />
                    <div className="space-y-1">
                        <label
                            className="text-sm text-text-tertiary"
                            htmlFor="concurrency-severity"
                        >
                            Severity threshold
                        </label>
                        <select
                            aria-label="Concurrency severity threshold"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            id="concurrency-severity"
                            value={localDraft.values.severityThreshold}
                            onChange={(event): void => {
                                const nextValue = event.currentTarget.value
                                if (
                                    nextValue === "low" ||
                                    nextValue === "medium" ||
                                    nextValue === "high"
                                ) {
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
                    </div>
                    <Switch
                        aria-label="Require reviewer approval"
                        isSelected={localDraft.values.requireReviewerApproval}
                        onValueChange={(value): void => {
                            setLocalDraft(
                                (previous): IAdminConfigSnapshot => ({
                                    ...previous,
                                    values: {
                                        ...previous.values,
                                        requireReviewerApproval: value,
                                    },
                                }),
                            )
                        }}
                    >
                        Require reviewer approval
                    </Switch>
                    <div className="flex flex-wrap gap-2">
                        <Button onPress={handleSave}>Save settings (optimistic)</Button>
                        <Button variant="flat" onPress={handleSimulateRemoteChange}>
                            Simulate external update
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">
                        Conflict resolution audit
                    </p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {audit.length === 0 ? (
                        <Alert color="warning" title="No concurrency decisions yet" variant="flat">
                            Trigger a conflict to inspect merge/reload/retry decision trace.
                        </Alert>
                    ) : (
                        <ul aria-label="Concurrency audit list" className="space-y-2">
                            {audit.map(
                                (entry): ReactElement => (
                                    <li
                                        className="rounded-lg border border-border bg-surface p-3 text-sm"
                                        key={entry.id}
                                    >
                                        <p className="font-semibold text-foreground">
                                            {entry.decision} · etag {entry.resultingEtag}
                                        </p>
                                        <p className="text-text-tertiary">{entry.summary}</p>
                                        <p className="text-xs text-text-secondary">
                                            {formatTimestamp(entry.occurredAt)}
                                        </p>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                </CardBody>
            </Card>

            <Modal
                isOpen={conflictState !== undefined}
                onOpenChange={(isOpen): void => {
                    if (isOpen === false) {
                        setConflictState(undefined)
                    }
                }}
            >
                <ModalContent>
                    <ModalHeader>Config conflict detected</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-text-tertiary">
                            Server ETag changed while you were editing. Choose deterministic
                            conflict strategy.
                        </p>
                        <ul aria-label="Conflict diff list" className="space-y-2">
                            {diffRows.map(
                                (row): ReactElement => (
                                    <li
                                        className="rounded-md border border-border bg-surface p-2 text-xs"
                                        key={row.field}
                                    >
                                        <p className="font-semibold text-foreground">{row.field}</p>
                                        <p>Local: {row.localValue}</p>
                                        <p>Remote: {row.remoteValue}</p>
                                    </li>
                                ),
                            )}
                        </ul>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={handleConflictReload}>
                            Reload remote
                        </Button>
                        <Button variant="flat" onPress={handleConflictRetry}>
                            Retry with latest etag
                        </Button>
                        <Button color="primary" onPress={handleConflictMerge}>
                            Merge and save
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </section>
    )
}
