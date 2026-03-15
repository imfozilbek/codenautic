import type { RequestHandler } from "msw"

import { authHandlers } from "./auth.handlers"
import { providersHandlers } from "./providers.handlers"
import { repoConfigHandlers } from "./repo-config.handlers"
import { reviewsHandlers } from "./reviews.handlers"
import { rulesHandlers } from "./rules.handlers"
import { settingsHandlers } from "./settings.handlers"
import { systemHandlers } from "./system.handlers"
import { workspaceHandlers } from "./workspace.handlers"

/**
 * Все MSW handlers для dev-режима.
 *
 * Каждый домен — отдельный файл с массивом handlers.
 */
export const handlers: ReadonlyArray<RequestHandler> = [
    ...authHandlers,
    ...systemHandlers,
    ...settingsHandlers,
    ...repoConfigHandlers,
    ...rulesHandlers,
    ...providersHandlers,
    ...workspaceHandlers,
    ...reviewsHandlers,
]
