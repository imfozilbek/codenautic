import { http, HttpResponse } from "msw"
import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "../../../utils/render"
import { server } from "../../../mocks/server"
import {
    DEFAULT_ADMIN_PERMISSIONS,
    isPermissionEnabled,
    usePermissionsQuery,
    type IPermissionsQueryState,
} from "@/lib/hooks/queries/use-permissions-query"
import { PERMISSION_KEYS } from "@/lib/permissions/permissions"

function PermissionsProbe({ roles }: { readonly roles: ReadonlyArray<string> }): React.JSX.Element {
    const query = usePermissionsQuery({
        roles,
    })

    if (query.isPending === true) {
        return <div data-testid="permissions-status">pending</div>
    }

    if (query.error !== null) {
        return <div data-testid="permissions-status">error</div>
    }

    return (
        <div>
            <div data-testid="permissions">
                {query.data?.permissions.join(",") ?? "empty"}
            </div>
            <div data-testid="review-read-enabled">
                {isPermissionEnabled(query, PERMISSION_KEYS.reviewRead).toString()}
            </div>
            <div data-testid="admin-permissions">
                {DEFAULT_ADMIN_PERMISSIONS.join(",")}
            </div>
        </div>
    )
}

function createQueryState(
    overrides: Partial<IPermissionsQueryState> = {},
): IPermissionsQueryState {
    return {
        data: undefined,
        error: null,
        isPending: false,
        ...overrides,
    }
}

describe("isPermissionEnabled", (): void => {
    it("возвращает true, если permission присутствует и нет ошибки", (): void => {
        const isEnabled = isPermissionEnabled(
            createQueryState({
                data: {
                    permissions: [PERMISSION_KEYS.reviewRead],
                },
            }),
            PERMISSION_KEYS.reviewRead,
        )

        expect(isEnabled).toBe(true)
    })

    it("возвращает false во время pending", (): void => {
        const isEnabled = isPermissionEnabled(
            createQueryState({
                isPending: true,
                data: {
                    permissions: [PERMISSION_KEYS.reviewRead],
                },
            }),
            PERMISSION_KEYS.reviewRead,
        )

        expect(isEnabled).toBe(false)
    })

    it("возвращает false при ошибке backend", (): void => {
        const isEnabled = isPermissionEnabled(
            createQueryState({
                error: new Error("permissions endpoint unavailable"),
                data: {
                    permissions: [PERMISSION_KEYS.reviewRead],
                },
            }),
            PERMISSION_KEYS.reviewRead,
        )

        expect(isEnabled).toBe(false)
    })

    it("возвращает false при отсутствии permission", (): void => {
        const isEnabled = isPermissionEnabled(
            createQueryState({
                data: {
                    permissions: [],
                },
            }),
            PERMISSION_KEYS.reviewRead,
        )

        expect(isEnabled).toBe(false)
    })
})

describe("usePermissionsQuery", (): void => {
    it("нормализует роли и повторно использует кэш для того же role key", async (): Promise<void> => {
        const requestRoles: string[] = []
        server.use(
            http.get("http://localhost:3000/api/v1/permissions", ({ request }) => {
                const role = new URL(request.url).searchParams.get("role")
                requestRoles.push(role ?? "anonymous")
                return HttpResponse.json({
                    permissions: [PERMISSION_KEYS.reviewRead],
                })
            }),
        )

        const renderResult = renderWithProviders(<PermissionsProbe roles={["Admin", "Reviewer"]} />)
        expect(renderResult.getByTestId("permissions-status").textContent).toBe("pending")

        const permissions = await screen.findByTestId("permissions")
        expect(permissions.textContent).toBe("review:read")
        expect(renderResult.getByTestId("review-read-enabled").textContent).toBe("true")
        expect(requestRoles).toEqual(["admin|reviewer"])

        renderResult.rerender(<PermissionsProbe roles={["reviewer", "admin"]} />)
        expect(requestRoles).toHaveLength(1)
    })

    it("перезапрашивает permissions при смене role key", async (): Promise<void> => {
        const requestRoles: string[] = []
        const requestByRole: Record<string, string[]> = {
            admin: [PERMISSION_KEYS.reviewRead],
            guest: [PERMISSION_KEYS.settingsRead],
        }

        server.use(
            http.get("http://localhost:3000/api/v1/permissions", ({ request }) => {
                const role = new URL(request.url).searchParams.get("role") ?? "anonymous"
                requestRoles.push(role)

                return HttpResponse.json({
                    permissions: requestByRole[role] ?? [],
                })
            }),
        )

        const renderResult = renderWithProviders(<PermissionsProbe roles={["admin"]} />)
        const initialPermissions = await screen.findByTestId("permissions")
        expect(initialPermissions.textContent).toBe("review:read")
        renderResult.rerender(<PermissionsProbe roles={["guest"]} />)
        const guestPermissions = await screen.findByTestId("permissions")
        expect(guestPermissions.textContent).toBe("settings:read")
        renderResult.rerender(<PermissionsProbe roles={["admin"]} />)
        const restoredPermissions = await screen.findByTestId("permissions")
        expect(restoredPermissions.textContent).toBe("review:read")

        expect(requestRoles[0]).toBe("admin")
        expect(requestRoles).toContain("guest")
        expect(requestRoles[requestRoles.length - 1]).toBe("admin")
        expect(requestRoles.length).toBeGreaterThan(2)
    })
})
