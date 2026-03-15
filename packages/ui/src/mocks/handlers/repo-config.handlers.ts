import { http, HttpResponse, delay } from "msw"

import type { IRepoConfig } from "@/lib/api/endpoints/repo-config.endpoint"

import { getMockStore } from "../store/create-mock-store"
import { api } from "./handler-utils"

/**
 * MSW handlers для конфигурации репозиториев и dry-run.
 *
 * Используют SettingsCollection из mock store для хранения repo configs.
 */
export const repoConfigHandlers = [
    /**
     * GET /repositories/:repoId/config — возвращает конфигурацию репозитория.
     */
    http.get(api("/repositories/:repoId/config"), async ({ params }) => {
        await delay(80)
        const store = getMockStore()
        const repoId = params.repoId as string
        const config = store.settings.getRepoConfig(repoId)

        if (config === undefined) {
            const defaultConfig: IRepoConfig = {
                repositoryId: repoId,
                configYaml: "version: 1\nrules: {}\n",
                ignorePatterns: ["node_modules/", "dist/"],
                reviewMode: "AUTO",
                updatedAt: new Date().toISOString(),
            }
            store.settings.setRepoConfig(repoId, defaultConfig)
            return HttpResponse.json({ config: defaultConfig })
        }

        return HttpResponse.json({ config })
    }),

    /**
     * PUT /repositories/:repoId/config — обновляет конфигурацию репозитория.
     */
    http.put(api("/repositories/:repoId/config"), async ({ params, request }) => {
        await delay(120)
        const store = getMockStore()
        const repoId = params.repoId as string
        const body = (await request.json()) as Partial<Omit<IRepoConfig, "repositoryId">>
        const existing = store.settings.getRepoConfig(repoId)

        const updatedConfig: IRepoConfig = {
            repositoryId: repoId,
            configYaml: body.configYaml ?? existing?.configYaml ?? "version: 1\nrules: {}\n",
            ignorePatterns: body.ignorePatterns !== undefined
                ? [...body.ignorePatterns]
                : existing?.ignorePatterns ?? ["node_modules/", "dist/"],
            reviewMode: body.reviewMode ?? existing?.reviewMode ?? "AUTO",
            updatedAt: new Date().toISOString(),
        }

        store.settings.setRepoConfig(repoId, updatedConfig)
        return HttpResponse.json({ config: updatedConfig })
    }),

    /**
     * POST /repositories/:repoId/dry-run — симулирует dry-run review.
     *
     * Возвращает результат после задержки, имитируя работу pipeline.
     */
    http.post(api("/repositories/:repoId/dry-run"), async ({ params }) => {
        await delay(800)
        const repoId = params.repoId as string

        return HttpResponse.json({
            repositoryId: repoId,
            status: "completed",
            summary: {
                filesAnalyzed: 42,
                issuesFound: 3,
                duration: 1250,
            },
            completedAt: new Date().toISOString(),
        })
    }),
]
