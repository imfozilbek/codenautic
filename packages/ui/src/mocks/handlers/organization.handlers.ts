import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import { api, generateId } from "./handler-utils"

/**
 * MSW handlers для Organization API.
 *
 * Обрабатывают операции над организацией: профиль, биллинг, участники.
 * Используют OrganizationCollection из mock store для хранения состояния.
 */
export const organizationHandlers = [
    /**
     * GET /organization/profile — возвращает профиль организации.
     */
    http.get(api("/organization/profile"), async () => {
        await delay(60)
        const store = getMockStore()
        const profile = store.organization.getProfile()

        if (profile === undefined) {
            return HttpResponse.json(
                { error: "Organization profile not found" },
                { status: 404 },
            )
        }

        return HttpResponse.json({ profile })
    }),

    /**
     * PATCH /organization/profile — обновляет профиль организации.
     */
    http.patch(api("/organization/profile"), async ({ request }) => {
        await delay(80)
        const store = getMockStore()
        const body = (await request.json()) as {
            readonly name?: string
            readonly slug?: string
            readonly timezone?: string
            readonly domain?: string
        }

        const profile = store.organization.updateProfile(body)

        if (profile === undefined) {
            return HttpResponse.json(
                { error: "Organization profile not found" },
                { status: 404 },
            )
        }

        return HttpResponse.json({ profile })
    }),

    /**
     * GET /organization/members — возвращает список участников организации.
     */
    http.get(api("/organization/members"), async () => {
        await delay(60)
        const store = getMockStore()
        const members = store.organization.listMembers()

        return HttpResponse.json({
            members,
            total: members.length,
        })
    }),

    /**
     * POST /organization/members — приглашает нового участника.
     */
    http.post(api("/organization/members"), async ({ request }) => {
        await delay(80)
        const store = getMockStore()
        const body = (await request.json()) as {
            readonly email: string
            readonly role: string
        }

        const localPart = body.email.split("@")[0] ?? "member"
        const displayName = localPart
            .split(/[._-]/g)
            .filter((chunk: string): boolean => chunk.length > 0)
            .map(
                (chunk: string): string =>
                    `${chunk[0]?.toUpperCase() ?? ""}${chunk.slice(1)}`,
            )
            .join(" ")

        const member = {
            id: generateId("member"),
            name: displayName.length > 0 ? displayName : "New Member",
            email: body.email,
            role: body.role as "admin" | "developer" | "lead" | "viewer",
        }

        store.organization.addMember(member)

        return HttpResponse.json({ member }, { status: 201 })
    }),

    /**
     * PATCH /organization/members/:memberId — обновляет роль участника.
     */
    http.patch(api("/organization/members/:memberId"), async ({ params, request }) => {
        await delay(60)
        const store = getMockStore()
        const memberId = params["memberId"] as string
        const body = (await request.json()) as { readonly role: string }

        const member = store.organization.updateMemberRole(
            memberId,
            body.role as "admin" | "developer" | "lead" | "viewer",
        )

        if (member === undefined) {
            return HttpResponse.json(
                { error: "Member not found", memberId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ member })
    }),

    /**
     * DELETE /organization/members/:memberId — удаляет участника.
     */
    http.delete(api("/organization/members/:memberId"), async ({ params }) => {
        await delay(60)
        const store = getMockStore()
        const memberId = params["memberId"] as string

        const removed = store.organization.removeMember(memberId)

        if (removed !== true) {
            return HttpResponse.json(
                { error: "Member not found", memberId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ removed: true })
    }),

    /**
     * GET /organization/billing — возвращает состояние биллинга.
     */
    http.get(api("/organization/billing"), async () => {
        await delay(60)
        const store = getMockStore()
        const billing = store.organization.getBilling()

        if (billing === undefined) {
            return HttpResponse.json(
                { error: "Billing data not found" },
                { status: 404 },
            )
        }

        return HttpResponse.json({ billing })
    }),

    /**
     * PATCH /organization/billing/plan — обновляет тарифный план.
     */
    http.patch(api("/organization/billing/plan"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as { readonly plan: string }

        const billing = store.organization.updateBilling({
            plan: body.plan as "enterprise" | "pro" | "starter",
            status: body.plan === "starter" ? "trial" : undefined,
        })

        if (billing === undefined) {
            return HttpResponse.json(
                { error: "Billing data not found" },
                { status: 404 },
            )
        }

        return HttpResponse.json({ billing })
    }),
]
