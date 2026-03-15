import type { ITeam } from "@/lib/api/endpoints/teams.endpoint"

import type { TeamsCollection } from "../collections/teams-collection"

/**
 * Seed-команда: Platform UX.
 */
const TEAM_PLATFORM_UX: ITeam = {
    id: "team-1",
    name: "Platform UX",
    description: "Поддерживает UI, design system и onboarding flow.",
    repositories: ["ui-dashboard", "mobile-app"],
    members: [
        {
            id: "team-1-member-1",
            name: "Trinity",
            email: "trinity@acme.dev",
            role: "lead",
        },
        {
            id: "team-1-member-2",
            name: "Tank",
            email: "oliver@acme.dev",
            role: "developer",
        },
    ],
}

/**
 * Seed-команда: Review Enablement.
 */
const TEAM_REVIEW_ENABLEMENT: ITeam = {
    id: "team-2",
    name: "Review Enablement",
    description: "Отвечает за качество review-аналитики и baseline правил.",
    repositories: ["review-pipeline", "analytics-worker"],
    members: [
        {
            id: "team-2-member-1",
            name: "Neo Anderson",
            email: "neo@acme.dev",
            role: "admin",
        },
    ],
}

/**
 * Начальный набор команд.
 */
const SEED_TEAMS: ReadonlyArray<ITeam> = [TEAM_PLATFORM_UX, TEAM_REVIEW_ENABLEMENT]

/**
 * Заполняет teams-коллекцию начальным набором данных.
 *
 * Загружает 2 команды с участниками и назначенными репозиториями.
 *
 * @param teams - Коллекция команд для заполнения.
 */
export function seedTeams(teams: TeamsCollection): void {
    teams.seed({ teams: SEED_TEAMS })
}
