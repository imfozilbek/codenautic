import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Chip, Input } from "@heroui/react"
import type { ITeam, ITeamMember, TTeamMemberRole } from "@/lib/api/endpoints/teams.endpoint"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { useTeams } from "@/lib/hooks/queries/use-teams"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import { getUiActionPolicy, useUiRole, type IUiActionPolicy } from "@/lib/permissions/ui-policy"

const ROLE_OPTIONS: ReadonlyArray<TTeamMemberRole> = ["viewer", "developer", "lead", "admin"]
const AVAILABLE_REPOSITORIES: ReadonlyArray<string> = [
    "api-gateway",
    "review-pipeline",
    "ui-dashboard",
    "analytics-worker",
    "mobile-app",
]

/**
 * Проверяет валидность email-адреса.
 *
 * @param value - Строка email для проверки.
 * @returns true если email валиден.
 */
function isValidEmail(value: string): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

/**
 * Определяет цвет Chip по роли участника.
 *
 * @param role - Роль участника.
 * @returns Цвет для HeroUI Chip.
 */
function mapRoleChipColor(role: TTeamMemberRole): "default" | "accent" | "success" | "warning" {
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

/**
 * Проверяет наличие участника с указанным email в команде.
 *
 * @param team - Команда для проверки.
 * @param email - Email для поиска.
 * @returns true если участник с таким email уже есть.
 */
function hasMemberWithEmail(team: ITeam, email: string): boolean {
    return team.members.some(
        (member): boolean => member.email.toLowerCase() === email.toLowerCase(),
    )
}

/**
 * Карточка списка команд с выбором активной.
 *
 * @param props - Свойства компонента.
 * @returns Карточка со списком команд.
 */
function TeamDirectoryCard(props: {
    readonly teams: ReadonlyArray<ITeam>
    readonly activeTeamId: string
    readonly onTeamSelect: (teamId: string) => void
}): ReactElement {
    const { t } = useTranslation(["settings"])

    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>{t("settings:team.teams")}</p>
            </CardHeader>
            <CardContent className="space-y-2">
                {props.teams.map((team): ReactElement => {
                    const isActive = props.activeTeamId === team.id

                    return (
                        <button
                            key={team.id}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                isActive
                                    ? "border-accent bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--surface))]"
                                    : "border-border bg-surface"
                            }`}
                            type="button"
                            onClick={(): void => {
                                props.onTeamSelect(team.id)
                            }}
                        >
                            <p className="text-sm font-semibold text-foreground">{team.name}</p>
                            <p className="text-xs text-muted">{team.description}</p>
                            <p className="mt-1 text-xs text-muted">
                                {t("settings:team.membersCount", {
                                    count: team.members.length,
                                    repos: team.repositories.length,
                                })}
                            </p>
                        </button>
                    )
                })}
            </CardContent>
        </Card>
    )
}

/**
 * Карточка участников команды с приглашением и управлением ролями.
 *
 * @param props - Свойства компонента.
 * @returns Карточка с формой приглашения и списком участников.
 */
function TeamMembersCard(props: {
    readonly team: ITeam
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
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Input
                        aria-label={t("settings:team.inviteMemberByEmail")}
                        placeholder="new.member@acme.dev"
                        value={props.inviteEmail}
                        onChange={(e): void => {
                            props.onInviteEmailChange(e.target.value)
                        }}
                    />
                    <select
                        aria-label={t("settings:ariaLabel.team.inviteRole")}
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
                    <p className="text-xs text-muted">
                        {t("settings:team.invitePolicy", { reason: props.invitePolicy.reason })}
                    </p>
                )}

                <ul aria-label={`Members in ${props.team.name}`} className="space-y-2">
                    {props.team.members.map(
                        (member: ITeamMember): ReactElement => (
                            <li
                                key={member.id}
                                className="rounded-lg border border-border bg-surface p-3"
                            >
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-muted">{member.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Chip
                                            color={mapRoleChipColor(member.role)}
                                            size="sm"
                                            variant="soft"
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
                    <p className="text-xs text-muted">
                        {t("settings:team.rolePolicy", {
                            reason: props.roleManagementPolicy.reason,
                        })}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

/**
 * Карточка назначения репозиториев команде.
 *
 * @param props - Свойства компонента.
 * @returns Карточка с чекбоксами репозиториев.
 */
function TeamRepositoriesCard(props: {
    readonly assignmentPolicy: IUiActionPolicy
    readonly team: ITeam
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
            <CardContent className="space-y-2">
                {props.repositories.map((repository): ReactElement => {
                    const isSelected = props.team.repositories.includes(repository)

                    return (
                        <label
                            key={repository}
                            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                        >
                            <input
                                checked={isSelected}
                                className="h-4 w-4 accent-accent"
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
                    <p className="text-xs text-muted">
                        {t("settings:team.repositoryPolicy", {
                            reason: props.assignmentPolicy.reason,
                        })}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

/**
 * Страница управления командами.
 *
 * Загружает данные через API (useTeams hook) и предоставляет
 * UI для создания команд, назначения участников и репозиториев.
 *
 * @returns UI для управления командами.
 */
export function SettingsTeamPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const activeUiRole = useUiRole()
    const {
        teamsQuery,
        createTeam,
        inviteMember,
        updateMemberRole,
        updateRepositories,
    } = useTeams()

    const teams = teamsQuery.data?.teams ?? []
    const [activeTeamId, setActiveTeamId] = useState("")
    const [newTeamName, setNewTeamName] = useState("")
    const [newTeamDescription, setNewTeamDescription] = useState("")
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<TTeamMemberRole>("developer")

    const resolvedActiveTeamId =
        activeTeamId.length > 0 ? activeTeamId : (teams[0]?.id ?? "")

    const activeTeam = useMemo(
        (): ITeam | undefined =>
            teams.find((team): boolean => team.id === resolvedActiveTeamId),
        [resolvedActiveTeamId, teams],
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
            showToastError(
                createTeamPolicy.reason ?? t("settings:team.toast.teamCreationRestricted"),
            )
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

        createTeam.mutate(
            {
                name: normalizedName,
                description: newTeamDescription.trim(),
            },
            {
                onSuccess: (response): void => {
                    setActiveTeamId(response.team.id)
                    setNewTeamName("")
                    setNewTeamDescription("")
                    showToastSuccess(
                        t("settings:team.toast.teamCreated", { name: response.team.name }),
                    )
                },
            },
        )
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

        inviteMember.mutate(
            {
                teamId: activeTeam.id,
                email: normalizedEmail,
                role: inviteRole,
            },
            {
                onSuccess: (): void => {
                    setInviteEmail("")
                    showToastSuccess(
                        t("settings:team.toast.memberAdded", {
                            email: normalizedEmail,
                            team: activeTeam.name,
                        }),
                    )
                },
            },
        )
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

        updateMemberRole.mutate(
            {
                teamId: activeTeam.id,
                memberId,
                role,
            },
            {
                onSuccess: (): void => {
                    showToastInfo(t("settings:team.toast.memberRoleUpdated"))
                },
            },
        )
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

        const currentlySelected = activeTeam.repositories.includes(repository)
        if (isSelected === currentlySelected) {
            return
        }

        const nextRepositories =
            isSelected === true
                ? [...activeTeam.repositories, repository]
                : activeTeam.repositories.filter((item): boolean => item !== repository)

        updateRepositories.mutate(
            {
                teamId: activeTeam.id,
                repositoryIds: nextRepositories,
            },
            {
                onSuccess: (): void => {
                    showToastInfo(
                        t("settings:team.toast.repositoryAssignmentUpdated", {
                            name: activeTeam.name,
                        }),
                    )
                },
            },
        )
    }

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]"><div className="space-y-1.5"><h1 className={TYPOGRAPHY.pageTitle}>{t("settings:team.pageTitle")}</h1><p className={TYPOGRAPHY.bodyMuted}>{t("settings:team.pageSubtitle")}</p></div><div className="space-y-6">
            <Alert status="accent">
                <Alert.Title>
                    {t("settings:team.rbacPreviewRole", { role: activeUiRole })}
                </Alert.Title>
                <Alert.Description>{t("settings:team.rbacDescription")}</Alert.Description>
            </Alert>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:team.createTeam")}</p>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Input
                        aria-label={t("settings:team.teamName")}
                        placeholder={t("settings:team.teamNamePlaceholder")}
                        value={newTeamName}
                        onChange={(e): void => {
                            setNewTeamName(e.target.value)
                        }}
                    />
                    <Input
                        aria-label={t("settings:team.description")}
                        placeholder={t("settings:team.descriptionPlaceholder")}
                        value={newTeamDescription}
                        onChange={(e): void => {
                            setNewTeamDescription(e.target.value)
                        }}
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
                </CardContent>
            </Card>
            {createTeamPolicy.reason === undefined ||
            createTeamPolicy.visibility === "enabled" ? null : (
                <p className="text-xs text-muted">
                    {t("settings:team.createTeamPolicy", { reason: createTeamPolicy.reason })}
                </p>
            )}

            {activeTeam === undefined ? (
                <Alert status="warning">
                    <Alert.Title>{t("settings:team.noActiveTeamTitle")}</Alert.Title>
                    <Alert.Description>
                        {t("settings:team.noActiveTeamDescription")}
                    </Alert.Description>
                </Alert>
            ) : (
                <Alert status="accent">
                    <Alert.Title>
                        {t("settings:team.activeTeamTitle", { name: activeTeam.name })}
                    </Alert.Title>
                    <Alert.Description>
                        {t("settings:team.activeTeamDescription", {
                            members: activeTeam.members.length,
                            repos: activeTeam.repositories.length,
                        })}
                    </Alert.Description>
                </Alert>
            )}

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <TeamDirectoryCard
                    activeTeamId={resolvedActiveTeamId}
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
        </div></div>
    )
}
