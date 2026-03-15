import type { RequestHandler } from "msw"

import { adminConfigHandlers } from "./admin-config.handlers"
import { authHandlers } from "./auth.handlers"
import { billingHandlers } from "./billing.handlers"
import { byokHandlers } from "./byok.handlers"
import { codeCityHandlers } from "./code-city.handlers"
import { contractValidationHandlers } from "./contract-validation.handlers"
import { dashboardHandlers } from "./dashboard.handlers"
import { issuesHandlers } from "./issues.handlers"
import { jobsHandlers } from "./jobs.handlers"
import { notificationsHandlers } from "./notifications.handlers"
import { organizationHandlers } from "./organization.handlers"
import { providersHandlers } from "./providers.handlers"
import { repoConfigHandlers } from "./repo-config.handlers"
import { reportsHandlers } from "./reports.handlers"
import { repositoriesHandlers } from "./repositories.handlers"
import { reviewsHandlers } from "./reviews.handlers"
import { rulesHandlers } from "./rules.handlers"
import { settingsHandlers } from "./settings.handlers"
import { ssoHandlers } from "./sso.handlers"
import { systemHandlers } from "./system.handlers"
import { teamsHandlers } from "./teams.handlers"
import { triageHandlers } from "./triage.handlers"
import { webhooksHandlers } from "./webhooks.handlers"
import { workspaceHandlers } from "./workspace.handlers"

/**
 * Все MSW handlers для dev-режима.
 *
 * Каждый домен — отдельный файл с массивом handlers.
 */
export const handlers: ReadonlyArray<RequestHandler> = [
    ...adminConfigHandlers,
    ...authHandlers,
    ...contractValidationHandlers,
    ...dashboardHandlers,
    ...systemHandlers,
    ...settingsHandlers,
    ...repoConfigHandlers,
    ...rulesHandlers,
    ...providersHandlers,
    ...workspaceHandlers,
    ...reviewsHandlers,
    ...reportsHandlers,
    ...repositoriesHandlers,
    ...codeCityHandlers,
    ...issuesHandlers,
    ...notificationsHandlers,
    ...teamsHandlers,
    ...organizationHandlers,
    ...triageHandlers,
    ...byokHandlers,
    ...ssoHandlers,
    ...jobsHandlers,
    ...webhooksHandlers,
    ...billingHandlers,
]
