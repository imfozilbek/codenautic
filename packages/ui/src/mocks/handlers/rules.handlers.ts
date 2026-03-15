import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import type { ICreateRuleData, IUpdateRuleData } from "../store/collections/rules-collection"
import { api, extractSearchQuery } from "./handler-utils"

/**
 * MSW handlers для custom rules API.
 *
 * Обрабатывают CRUD-операции над правилами пайплайна.
 * Используют RulesCollection из mock store для хранения состояния.
 */
export const rulesHandlers = [
    /**
     * GET /rules — возвращает список правил с опциональным поиском.
     */
    http.get(api("/rules"), async ({ request }) => {
        await delay(80)
        const store = getMockStore()
        const q = extractSearchQuery(request)
        const rules = store.rules.listRules(q.length > 0 ? q : undefined)

        return HttpResponse.json({
            rules,
            total: rules.length,
        })
    }),

    /**
     * POST /rules — создаёт новое правило.
     */
    http.post(api("/rules"), async ({ request }) => {
        await delay(120)
        const store = getMockStore()
        const body = (await request.json()) as ICreateRuleData

        const created = store.rules.createRule(body)
        return HttpResponse.json(created, { status: 201 })
    }),

    /**
     * GET /rules/:ruleId — возвращает правило по ID.
     */
    http.get(api("/rules/:ruleId"), async ({ params }) => {
        await delay(60)
        const store = getMockStore()
        const ruleId = params["ruleId"] as string
        const rule = store.rules.getRuleById(ruleId)

        if (rule === undefined) {
            return HttpResponse.json(
                { error: "Rule not found", ruleId },
                { status: 404 },
            )
        }

        return HttpResponse.json(rule)
    }),

    /**
     * PUT /rules/:ruleId — обновляет правило по ID.
     */
    http.put(api("/rules/:ruleId"), async ({ params, request }) => {
        await delay(100)
        const store = getMockStore()
        const ruleId = params["ruleId"] as string
        const body = (await request.json()) as IUpdateRuleData

        const updated = store.rules.updateRule(ruleId, body)

        if (updated === undefined) {
            return HttpResponse.json(
                { error: "Rule not found", ruleId },
                { status: 404 },
            )
        }

        return HttpResponse.json(updated)
    }),

    /**
     * DELETE /rules/:ruleId — удаляет правило по ID.
     */
    http.delete(api("/rules/:ruleId"), async ({ params }) => {
        await delay(80)
        const store = getMockStore()
        const ruleId = params["ruleId"] as string
        const removed = store.rules.deleteRule(ruleId)

        if (!removed) {
            return HttpResponse.json(
                { error: "Rule not found", ruleId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ id: ruleId, removed: true })
    }),
]
