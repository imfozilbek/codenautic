import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
    Alert,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Input,
    Switch,
    Table,
    Tabs,
} from "@heroui/react"
import { SettingsTeamPage } from "@/pages/settings-team.page"
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
): "danger" | "accent" | "success" | "warning" | "default" {
    if (role === "admin") {
        return "accent"
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
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:organization.profileTitle")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                    <Input
                        aria-label={t("settings:organization.organizationName")}
                        onChange={(e): void => {
                            props.onProfileChange({
                                ...props.profile,
                                name: e.target.value,
                            })
                        }}
                        value={props.profile.name}
                    />
                    <Input
                        aria-label={t("settings:organization.slug")}
                        onChange={(e): void => {
                            props.onProfileChange({
                                ...props.profile,
                                slug: e.target.value,
                            })
                        }}
                        value={props.profile.slug}
                    />
                    <Input
                        aria-label={t("settings:organization.timezone")}
                        onChange={(e): void => {
                            props.onProfileChange({
                                ...props.profile,
                                timezone: e.target.value,
                            })
                        }}
                        value={props.profile.timezone}
                    />
                </div>
                <div className="flex justify-end">
                    <Button variant="primary" onPress={props.onSave}>
                        {t("settings:organization.saveProfile")}
                    </Button>
                </div>
            </CardContent>
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
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:organization.billingTitle")}</p>
                <Chip color={mapBillingStatusColor(props.billing.status)} size="sm" variant="soft">
                    {props.billing.status}
                </Chip>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    <Button onPress={props.onRetryPayment} size="sm" variant="ghost">
                        {t("settings:organization.retryPayment")}
                    </Button>
                    <Button onPress={props.onConfirmCriticalAction} size="sm" variant="danger">
                        {t("settings:organization.confirmBillingAction")}
                    </Button>
                </div>
            </CardContent>
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
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:organization.membersTitle")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Input
                        aria-label={t("settings:organization.inviteByEmail")}
                        onChange={(e): void => {
                            props.onInviteEmailChange(e.target.value)
                        }}
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
                        <Button variant="primary" onPress={props.onInvite}>
                            {t("settings:organization.inviteMember")}
                        </Button>
                    </div>
                </div>

                <Table>
                    <Table.ScrollContainer>
                        <Table.Content
                            aria-label={t("settings:ariaLabel.organization.membersTable")}
                        >
                            <Table.Header>
                                <Table.Column isRowHeader>
                                    {t("settings:organization.tableNameHeader")}
                                </Table.Column>
                                <Table.Column>
                                    {t("settings:organization.tableEmailHeader")}
                                </Table.Column>
                                <Table.Column>
                                    {t("settings:organization.tableRoleHeader")}
                                </Table.Column>
                                <Table.Column>
                                    {t("settings:organization.tableActionsHeader")}
                                </Table.Column>
                            </Table.Header>
                            <Table.Body>
                                {props.members.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell>
                                            {t("settings:organization.noMembersFound")}
                                        </Table.Cell>
                                        <Table.Cell>{""}</Table.Cell>
                                        <Table.Cell>{""}</Table.Cell>
                                        <Table.Cell>{""}</Table.Cell>
                                    </Table.Row>
                                ) : (
                                    props.members.map(
                                        (member): ReactElement => (
                                            <Table.Row key={member.id}>
                                                <Table.Cell>{member.name}</Table.Cell>
                                                <Table.Cell>{member.email}</Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-2">
                                                        <Chip
                                                            color={mapMemberRoleColor(member.role)}
                                                            size="sm"
                                                            variant="soft"
                                                        >
                                                            {member.role}
                                                        </Chip>
                                                        <select
                                                            aria-label={`Role for ${member.email}`}
                                                            className={NATIVE_FORM.select}
                                                            value={member.role}
                                                            onChange={(event): void => {
                                                                const role =
                                                                    event.currentTarget.value
                                                                if (
                                                                    role === "viewer" ||
                                                                    role === "developer" ||
                                                                    role === "lead" ||
                                                                    role === "admin"
                                                                ) {
                                                                    props.onRoleChange(
                                                                        member.id,
                                                                        role,
                                                                    )
                                                                }
                                                            }}
                                                        >
                                                            <option value="viewer">viewer</option>
                                                            <option value="developer">
                                                                developer
                                                            </option>
                                                            <option value="lead">lead</option>
                                                            <option value="admin">admin</option>
                                                        </select>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Button
                                                        onPress={(): void => {
                                                            props.onRemoveMember(member.id)
                                                        }}
                                                        size="sm"
                                                        variant="danger"
                                                    >
                                                        {t("settings:organization.remove")}
                                                    </Button>
                                                </Table.Cell>
                                            </Table.Row>
                                        ),
                                    )
                                )}
                            </Table.Body>
                        </Table.Content>
                    </Table.ScrollContainer>
                </Table>
            </CardContent>
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
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:organization.byokTitle")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted">{t("settings:organization.byokDescription")}</p>
                <div className="flex flex-wrap items-center gap-4">
                    <Switch
                        isSelected={props.byok.gitProviderTokenConfigured}
                        onChange={props.onToggleGitToken}
                    >
                        {t("settings:organization.gitProviderKeyConfigured")}
                    </Switch>
                    <Switch
                        isSelected={props.byok.llmKeyConfigured}
                        onChange={props.onToggleLlmToken}
                    >
                        {t("settings:organization.llmKeyConfigured")}
                    </Switch>
                </div>
                <p className="text-xs text-muted">
                    {t("settings:organization.activeKeyRef")}: {props.byok.maskedKeyRef}
                </p>
                <div>
                    <Button onPress={props.onRotate} size="sm" variant="ghost">
                        {t("settings:organization.rotateByokSecret")}
                    </Button>
                </div>
            </CardContent>
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
            <CardContent>
                <Table>
                    <Table.ScrollContainer>
                        <Table.Content
                            aria-label={t("settings:ariaLabel.organization.auditLogsTable")}
                        >
                            <Table.Header>
                                <Table.Column isRowHeader>
                                    {t("settings:organization.auditTimeHeader")}
                                </Table.Column>
                                <Table.Column>
                                    {t("settings:organization.auditActorHeader")}
                                </Table.Column>
                                <Table.Column>
                                    {t("settings:organization.auditActionHeader")}
                                </Table.Column>
                                <Table.Column>
                                    {t("settings:organization.auditDetailsHeader")}
                                </Table.Column>
                            </Table.Header>
                            <Table.Body>
                                {props.logs.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell>
                                            {t("settings:organization.noAuditEntries")}
                                        </Table.Cell>
                                        <Table.Cell>{""}</Table.Cell>
                                        <Table.Cell>{""}</Table.Cell>
                                        <Table.Cell>{""}</Table.Cell>
                                    </Table.Row>
                                ) : (
                                    props.logs.map(
                                        (log): ReactElement => (
                                            <Table.Row key={log.id}>
                                                <Table.Cell>{log.timestamp}</Table.Cell>
                                                <Table.Cell>{log.actor}</Table.Cell>
                                                <Table.Cell>{log.action}</Table.Cell>
                                                <Table.Cell>{log.details}</Table.Cell>
                                            </Table.Row>
                                        ),
                                    )
                                )}
                            </Table.Body>
                        </Table.Content>
                    </Table.ScrollContainer>
                </Table>
            </CardContent>
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
        const isConfirmed = window.confirm(
            t("settings:organization.toast.confirmCriticalBillingAction"),
        )

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
        <Tabs aria-label={t("settings:organization.tabsLabel", { defaultValue: "Organization settings" })} variant="secondary">
            <Tabs.List>
                <Tabs.Tab id="organization">{t("settings:organization.tabOrganization", { defaultValue: "Organization" })}</Tabs.Tab>
                <Tabs.Tab id="team">{t("settings:organization.tabTeam", { defaultValue: "Team" })}</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel id="organization">
        <div className="space-y-6 mx-auto max-w-[1400px]"><div className="space-y-1.5"><h1 className={TYPOGRAPHY.pageTitle}>{t("settings:organization.pageTitle")}</h1><p className={TYPOGRAPHY.bodyMuted}>{t("settings:organization.pageSubtitle")}</p></div><div className="space-y-6">
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
        </div></div>
            </Tabs.Panel>
            <Tabs.Panel id="team">
                <SettingsTeamPage />
            </Tabs.Panel>
        </Tabs>
    )
}
