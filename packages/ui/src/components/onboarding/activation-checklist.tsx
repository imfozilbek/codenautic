import { type ReactElement, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"

type TActivationChecklistRole = "admin" | "developer"

interface IActivationStep {
    /** Идентификатор шага. */
    readonly id: string
    /** Заголовок шага. */
    readonly title: string
    /** Описание шага. */
    readonly description: string
    /** Deep-link на целевой экран. */
    readonly path: string
    /** Требуемая роль для выполнения шага. */
    readonly requiredRole: TActivationChecklistRole
}

interface IActivationChecklistState {
    /** Завершённые шаги. */
    readonly completedStepIds: ReadonlyArray<string>
    /** Скрыт ли checklist пользователем. */
    readonly dismissed: boolean
}

export interface IActivationChecklistProps {
    /** Роль текущего пользователя. */
    readonly role: TActivationChecklistRole
}

const ACTIVATION_STORAGE_KEY = "codenautic:activation-checklist:v1"

const ACTIVATION_STEPS: ReadonlyArray<IActivationStep> = [
    {
        description: "Select provider and verify webhook auth.",
        id: "connect-git",
        path: "/settings-git-providers",
        requiredRole: "admin",
        title: "Connect git provider",
    },
    {
        description: "Set active model and fallback policy.",
        id: "connect-llm",
        path: "/settings-llm-providers",
        requiredRole: "admin",
        title: "Connect LLM provider",
    },
    {
        description: "Invite leads/developers to start review workflow.",
        id: "invite-team",
        path: "/settings-team",
        requiredRole: "admin",
        title: "Invite teammates",
    },
    {
        description: "Enable SSO policy for enterprise access control.",
        id: "configure-sso",
        path: "/settings-sso",
        requiredRole: "admin",
        title: "Configure SSO",
    },
    {
        description: "Run first repository onboarding flow.",
        id: "add-repo",
        path: "/onboarding",
        requiredRole: "developer",
        title: "Add repository",
    },
    {
        description: "Launch baseline scan and collect initial findings.",
        id: "run-first-scan",
        path: "/settings-jobs",
        requiredRole: "developer",
        title: "Run first scan",
    },
    {
        description: "Enable inbox + channel preferences.",
        id: "setup-notifications",
        path: "/settings-notifications",
        requiredRole: "developer",
        title: "Set notifications",
    },
    {
        description: "Apply starter rules and execute dry-run.",
        id: "baseline-rules",
        path: "/settings-rules-library",
        requiredRole: "developer",
        title: "Baseline rules dry-run",
    },
]

function readChecklistState(): IActivationChecklistState {
    if (typeof window === "undefined") {
        return {
            completedStepIds: [],
            dismissed: false,
        }
    }

    const rawState = window.localStorage.getItem(ACTIVATION_STORAGE_KEY)
    if (rawState === null) {
        return {
            completedStepIds: [],
            dismissed: false,
        }
    }

    try {
        const parsed = JSON.parse(rawState) as {
            readonly completedStepIds?: unknown
            readonly dismissed?: unknown
        }
        return {
            completedStepIds: Array.isArray(parsed.completedStepIds)
                ? parsed.completedStepIds.filter(
                      (stepId): stepId is string => typeof stepId === "string",
                  )
                : [],
            dismissed: parsed.dismissed === true,
        }
    } catch (_error: unknown) {
        return {
            completedStepIds: [],
            dismissed: false,
        }
    }
}

function writeChecklistState(nextState: IActivationChecklistState): void {
    if (typeof window === "undefined") {
        return
    }

    window.localStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify(nextState))
}

async function syncChecklistStateToProfileApi(nextState: IActivationChecklistState): Promise<void> {
    try {
        await fetch("/api/v1/user/preferences", {
            body: JSON.stringify({
                activationChecklist: nextState,
            }),
            headers: {
                "Content-Type": "application/json",
            },
            method: "PATCH",
        })
    } catch (_error: unknown) {
        return
    }
}

/**
 * Activation checklist для first value onboarding.
 *
 * @param props Роль текущего пользователя.
 * @returns Role-aware checklist с deep-links и прогрессом.
 */
export function ActivationChecklist(props: IActivationChecklistProps): ReactElement | null {
    const [state, setState] = useState<IActivationChecklistState>(readChecklistState)

    const visibleSteps = useMemo((): ReadonlyArray<IActivationStep> => {
        if (props.role === "admin") {
            return ACTIVATION_STEPS
        }

        return ACTIVATION_STEPS.filter((step): boolean => step.requiredRole === "developer")
    }, [props.role])

    const completedCount = visibleSteps.filter((step): boolean => {
        return state.completedStepIds.includes(step.id)
    }).length
    const progressPercent =
        visibleSteps.length === 0 ? 100 : Math.round((completedCount / visibleSteps.length) * 100)

    const updateState = (nextState: IActivationChecklistState): void => {
        setState(nextState)
        writeChecklistState(nextState)
        void syncChecklistStateToProfileApi(nextState)
    }

    const handleToggleStep = (stepId: string): void => {
        const isCompleted = state.completedStepIds.includes(stepId)
        const nextCompleted = isCompleted
            ? state.completedStepIds.filter((id): boolean => id !== stepId)
            : [...state.completedStepIds, stepId]

        updateState({
            ...state,
            completedStepIds: nextCompleted,
        })
    }

    if (state.dismissed === true) {
        return null
    }

    return (
        <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-foreground">Activation checklist</p>
                <Chip size="sm" variant="flat">
                    Progress: {progressPercent}%
                </Chip>
            </CardHeader>
            <CardBody className="space-y-3">
                <Alert color="primary" title="Path to first value" variant="flat">
                    Complete steps to reach first successful scan and visible insights.
                </Alert>
                <ul aria-label="Activation checklist steps" className="space-y-2">
                    {visibleSteps.map((step): ReactElement => {
                        const isCompleted = state.completedStepIds.includes(step.id)

                        return (
                            <li
                                className="rounded-lg border border-border bg-surface p-3"
                                key={step.id}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-foreground/70">
                                            {step.description}
                                        </p>
                                    </div>
                                    <Chip
                                        color={isCompleted ? "success" : "warning"}
                                        size="sm"
                                        variant="flat"
                                    >
                                        {isCompleted ? "done" : "pending"}
                                    </Chip>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Link
                                        className="rounded-full border border-border px-3 py-1 text-xs text-foreground/80"
                                        to={step.path}
                                    >
                                        Open step
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={(): void => {
                                            handleToggleStep(step.id)
                                        }}
                                    >
                                        {isCompleted ? "Mark pending" : "Mark done"}
                                    </Button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={(): void => {
                            updateState({
                                ...state,
                                dismissed: true,
                            })
                        }}
                    >
                        Dismiss checklist
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}
