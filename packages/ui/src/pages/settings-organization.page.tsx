import { type ReactElement, useMemo, useState } from "react"

import {
    Alert,
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@/components/ui"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TPlanName = "enterprise" | "pro" | "starter"
type TBillingStatus = "active" | "past_due" | "trial"
type TMemberRole = "admin" | "developer" | "lead" | "viewer"

interface IOrganizationProfile {
    /** Organization display name. */
    readonly name: string
    /** URL slug. */
    readonly slug: string
    /** Default timezone. */
    readonly timezone: string
}

interface IBillingState {
    /** Current plan. */
    readonly plan: TPlanName
    /** Billing status. */
    readonly status: TBillingStatus
    /** Seats in use. */
    readonly seatsUsed: number
    /** Seats in plan. */
    readonly seatsTotal: number
    /** Next renewal date. */
    readonly renewalAt: string
    /** Payment method label. */
    readonly paymentMethod: string
}

interface IOrganizationMember {
    /** Member id. */
    readonly id: string
    /** Member name. */
    readonly name: string
    /** Member email. */
    readonly email: string
    /** Current role. */
    readonly role: TMemberRole
}

interface IByokState {
    /** Git provider key configured. */
    readonly gitProviderTokenConfigured: boolean
    /** LLM key configured. */
    readonly llmKeyConfigured: boolean
    /** Masked key reference. */
    readonly maskedKeyRef: string
}

interface IAuditLogEntry {
    /** Audit record id. */
    readonly id: string
    /** Timestamp in readable format. */
    readonly timestamp: string
    /** Actor display name. */
    readonly actor: string
    /** Performed action. */
    readonly action: string
    /** Optional payload summary. */
    readonly details: string
}

const PROFILE_DEFAULT: IOrganizationProfile = {
    name: "Acme Platform",
    slug: "acme-platform",
    timezone: "UTC+05:00",
}

const BILLING_DEFAULT: IBillingState = {
    paymentMethod: "Visa **** 8891",
    plan: "pro",
    renewalAt: "2026-04-01",
    seatsTotal: 30,
    seatsUsed: 18,
    status: "active",
}

const MEMBERS_DEFAULT: ReadonlyArray<IOrganizationMember> = [
    {
        email: "ari@acme.dev",
        id: "member-1",
        name: "Ari Karimov",
        role: "admin",
    },
    {
        email: "nika@acme.dev",
        id: "member-2",
        name: "Nika Saryeva",
        role: "lead",
    },
    {
        email: "mila@acme.dev",
        id: "member-3",
        name: "Mila Davletova",
        role: "developer",
    },
]

const AUDIT_LOGS_DEFAULT: ReadonlyArray<IAuditLogEntry> = [
    {
        action: "organization.profile.updated",
        actor: "Ari Karimov",
        details: "Name and timezone updated.",
        id: "audit-1",
        timestamp: "2026-03-04 10:42",
    },
    {
        action: "billing.plan.changed",
        actor: "System",
        details: "Plan switched from starter to pro.",
        id: "audit-2",
        timestamp: "2026-03-03 19:10",
    },
    {
        action: "member.role.updated",
        actor: "Nika Saryeva",
        details: "Mila role changed to developer.",
        id: "audit-3",
        timestamp: "2026-03-03 12:21",
    },
    {
        action: "security.byok.rotated",
        actor: "Ari Karimov",
        details: "BYOK secret rotated for LLM provider.",
        id: "audit-4",
        timestamp: "2026-03-02 08:11",
    },
]

function mapBillingStatusColor(
    status: TBillingStatus,
): "danger" | "success" | "warning" | "default" {
    if (status === "active") {
        return "success"
    }

    if (status === "trial") {
        return "warning"
    }

    return "danger"
}

function mapMemberRoleColor(
    role: TMemberRole,
): "danger" | "primary" | "success" | "warning" | "default" {
    if (role === "admin") {
        return "primary"
    }

    if (role === "lead") {
        return "success"
    }

    if (role === "developer") {
        return "warning"
    }

    return "default"
}

function isValidInviteEmail(value: string): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

function createInviteNameFromEmail(email: string): string {
    const localPart = email.split("@")[0] ?? "new member"
    const normalized = localPart
        .split(/[._-]/g)
        .map((item): string => item.trim())
        .filter((item): boolean => item.length > 0)
        .map((item): string => item[0]?.toUpperCase() + item.slice(1))
        .join(" ")

    return normalized.length > 0 ? normalized : "New Member"
}

function OrganizationProfileCard(props: {
    readonly profile: IOrganizationProfile
    readonly onProfileChange: (nextProfile: IOrganizationProfile) => void
    readonly onSave: () => void
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Organization profile</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                    <Input
                        label="Organization name"
                        onValueChange={(value): void => {
                            props.onProfileChange({
                                ...props.profile,
                                name: value,
                            })
                        }}
                        value={props.profile.name}
                    />
                    <Input
                        label="Slug"
                        onValueChange={(value): void => {
                            props.onProfileChange({
                                ...props.profile,
                                slug: value,
                            })
                        }}
                        value={props.profile.slug}
                    />
                    <Input
                        label="Timezone"
                        onValueChange={(value): void => {
                            props.onProfileChange({
                                ...props.profile,
                                timezone: value,
                            })
                        }}
                        value={props.profile.timezone}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onPress={props.onSave}>Save profile</Button>
                </div>
            </CardBody>
        </Card>
    )
}

function BillingCard(props: {
    readonly billing: IBillingState
    readonly onPlanChange: (plan: TPlanName) => void
    readonly onRetryPayment: () => void
    readonly onConfirmCriticalAction: () => void
}): ReactElement {
    const seatUsagePercent = Math.round((props.billing.seatsUsed / props.billing.seatsTotal) * 100)

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <p className={TYPOGRAPHY.sectionTitle}>Billing</p>
                <Chip color={mapBillingStatusColor(props.billing.status)} size="sm" variant="flat">
                    {props.billing.status}
                </Chip>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                    <p>
                        Plan: <span className="font-semibold">{props.billing.plan}</span>
                    </p>
                    <p>
                        Renewal: <span className="font-semibold">{props.billing.renewalAt}</span>
                    </p>
                    <p>
                        Seats:{" "}
                        <span className="font-semibold">
                            {props.billing.seatsUsed}/{props.billing.seatsTotal}
                        </span>{" "}
                        ({seatUsagePercent}%)
                    </p>
                    <p>
                        Payment method:{" "}
                        <span className="font-semibold">{props.billing.paymentMethod}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        aria-label="Plan"
                        className={NATIVE_FORM.select}
                        id="billing-plan-select"
                        value={props.billing.plan}
                        onChange={(event): void => {
                            const plan = event.currentTarget.value
                            if (plan === "starter" || plan === "pro" || plan === "enterprise") {
                                props.onPlanChange(plan)
                            }
                        }}
                    >
                        <option value="starter">starter</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                    </select>
                    <Button onPress={props.onRetryPayment} size="sm" variant="light">
                        Retry payment
                    </Button>
                    <Button
                        color="danger"
                        onPress={props.onConfirmCriticalAction}
                        size="sm"
                        variant="ghost"
                    >
                        Confirm billing action
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}

function MembersCard(props: {
    readonly members: ReadonlyArray<IOrganizationMember>
    readonly inviteEmail: string
    readonly inviteRole: TMemberRole
    readonly onInviteEmailChange: (value: string) => void
    readonly onInviteRoleChange: (value: TMemberRole) => void
    readonly onInvite: () => void
    readonly onRoleChange: (memberId: string, role: TMemberRole) => void
    readonly onRemoveMember: (memberId: string) => void
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Members</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Input
                        label="Invite by email"
                        onValueChange={props.onInviteEmailChange}
                        placeholder="new.member@acme.dev"
                        value={props.inviteEmail}
                    />
                    <select
                        aria-label="Role"
                        className={NATIVE_FORM.select}
                        id="invite-role-select"
                        value={props.inviteRole}
                        onChange={(event): void => {
                            const role = event.currentTarget.value
                            if (
                                role === "viewer" ||
                                role === "developer" ||
                                role === "lead" ||
                                role === "admin"
                            ) {
                                props.onInviteRoleChange(role)
                            }
                        }}
                    >
                        <option value="viewer">viewer</option>
                        <option value="developer">developer</option>
                        <option value="lead">lead</option>
                        <option value="admin">admin</option>
                    </select>
                    <div className="flex items-end">
                        <Button onPress={props.onInvite}>Invite member</Button>
                    </div>
                </div>

                <Table aria-label="Organization members">
                    <TableHeader>
                        <TableColumn>Name</TableColumn>
                        <TableColumn>Email</TableColumn>
                        <TableColumn>Role</TableColumn>
                        <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No members found">
                        {props.members.map(
                            (member): ReactElement => (
                                <TableRow key={member.id}>
                                    <TableCell>{member.name}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Chip
                                                color={mapMemberRoleColor(member.role)}
                                                size="sm"
                                                variant="flat"
                                            >
                                                {member.role}
                                            </Chip>
                                            <select
                                                aria-label={`Role for ${member.email}`}
                                                className={NATIVE_FORM.select}
                                                value={member.role}
                                                onChange={(event): void => {
                                                    const role = event.currentTarget.value
                                                    if (
                                                        role === "viewer" ||
                                                        role === "developer" ||
                                                        role === "lead" ||
                                                        role === "admin"
                                                    ) {
                                                        props.onRoleChange(member.id, role)
                                                    }
                                                }}
                                            >
                                                <option value="viewer">viewer</option>
                                                <option value="developer">developer</option>
                                                <option value="lead">lead</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            color="danger"
                                            onPress={(): void => {
                                                props.onRemoveMember(member.id)
                                            }}
                                            size="sm"
                                            variant="ghost"
                                        >
                                            Remove
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ),
                        )}
                    </TableBody>
                </Table>
            </CardBody>
        </Card>
    )
}

function ByokCard(props: {
    readonly byok: IByokState
    readonly onToggleGitToken: (value: boolean) => void
    readonly onToggleLlmToken: (value: boolean) => void
    readonly onRotate: () => void
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>BYOK</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Manage secure provider keys used by integrations and LLM runtime.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                    <Switch
                        isSelected={props.byok.gitProviderTokenConfigured}
                        onValueChange={props.onToggleGitToken}
                    >
                        Git provider key configured
                    </Switch>
                    <Switch
                        isSelected={props.byok.llmKeyConfigured}
                        onValueChange={props.onToggleLlmToken}
                    >
                        LLM key configured
                    </Switch>
                </div>
                <p className="text-xs text-muted-foreground">
                    Active key ref: {props.byok.maskedKeyRef}
                </p>
                <div>
                    <Button onPress={props.onRotate} size="sm" variant="light">
                        Rotate BYOK secret
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}

function AuditLogsCard(props: { readonly logs: ReadonlyArray<IAuditLogEntry> }): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Audit logs (latest)</p>
            </CardHeader>
            <CardBody>
                <Table aria-label="Organization audit logs">
                    <TableHeader>
                        <TableColumn>Time</TableColumn>
                        <TableColumn>Actor</TableColumn>
                        <TableColumn>Action</TableColumn>
                        <TableColumn>Details</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No audit entries">
                        {props.logs.map(
                            (log): ReactElement => (
                                <TableRow key={log.id}>
                                    <TableCell>{log.timestamp}</TableCell>
                                    <TableCell>{log.actor}</TableCell>
                                    <TableCell>{log.action}</TableCell>
                                    <TableCell>{log.details}</TableCell>
                                </TableRow>
                            ),
                        )}
                    </TableBody>
                </Table>
            </CardBody>
        </Card>
    )
}

/**
 * Страница настроек организации: профиль, billing, members, BYOK и audit logs.
 *
 * @returns Organization settings UI.
 */
export function SettingsOrganizationPage(): ReactElement {
    const [profile, setProfile] = useState<IOrganizationProfile>(PROFILE_DEFAULT)
    const [billing, setBilling] = useState<IBillingState>(BILLING_DEFAULT)
    const [members, setMembers] = useState<ReadonlyArray<IOrganizationMember>>(MEMBERS_DEFAULT)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<TMemberRole>("viewer")
    const [byok, setByok] = useState<IByokState>({
        gitProviderTokenConfigured: true,
        llmKeyConfigured: true,
        maskedKeyRef: "byok_****a2f8",
    })
    const [billingError, setBillingError] = useState<string | undefined>(undefined)
    const auditLogs = useMemo((): ReadonlyArray<IAuditLogEntry> => AUDIT_LOGS_DEFAULT, [])

    const handleSaveProfile = (): void => {
        if (profile.name.trim().length === 0 || profile.slug.trim().length === 0) {
            showToastError("Organization name and slug are required.")
            return
        }

        showToastSuccess("Organization profile saved.")
    }

    const handleInviteMember = (): void => {
        const normalizedEmail = inviteEmail.trim().toLowerCase()
        if (isValidInviteEmail(normalizedEmail) === false) {
            showToastError("Enter a valid email for invite.")
            return
        }

        const nextMember: IOrganizationMember = {
            email: normalizedEmail,
            id: `member-${String(members.length + 1)}`,
            name: createInviteNameFromEmail(normalizedEmail),
            role: inviteRole,
        }
        setMembers((previous): ReadonlyArray<IOrganizationMember> => [...previous, nextMember])
        setInviteEmail("")
        showToastSuccess("Invitation sent.")
    }

    const handleMemberRoleChange = (memberId: string, role: TMemberRole): void => {
        setMembers(
            (previous): ReadonlyArray<IOrganizationMember> =>
                previous.map((member): IOrganizationMember => {
                    if (member.id !== memberId) {
                        return member
                    }

                    return {
                        ...member,
                        role,
                    }
                }),
        )
        showToastInfo("Member role updated.")
    }

    const handleRemoveMember = (memberId: string): void => {
        setMembers(
            (previous): ReadonlyArray<IOrganizationMember> =>
                previous.filter((member): boolean => member.id !== memberId),
        )
        showToastInfo("Member removed.")
    }

    const handlePlanChange = (plan: TPlanName): void => {
        setBilling(
            (previous): IBillingState => ({
                ...previous,
                plan,
                status: plan === "starter" ? "trial" : previous.status,
            }),
        )
        setBillingError(undefined)
        showToastSuccess("Billing plan updated.")
    }

    const handleRetryPayment = (): void => {
        const shouldFail = billing.status === "past_due"
        if (shouldFail) {
            setBillingError("Payment retry failed. Review billing method and try again.")
            showToastError("Payment retry failed.")
            return
        }

        setBillingError(undefined)
        showToastSuccess("Payment status is healthy.")
    }

    const handleConfirmCriticalBillingAction = (): void => {
        const isConfirmed =
            typeof window === "undefined"
                ? true
                : window.confirm("Confirm critical billing action?")

        if (isConfirmed !== true) {
            showToastInfo("Billing action cancelled.")
            return
        }

        setBilling(
            (previous): IBillingState => ({
                ...previous,
                status: "active",
            }),
        )
        setBillingError(undefined)
        showToastInfo("Critical billing action confirmed.")
    }

    const handleByokRotate = (): void => {
        setByok(
            (previous): IByokState => ({
                ...previous,
                maskedKeyRef: `byok_****${String(Date.now()).slice(-4)}`,
            }),
        )
        showToastSuccess("BYOK secret rotated.")
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>Organization Settings</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                Manage organization profile, billing, members, BYOK and audit history.
            </p>

            {billingError === undefined ? null : <Alert color="danger">{billingError}</Alert>}

            <OrganizationProfileCard
                onProfileChange={setProfile}
                onSave={handleSaveProfile}
                profile={profile}
            />
            <BillingCard
                billing={billing}
                onConfirmCriticalAction={handleConfirmCriticalBillingAction}
                onPlanChange={handlePlanChange}
                onRetryPayment={handleRetryPayment}
            />
            <MembersCard
                inviteEmail={inviteEmail}
                inviteRole={inviteRole}
                members={members}
                onInvite={handleInviteMember}
                onInviteEmailChange={setInviteEmail}
                onInviteRoleChange={setInviteRole}
                onRemoveMember={handleRemoveMember}
                onRoleChange={handleMemberRoleChange}
            />
            <ByokCard
                byok={byok}
                onRotate={handleByokRotate}
                onToggleGitToken={(value): void => {
                    setByok(
                        (previous): IByokState => ({
                            ...previous,
                            gitProviderTokenConfigured: value,
                        }),
                    )
                }}
                onToggleLlmToken={(value): void => {
                    setByok(
                        (previous): IByokState => ({
                            ...previous,
                            llmKeyConfigured: value,
                        }),
                    )
                }}
            />
            <AuditLogsCard logs={auditLogs} />
        </section>
    )
}
