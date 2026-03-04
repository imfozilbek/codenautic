import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TPlanName = "enterprise" | "pro" | "starter"
type TBillingStatus = "active" | "canceled" | "past_due" | "trial"
type TPlanHistoryAction = "invoice_paid" | "plan_change" | "status_change"

interface IPlanHistoryEntry {
    /** Уникальный идентификатор события. */
    readonly id: string
    /** Исполнитель изменения. */
    readonly actor: string
    /** Тип операции. */
    readonly action: TPlanHistoryAction
    /** Итог операции. */
    readonly outcome: string
    /** Время изменения. */
    readonly occurredAt: string
}

interface IBillingSnapshot {
    /** Активный план в backend snapshot. */
    readonly plan: TPlanName
    /** Billing lifecycle state. */
    readonly status: TBillingStatus
}

interface IEntitledFeature {
    /** Уникальный id фичи. */
    readonly id: string
    /** Название фичи. */
    readonly label: string
    /** Минимальный план для разблокировки. */
    readonly minPlan: TPlanName
}

const PLAN_PRIORITY: Readonly<Record<TPlanName, number>> = {
    enterprise: 3,
    pro: 2,
    starter: 1,
}

const ENTITLED_FEATURES: ReadonlyArray<IEntitledFeature> = [
    {
        id: "feature-pr-merge-gate",
        label: "PR merge gate policies",
        minPlan: "pro",
    },
    {
        id: "feature-team-policies",
        label: "Cross-team policy packs",
        minPlan: "enterprise",
    },
    {
        id: "feature-audit-export",
        label: "Extended audit export",
        minPlan: "pro",
    },
]

const INITIAL_BILLING_SNAPSHOT: IBillingSnapshot = {
    plan: "pro",
    status: "active",
}

const INITIAL_HISTORY: ReadonlyArray<IPlanHistoryEntry> = [
    {
        action: "plan_change",
        actor: "System",
        id: "BILL-2001",
        occurredAt: "2026-03-03T16:12:00Z",
        outcome: "Upgraded from starter to pro",
    },
    {
        action: "status_change",
        actor: "Ari Karimov",
        id: "BILL-2002",
        occurredAt: "2026-03-02T10:40:00Z",
        outcome: "Set status to trial for workspace onboarding",
    },
]

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

function hasPlanEntitlement(currentPlan: TPlanName, requiredPlan: TPlanName): boolean {
    return PLAN_PRIORITY[currentPlan] >= PLAN_PRIORITY[requiredPlan]
}

function isPremiumStatusLocked(status: TBillingStatus): boolean {
    return status === "past_due" || status === "canceled"
}

function mapStatusChipColor(status: TBillingStatus): "danger" | "success" | "warning" {
    if (status === "active") {
        return "success"
    }

    if (status === "trial") {
        return "warning"
    }

    return "danger"
}

function buildPaywallBanner(status: TBillingStatus): {
    readonly color: "danger" | "warning"
    readonly title: string
    readonly description: string
} | null {
    if (status === "past_due") {
        return {
            color: "danger",
            description:
                "Premium features are temporarily locked until invoice is paid.",
            title: "Payment overdue",
        }
    }

    if (status === "canceled") {
        return {
            color: "warning",
            description:
                "Workspace is in canceled state. Reactivate subscription to unlock premium features.",
            title: "Subscription canceled",
        }
    }

    return null
}

/**
 * Экран Billing lifecycle и entitlement states.
 *
 * @returns UI для управления plan/status, paywall, upgrade/downgrade и истории.
 */
export function SettingsBillingPage(): ReactElement {
    const [billingSnapshot, setBillingSnapshot] = useState<IBillingSnapshot>(INITIAL_BILLING_SNAPSHOT)
    const [draftPlan, setDraftPlan] = useState<TPlanName>(INITIAL_BILLING_SNAPSHOT.plan)
    const [draftStatus, setDraftStatus] = useState<TBillingStatus>(INITIAL_BILLING_SNAPSHOT.status)
    const [history, setHistory] = useState<ReadonlyArray<IPlanHistoryEntry>>(INITIAL_HISTORY)
    const [lastOutcome, setLastOutcome] = useState<string>("No billing actions applied yet.")

    const paywallBanner = useMemo(() => {
        return buildPaywallBanner(billingSnapshot.status)
    }, [billingSnapshot.status])

    const entitledFeatures = useMemo((): ReadonlyArray<{
        readonly id: string
        readonly isLocked: boolean
        readonly label: string
        readonly lockReason?: string
    }> => {
        const isStatusLocked = isPremiumStatusLocked(billingSnapshot.status)

        return ENTITLED_FEATURES.map((feature) => {
            const hasEntitlement = hasPlanEntitlement(billingSnapshot.plan, feature.minPlan)
            const isLocked = isStatusLocked || hasEntitlement !== true
            const lockReason =
                isLocked === false
                    ? undefined
                    : isStatusLocked
                      ? "Billing status is not active."
                      : `Requires ${feature.minPlan} plan.`

            return {
                id: feature.id,
                isLocked,
                label: feature.label,
                lockReason,
            }
        })
    }, [billingSnapshot.plan, billingSnapshot.status])

    const handleApplyBillingChange = (): void => {
        const isPlanDowngrade = PLAN_PRIORITY[draftPlan] < PLAN_PRIORITY[billingSnapshot.plan]
        if (isPlanDowngrade) {
            const downgradeConfirmed =
                typeof window === "undefined"
                    ? true
                    : window.confirm("Confirm downgrade to a lower plan?")
            if (downgradeConfirmed !== true) {
                setLastOutcome("Billing change cancelled by operator.")
                showToastInfo("Downgrade cancelled.")
                return
            }
        }

        const actionType: TPlanHistoryAction =
            draftPlan !== billingSnapshot.plan
                ? "plan_change"
                : draftStatus !== billingSnapshot.status
                  ? "status_change"
                  : "status_change"
        const nextSnapshot: IBillingSnapshot = {
            plan: draftPlan,
            status: draftStatus,
        }
        const outcome = `Applied ${nextSnapshot.plan} / ${nextSnapshot.status} successfully.`

        setBillingSnapshot(nextSnapshot)
        setLastOutcome(outcome)
        setHistory((previous): ReadonlyArray<IPlanHistoryEntry> => [
            {
                action: actionType,
                actor: "Current operator",
                id: `BILL-${Date.now().toString(36)}`,
                occurredAt: new Date().toISOString(),
                outcome,
            },
            ...previous,
        ])
        showToastSuccess("Billing lifecycle updated.")
    }

    const handleMarkInvoicePaid = (): void => {
        const nextSnapshot: IBillingSnapshot = {
            ...billingSnapshot,
            status: "active",
        }
        const outcome = "Invoice marked as paid and premium features unlocked."

        setBillingSnapshot(nextSnapshot)
        setDraftStatus("active")
        setLastOutcome(outcome)
        setHistory((previous): ReadonlyArray<IPlanHistoryEntry> => [
            {
                action: "invoice_paid",
                actor: "Current operator",
                id: `BILL-${Date.now().toString(36)}`,
                occurredAt: new Date().toISOString(),
                outcome,
            },
            ...previous,
        ])
        showToastSuccess("Invoice marked as paid.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Billing lifecycle</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Manage trial/active/past-due/canceled states, feature entitlements, and plan
                transitions with explicit outcomes.
            </p>

            {paywallBanner === null ? (
                <Alert color="success" title="Billing status is healthy" variant="flat">
                    Premium feature availability follows current plan entitlements.
                </Alert>
            ) : (
                <Alert color={paywallBanner.color} title={paywallBanner.title} variant="flat">
                    {paywallBanner.description}
                </Alert>
            )}

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Current billing snapshot
                    </p>
                    <Chip color={mapStatusChipColor(billingSnapshot.status)} size="sm" variant="flat">
                        {billingSnapshot.status}
                    </Chip>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-[var(--foreground)]/80">
                        Current plan: <strong>{billingSnapshot.plan}</strong>
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-sm text-[var(--foreground)]/80" htmlFor="billing-plan-select">
                                Plan
                            </label>
                            <select
                                aria-label="Billing plan"
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                id="billing-plan-select"
                                value={draftPlan}
                                onChange={(event): void => {
                                    const nextPlan = event.currentTarget.value
                                    if (
                                        nextPlan === "starter"
                                        || nextPlan === "pro"
                                        || nextPlan === "enterprise"
                                    ) {
                                        setDraftPlan(nextPlan)
                                    }
                                }}
                            >
                                <option value="starter">starter</option>
                                <option value="pro">pro</option>
                                <option value="enterprise">enterprise</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-[var(--foreground)]/80" htmlFor="billing-status-select">
                                Billing status
                            </label>
                            <select
                                aria-label="Billing status"
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                id="billing-status-select"
                                value={draftStatus}
                                onChange={(event): void => {
                                    const nextStatus = event.currentTarget.value
                                    if (
                                        nextStatus === "trial"
                                        || nextStatus === "active"
                                        || nextStatus === "past_due"
                                        || nextStatus === "canceled"
                                    ) {
                                        setDraftStatus(nextStatus)
                                    }
                                }}
                            >
                                <option value="trial">trial</option>
                                <option value="active">active</option>
                                <option value="past_due">past_due</option>
                                <option value="canceled">canceled</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onPress={handleApplyBillingChange}>Apply billing change</Button>
                        {billingSnapshot.status === "past_due" ? (
                            <Button color="success" variant="flat" onPress={handleMarkInvoicePaid}>
                                Mark invoice as paid
                            </Button>
                        ) : null}
                    </div>
                    <Alert color="primary" title="Last billing action" variant="flat">
                        {lastOutcome}
                    </Alert>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Premium feature lock/unlock state
                    </p>
                </CardHeader>
                <CardBody className="space-y-2">
                    <ul aria-label="Entitlement features list" className="space-y-2">
                        {entitledFeatures.map((feature): ReactElement => (
                            <li
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                                key={feature.id}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-[var(--foreground)]">
                                        {feature.label}
                                    </p>
                                    <Chip
                                        color={feature.isLocked ? "danger" : "success"}
                                        size="sm"
                                        variant="flat"
                                    >
                                        {feature.isLocked ? "Locked" : "Unlocked"}
                                    </Chip>
                                </div>
                                {feature.lockReason === undefined ? null : (
                                    <p className="mt-1 text-xs text-[var(--foreground)]/70">
                                        {feature.lockReason}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Plan change history
                    </p>
                </CardHeader>
                <CardBody className="space-y-2">
                    <ul aria-label="Billing history list" className="space-y-2">
                        {history.map((entry): ReactElement => (
                            <li
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                                key={entry.id}
                            >
                                <p className="font-semibold text-[var(--foreground)]">
                                    {entry.action} · {entry.actor}
                                </p>
                                <p className="text-[var(--foreground)]/80">{entry.outcome}</p>
                                <p className="text-xs text-[var(--foreground)]/70">
                                    {formatTimestamp(entry.occurredAt)}
                                </p>
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </section>
    )
}
