import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import { api } from "./handler-utils"

/**
 * MSW handlers для Repositories API.
 *
 * Обрабатывают операции над репозиториями: list, get by ID, get overview.
 * Используют RepositoriesCollection из mock store для хранения состояния.
 */
export const repositoriesHandlers = [
    /**
     * GET /repositories — возвращает список репозиториев.
     */
    http.get(api("/repositories"), async () => {
        await delay(80)
        const store = getMockStore()
        const repositories = store.repositories.list()

        return HttpResponse.json({
            repositories,
            total: repositories.length,
        })
    }),

    /**
     * GET /repositories/:repositoryId — возвращает репозиторий по ID.
     */
    http.get(api("/repositories/:repositoryId"), async ({ params }) => {
        await delay(60)
        const store = getMockStore()
        const repositoryId = params["repositoryId"] as string

        const repository = store.repositories.getById(repositoryId)

        if (repository === undefined) {
            return HttpResponse.json(
                { error: "Repository not found", repositoryId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ repository })
    }),

    /**
     * GET /repositories/:repositoryId/overview — возвращает overview репозитория.
     */
    http.get(api("/repositories/:repositoryId/overview"), async ({ params }) => {
        await delay(120)
        const store = getMockStore()
        const repositoryId = params["repositoryId"] as string

        const overview = store.repositories.getOverview(repositoryId)

        if (overview === undefined) {
            return HttpResponse.json(
                { error: "Repository overview not found", repositoryId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ overview })
    }),
]
