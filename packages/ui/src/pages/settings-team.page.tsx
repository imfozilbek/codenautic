import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardBody, CardHeader, Chip, Input } from "@/components/ui"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import { getUiActionPolicy, useUiRole, type IUiActionPolicy } from "@/lib/permissions/ui-policy"

type TTeamMemberRole = "admin" | "developer" | "lead" | "viewer"

interface ITeamMember {
    /** Уникальный идентификатор участника в пределах команды. */
    readonly id: string
    /** Отображаемое имя участника. */
    readonly name: string
    /** Рабочий email участника. */
    readonly email: string
    /** Роль участника внутри команды. */
    readonly role: TTeamMemberRole
}

interface ITeamState {
    /** Уникальный идентификатор команды. */
    readonly id: string
    /** Название команды. */
    readonly name: string
    /** Краткое описание команды. */
    readonly description: string
    /** Назначенные репозитории. */
    readonly repositories: ReadonlyArray<string>
    /** Участники команды. */
    readonly members: ReadonlyArray<ITeamMember>
}

const ROLE_OPTIONS: ReadonlyArray<TTeamMemberRole> = ["viewer", "developer", "lead", "admin"]
const AVAILABLE_REPOSITORIES: ReadonlyArray<string> = [
    "api-gateway",
    "review-pipeline",
    "ui-dashboard",
    "analytics-worker",
    "mobile-app",
]

const INITIAL_TEAMS: ReadonlyArray<ITeamState> = [
    {
        description: "Поддерживает UI, design system и onboarding flow.",
        id: "team-1",
        members: [
            {
                email: "mila@acme.dev",
                id: "team-1-member-1",
                name: "Mila Davletova",
                role: "lead",
            },
            {
                email: "oliver@acme.dev",
                id: "team-1-member-2",
                name: "Oliver Stone",
                role: "developer",
            },
        ],
        name: "Platform UX",
        repositories: ["ui-dashboard", "mobile-app"],
    },
    {
        description: "Отвечает за качество review-аналитики и baseline правил.",
        id: "team-2",
        members: [
            {
                email: "ari@acme.dev",
                id: "team-2-member-1",
                name: "Ari Karimov",
                role: "admin",
            },
        ],
        name: "Review Enablement",
        repositories: ["review-pipeline", "analytics-worker"],
    },
]

function isValidEmail(value: string): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

function createTeamId(name: string): string {
    return `team-${name.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`
}

function createMemberDisplayName(email: string): string {
    const localPart = email.split("@")[0] ?? "new member"
    const normalized = localPart
        .split(/[._-]/g)
        .filter((chunk): boolean => chunk.length > 0)
        .map((chunk): string => `${chunk[0]?.toUpperCase() ?? ""}${chunk.slice(1)}`)
        .join(" ")

    return normalized.length > 0 ? normalized : "New Member"
}

function mapRoleChipColor(role: TTeamMemberRole): "default" | "primary" | "success" | "warning" {
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

function updateTeamById(
    teams: ReadonlyArray<ITeamState>,
    teamId: string,
    updater: (team: ITeamState) => ITeamState,
): ReadonlyArray<ITeamState> {
    return teams.map((team): ITeamState => {
        if (team.id !== teamId) {
            return team
        }
        return updater(team)
    })
}

function hasMemberWithEmail(team: ITeamState, email: string): boolean {
    return team.members.some(
        (member): boolean => member.email.toLowerCase() === email.toLowerCase(),
    )
}

function TeamDirectoryCard(props: {
    readonly teams: ReadonlyArray<ITeamState>
    readonly activeTeamId: string
    readonly onTeamSelect: (teamId: string) => void
}): ReactElement {
    const { t } = useTranslation(["settings"])

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:team.teams")}</p>
            </CardHeader>
            <CardBody className="space-y-2">
                {props.teams.map((team): ReactElement => {
                    const isActive = props.activeTeamId === team.id

                    return (
                        <button
                            key={team.id}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                isActive
                                    ? "border-primary bg-[color:color-mix(in_oklab,var(--primary)_12%,var(--surface))]"
                                    : "border-border bg-surface"
                            }`}
                            type="button"
                            onClick={(): void => {
                                props.onTeamSelect(team.id)
                            }}
                        >
                            <p className="text-sm font-semibold text-foreground">{team.name}</p>
                            <p className="text-xs text-text-secondary">{team.description}</p>
                            <p className="mt-1 text-xs text-text-secondary">
                                {t("settings:team.membersCount", { count: team.members.length, repos: team.repositories.length })}
                            </p>
                        </button>
                    )
                })}
            </CardBody>
        </Card>
    )
}

function TeamMembersCard(props: {
    readonly team: ITeamState
    readonly inviteEmail: string
    readonly inviteRole: TTeamMemberRole
    readonly invitePolicy: IUiActionPolicy
    readonly onInviteEmailChange: (value: string) => void
    readonly onInviteRoleChange: (role: TTeamMemberRole) => void
    readonly onInviteMember: () => void
    readonly onRoleUpdate: (memberId: string, role: TTeamMemberRole) => void
    readonly roleManagementPolicy: IUiActionPolicy
}): ReactElement {
    const { t } = useTranslation(["settings"])
    const isInviteDisabled = props.invitePolicy.visibility !== "enabled"
    const isRoleManagementHidden = props.roleManagementPolicy.visibility === "hidden"
    const isRoleManagementDisabled = props.roleManagementPolicy.visibility === "disabled"

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:team.members")}</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Input
                        label={t("settings:team.inviteMemberByEmail")}
                        placeholder="new.member@acme.dev"
                        value={props.inviteEmail}
                        onValueChange={props.onInviteEmailChange}
                    />
                    <select
                        aria-label="Invite role"
                        className={NATIVE_FORM.select}
                        id="team-invite-role"
                        value={props.inviteRole}
                        onChange={(event): void => {
                            const nextRole = event.currentTarget.value
                            if (
                                nextRole === "viewer" ||
                                nextRole === "developer" ||
                                nextRole === "lead" ||
                                nextRole === "admin"
                            ) {
                                props.onInviteRoleChange(nextRole)
                            }
                        }}
                    >
                        {ROLE_OPTIONS.map(
                            (role): ReactElement => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ),
                        )}
                    </select>
                    <div className="flex items-end">
                        <Button
                            className="w-full md:w-auto"
                            isDisabled={isInviteDisabled}
                            onPress={props.onInviteMember}
                        >
                            {t("settings:team.addMember")}
                        </Button>
                    </div>
                </div>
                {props.invitePolicy.reason === undefined || isInviteDisabled === false ? null : (
                    <p className="text-xs text-text-secondary">
                        {t("settings:team.invitePolicy", { reason: props.invitePolicy.reason })}
                    </p>
                )}

                <ul aria-label={`Members in ${props.team.name}`} className="space-y-2">
                    {props.team.members.map(
                        (member): ReactElement => (
                            <li
                                key={member.id}
                                className="rounded-lg border border-border bg-surface p-3"
                            >
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-text-secondary">
                                            {member.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Chip
                                            color={mapRoleChipColor(member.role)}
                                            size="sm"
                                            variant="flat"
                                        >
                                            {member.role}
                                        </Chip>
                                        {isRoleManagementHidden ? null : (
                                            <select
                                                aria-label={`Role for member ${member.email}`}
                                                className={NATIVE_FORM.select}
                                                disabled={isRoleManagementDisabled}
                                                id={`member-role-${member.id}`}
                                                value={member.role}
                                                onChange={(event): void => {
                                                    const nextRole = event.currentTarget.value
                                                    if (
                                                        nextRole === "viewer" ||
                                                        nextRole === "developer" ||
                                                        nextRole === "lead" ||
                                                        nextRole === "admin"
                                                    ) {
                                                        props.onRoleUpdate(member.id, nextRole)
                                                    }
                                                }}
                                            >
                                                {ROLE_OPTIONS.map(
                                                    (role): ReactElement => (
                                                        <option key={role} value={role}>
                                                            {role}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ),
                    )}
                </ul>
                {props.roleManagementPolicy.reason === undefined ||
                isRoleManagementHidden ? null : (
                    <p className="text-xs text-text-secondary">
                        {t("settings:team.rolePolicy", { reason: props.roleManagementPolicy.reason })}
                    </p>
                )}
            </CardBody>
        </Card>
    )
}

function TeamRepositoriesCard(props: {
    readonly assignmentPolicy: IUiActionPolicy
    readonly team: ITeamState
    readonly repositories: ReadonlyArray<string>
    readonly onRepositoryToggle: (repository: string, isSelected: boolean) => void
}): ReactElement {
    const { t } = useTranslation(["settings"])
    const isAssignmentDisabled = props.assignmentPolicy.visibility !== "enabled"

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:team.repositoryAssignment")}</p>
            </CardHeader>
            <CardBody className="space-y-2">
                {props.repositories.map((repository): ReactElement => {
                    const isSelected = props.team.repositories.includes(repository)

                    return (
                        <label
                            key={repository}
                            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                        >
                            <input
                                checked={isSelected}
                                className="h-4 w-4 accent-primary"
                                disabled={isAssignmentDisabled}
                                type="checkbox"
                                onChange={(event): void => {
                                    props.onRepositoryToggle(
                                        repository,
                                        event.currentTarget.checked,
                                    )
                                }}
                            />
                            <span>{repository}</span>
                        </label>
                    )
                })}
                {props.assignmentPolicy.reason === undefined ||
                isAssignmentDisabled === false ? null : (
                    <p className="text-xs text-text-secondary">
                        {t("settings:team.repositoryPolicy", { reason: props.assignmentPolicy.reason })}
                    </p>
                )}
            </CardBody>
        </Card>
    )
}

/**
 * Страница управления командами.
 *
 * @returns UI для создания команд, назначения участников и репозиториев.
 */
export function SettingsTeamPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const activeUiRole = useUiRole()
    const [teams, setTeams] = useState<ReadonlyArray<ITeamState>>(INITIAL_TEAMS)
    const [activeTeamId, setActiveTeamId] = useState(INITIAL_TEAMS[0]?.id ?? "")
    const [newTeamName, setNewTeamName] = useState("")
    const [newTeamDescription, setNewTeamDescription] = useState("")
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<TTeamMemberRole>("developer")

    const activeTeam = useMemo(
        (): ITeamState | undefined => teams.find((team): boolean => team.id === activeTeamId),
        [activeTeamId, teams],
    )
    const createTeamPolicy = useMemo((): IUiActionPolicy => {
        return getUiActionPolicy(activeUiRole, "team.create")
    }, [activeUiRole])
    const invitePolicy = useMemo((): IUiActionPolicy => {
        return getUiActionPolicy(activeUiRole, "team.invite")
    }, [activeUiRole])
    const roleManagementPolicy = useMemo((): IUiActionPolicy => {
        return getUiActionPolicy(activeUiRole, "team.role.manage")
    }, [activeUiRole])
    const assignmentPolicy = useMemo((): IUiActionPolicy => {
        return getUiActionPolicy(activeUiRole, "team.repo.assign")
    }, [activeUiRole])

    const handleCreateTeam = (): void => {
        if (createTeamPolicy.visibility !== "enabled") {
            showToastError(createTeamPolicy.reason ?? t("settings:team.toast.teamCreationRestricted"))
            return
        }

        const normalizedName = newTeamName.trim()
        if (normalizedName.length < 3) {
            showToastError(t("settings:team.toast.teamNameTooShort"))
            return
        }

        const duplicateExists = teams.some(
            (team): boolean => team.name.toLowerCase() === normalizedName.toLowerCase(),
        )
        if (duplicateExists === true) {
            showToastError(t("settings:team.toast.teamNameDuplicate"))
            return
        }

        const nextTeam: ITeamState = {
            description: newTeamDescription.trim(),
            id: createTeamId(normalizedName),
            members: [],
            name: normalizedName,
            repositories: [],
        }

        setTeams((previous): ReadonlyArray<ITeamState> => [nextTeam, ...previous])
        setActiveTeamId(nextTeam.id)
        setNewTeamName("")
        setNewTeamDescription("")
        showToastSuccess(t("settings:team.toast.teamCreated", { name: nextTeam.name }))
    }

    const handleInviteMember = (): void => {
        if (invitePolicy.visibility !== "enabled") {
            showToastError(invitePolicy.reason ?? t("settings:team.toast.memberInviteRestricted"))
            return
        }

        if (activeTeam === undefined) {
            showToastError(t("settings:team.toast.selectTeamFirst"))
            return
        }

        const normalizedEmail = inviteEmail.trim().toLowerCase()
        if (isValidEmail(normalizedEmail) !== true) {
            showToastError(t("settings:team.toast.invalidEmail"))
            return
        }
        if (hasMemberWithEmail(activeTeam, normalizedEmail) === true) {
            showToastError(t("settings:team.toast.memberAlreadyExists"))
            return
        }

        const nextMember: ITeamMember = {
            email: normalizedEmail,
            id: `${activeTeam.id}-member-${Date.now().toString(36)}`,
            name: createMemberDisplayName(normalizedEmail),
            role: inviteRole,
        }

        setTeams(
            (previous): ReadonlyArray<ITeamState> =>
                updateTeamById(
                    previous,
                    activeTeam.id,
                    (team): ITeamState => ({
                        ...team,
                        members: [...team.members, nextMember],
                    }),
                ),
        )
        setInviteEmail("")
        showToastSuccess(t("settings:team.toast.memberAdded", { email: nextMember.email, team: activeTeam.name }))
    }

    const handleRoleUpdate = (memberId: string, role: TTeamMemberRole): void => {
        if (roleManagementPolicy.visibility !== "enabled") {
            showToastError(
                roleManagementPolicy.reason ?? t("settings:team.toast.roleUpdateRestricted"),
            )
            return
        }

        if (activeTeam === undefined) {
            return
        }

        setTeams(
            (previous): ReadonlyArray<ITeamState> =>
                updateTeamById(
                    previous,
                    activeTeam.id,
                    (team): ITeamState => ({
                        ...team,
                        members: team.members.map((member): ITeamMember => {
                            if (member.id !== memberId) {
                                return member
                            }
                            return {
                                ...member,
                                role,
                            }
                        }),
                    }),
                ),
        )
        showToastInfo(t("settings:team.toast.memberRoleUpdated"))
    }

    const handleRepositoryToggle = (repository: string, isSelected: boolean): void => {
        if (assignmentPolicy.visibility !== "enabled") {
            showToastError(
                assignmentPolicy.reason ?? t("settings:team.toast.repositoryAssignmentRestricted"),
            )
            return
        }

        if (activeTeam === undefined) {
            return
        }

        setTeams(
            (previous): ReadonlyArray<ITeamState> =>
                updateTeamById(previous, activeTeam.id, (team): ITeamState => {
                    const currentlySelected = team.repositories.includes(repository)
                    if (isSelected === currentlySelected) {
                        return team
                    }

                    const nextRepositories =
                        isSelected === true
                            ? [...team.repositories, repository]
                            : team.repositories.filter((item): boolean => item !== repository)

                    return {
                        ...team,
                        repositories: nextRepositories,
                    }
                }),
        )
        showToastInfo(t("settings:team.toast.repositoryAssignmentUpdated", { name: activeTeam.name }))
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>{t("settings:team.pageTitle")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                {t("settings:team.pageSubtitle")}
            </p>
            <Alert color="primary" title={t("settings:team.rbacPreviewRole", { role: activeUiRole })} variant="flat">
                {t("settings:team.rbacDescription")}
            </Alert>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:team.createTeam")}</p>
                </CardHeader>
                <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Input
                        label={t("settings:team.teamName")}
                        placeholder={t("settings:team.teamNamePlaceholder")}
                        value={newTeamName}
                        onValueChange={setNewTeamName}
                    />
                    <Input
                        label={t("settings:team.description")}
                        placeholder={t("settings:team.descriptionPlaceholder")}
                        value={newTeamDescription}
                        onValueChange={setNewTeamDescription}
                    />
                    {createTeamPolicy.visibility === "hidden" ? null : (
                        <div className="flex items-end">
                            <Button
                                className="w-full md:w-auto"
                                isDisabled={createTeamPolicy.visibility === "disabled"}
                                onPress={handleCreateTeam}
                            >
                                {t("settings:team.createTeam")}
                            </Button>
                        </div>
                    )}
                </CardBody>
            </Card>
            {createTeamPolicy.reason === undefined ||
            createTeamPolicy.visibility === "enabled" ? null : (
                <p className="text-xs text-text-secondary">
                    {t("settings:team.createTeamPolicy", { reason: createTeamPolicy.reason })}
                </p>
            )}

            {activeTeam === undefined ? (
                <Alert color="warning" title={t("settings:team.noActiveTeamTitle")} variant="flat">
                    {t("settings:team.noActiveTeamDescription")}
                </Alert>
            ) : (
                <Alert color="primary" title={t("settings:team.activeTeamTitle", { name: activeTeam.name })} variant="flat">
                    {t("settings:team.activeTeamDescription", { members: activeTeam.members.length, repos: activeTeam.repositories.length })}
                </Alert>
            )}

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <TeamDirectoryCard
                    activeTeamId={activeTeamId}
                    teams={teams}
                    onTeamSelect={setActiveTeamId}
                />
                {activeTeam === undefined ? null : (
                    <div className="space-y-4">
                        <TeamMembersCard
                            inviteEmail={inviteEmail}
                            inviteRole={inviteRole}
                            invitePolicy={invitePolicy}
                            team={activeTeam}
                            onInviteEmailChange={setInviteEmail}
                            onInviteMember={handleInviteMember}
                            onInviteRoleChange={setInviteRole}
                            onRoleUpdate={handleRoleUpdate}
                            roleManagementPolicy={roleManagementPolicy}
                        />
                        <TeamRepositoriesCard
                            assignmentPolicy={assignmentPolicy}
                            repositories={AVAILABLE_REPOSITORIES}
                            team={activeTeam}
                            onRepositoryToggle={handleRepositoryToggle}
                        />
                    </div>
                )}
            </div>
        </section>
    )
}
