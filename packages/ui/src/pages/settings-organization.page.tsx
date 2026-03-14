import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

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
import { FormLayout } from "@/components/forms/form-layout"
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
        email: "neo@acme.dev",
        id: "member-1",
        name: "Neo Anderson",
        role: "admin",
    },
    {
        email: "trinity@acme.dev",
        id: "member-2",
        name: "Trinity",
        role: "lead",
    },
    {
        email: "morpheus@acme.dev",
        id: "member-3",
        name: "Morpheus",
        role: "developer",
    },
]

const AUDIT_LOGS_DEFAULT: ReadonlyArray<IAuditLogEntry> = [
    {
        action: "organization.profile.updated",
        actor: "Neo Anderson",
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
        actor: "Trinity",
        details: "Morpheus role changed to developer.",
        id: "audit-3",
        timestamp: "2026-03-03 12:21",
    },
    {
        action: "security.byok.rotated",
        actor: "Neo Anderson",
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
    const { t } = useTranslation(["settings"])

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>
                    {t("settings:organization.profileTitle")}
                </p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                    <Input
                        label={t("settings:organization.organizationName")}
                        onValueChange={(value): void => {
                            props.onProfileChange({
                                ...props.profile,
                                name: value,
                            })
                        }}
                        value={props.profile.name}
                    />
                    <Input
                        label={t("settings:organization.slug")}
                        onValueChange={(value): void => {
                            props.onProfileChange({
                                ...props.profile,
                                slug: value,
                            })
                        }}
                        value={props.profile.slug}
                    />
                    <Input
                        label={t("settings:organization.timezone")}
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
                    <Button color="primary" onPress={props.onSave}>
                        {t("settings:organization.saveProfile")}
                    </Button>
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
    const { t } = useTranslation(["settings"])
    const seatUsagePercent = Math.round((props.billing.seatsUsed / props.billing.seatsTotal) * 100)

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <p className={TYPOGRAPHY.sectionTitle}>
                    {t("settings:organization.billingTitle")}
                </p>
                <Chip color={mapBillingStatusColor(props.billing.status)} size="sm" variant="flat">
                    {props.billing.status}
                </Chip>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                    <p>
                        {t("settings:organization.plan")}:{" "}
                        <span className="font-semibold">{props.billing.plan}</span>
                    </p>
                    <p>
                        {t("settings:organization.renewal")}:{" "}
                        <span className="font-semibold">{props.billing.renewalAt}</span>
                    </p>
                    <p>
                        {t("settings:organization.seats")}:{" "}
                        <span className="font-semibold">
                            {props.billing.seatsUsed}/{props.billing.seatsTotal}
                        </span>{" "}
                        ({seatUsagePercent}%)
                    </p>
                    <p>
                        {t("settings:organization.paymentMethod")}:{" "}
                        <span className="font-semibold">{props.billing.paymentMethod}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        aria-label={t("settings:organization.planLabel")}
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
                        {t("settings:organization.retryPayment")}
                    </Button>
                    <Button
                        color="danger"
                        onPress={props.onConfirmCriticalAction}
                        size="sm"
                        variant="ghost"
                    >
                        {t("settings:organization.confirmBillingAction")}
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
    const { t } = useTranslation(["settings"])

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>
                    {t("settings:organization.membersTitle")}
                </p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Input
                        label={t("settings:organization.inviteByEmail")}
                        onValueChange={props.onInviteEmailChange}
                        placeholder="new.member@acme.dev"
                        value={props.inviteEmail}
                    />
                    <select
                        aria-label={t("settings:organization.role")}
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
                        <Button color="primary" onPress={props.onInvite}>
                            {t("settings:organization.inviteMember")}
                        </Button>
                    </div>
                </div>

                <Table aria-label="Organization members">
                    <TableHeader>
                        <TableColumn>{t("settings:organization.tableNameHeader")}</TableColumn>
                        <TableColumn>{t("settings:organization.tableEmailHeader")}</TableColumn>
                        <TableColumn>{t("settings:organization.tableRoleHeader")}</TableColumn>
                        <TableColumn>{t("settings:organization.tableActionsHeader")}</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={t("settings:organization.noMembersFound")}>
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
                                            {t("settings:organization.remove")}
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
    const { t } = useTranslation(["settings"])

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>
                    {t("settings:organization.byokTitle")}
                </p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    {t("settings:organization.byokDescription")}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                    <Switch
                        isSelected={props.byok.gitProviderTokenConfigured}
                        onValueChange={props.onToggleGitToken}
                    >
                        {t("settings:organization.gitProviderKeyConfigured")}
                    </Switch>
                    <Switch
                        isSelected={props.byok.llmKeyConfigured}
                        onValueChange={props.onToggleLlmToken}
                    >
                        {t("settings:organization.llmKeyConfigured")}
                    </Switch>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t("settings:organization.activeKeyRef")}: {props.byok.maskedKeyRef}
                </p>
                <div>
                    <Button onPress={props.onRotate} size="sm" variant="light">
                        {t("settings:organization.rotateByokSecret")}
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}

function AuditLogsCard(props: { readonly logs: ReadonlyArray<IAuditLogEntry> }): ReactElement {
    const { t } = useTranslation(["settings"])

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>
                    {t("settings:organization.auditLogsTitle")}
                </p>
            </CardHeader>
            <CardBody>
                <Table aria-label="Organization audit logs">
                    <TableHeader>
                        <TableColumn>{t("settings:organization.auditTimeHeader")}</TableColumn>
                        <TableColumn>{t("settings:organization.auditActorHeader")}</TableColumn>
                        <TableColumn>{t("settings:organization.auditActionHeader")}</TableColumn>
                        <TableColumn>{t("settings:organization.auditDetailsHeader")}</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={t("settings:organization.noAuditEntries")}>
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
    const { t } = useTranslation(["settings"])
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
            showToastError(t("settings:organization.toast.nameAndSlugRequired"))
            return
        }

        showToastSuccess(t("settings:organization.toast.profileSaved"))
    }

    const handleInviteMember = (): void => {
        const normalizedEmail = inviteEmail.trim().toLowerCase()
        if (isValidInviteEmail(normalizedEmail) === false) {
            showToastError(t("settings:organization.toast.invalidInviteEmail"))
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
        showToastSuccess(t("settings:organization.toast.invitationSent"))
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
        showToastInfo(t("settings:organization.toast.memberRoleUpdated"))
    }

    const handleRemoveMember = (memberId: string): void => {
        setMembers(
            (previous): ReadonlyArray<IOrganizationMember> =>
                previous.filter((member): boolean => member.id !== memberId),
        )
        showToastInfo(t("settings:organization.toast.memberRemoved"))
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
        showToastSuccess(t("settings:organization.toast.billingPlanUpdated"))
    }

    const handleRetryPayment = (): void => {
        const shouldFail = billing.status === "past_due"
        if (shouldFail) {
            setBillingError(t("settings:organization.toast.paymentRetryFailedDetails"))
            showToastError(t("settings:organization.toast.paymentRetryFailed"))
            return
        }

        setBillingError(undefined)
        showToastSuccess(t("settings:organization.toast.paymentHealthy"))
    }

    const handleConfirmCriticalBillingAction = (): void => {
        const isConfirmed =
            typeof window === "undefined"
                ? true
                : window.confirm(t("settings:organization.toast.confirmCriticalBillingAction"))

        if (isConfirmed !== true) {
            showToastInfo(t("settings:organization.toast.billingActionCancelled"))
            return
        }

        setBilling(
            (previous): IBillingState => ({
                ...previous,
                status: "active",
            }),
        )
        setBillingError(undefined)
        showToastInfo(t("settings:organization.toast.criticalBillingActionConfirmed"))
    }

    const handleByokRotate = (): void => {
        setByok(
            (previous): IByokState => ({
                ...previous,
                maskedKeyRef: `byok_****${String(Date.now()).slice(-4)}`,
            }),
        )
        showToastSuccess(t("settings:organization.toast.byokSecretRotated"))
    }

    return (
        <FormLayout
            title={t("settings:organization.pageTitle")}
            description={t("settings:organization.pageSubtitle")}
        >
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
        </FormLayout>
    )
}
