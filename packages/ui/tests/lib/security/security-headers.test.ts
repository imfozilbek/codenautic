import { describe, expect, it } from "vitest"

import { buildContentSecurityPolicy, createSecurityHeaders } from "@/lib/security/security-headers"

describe("security headers", (): void => {
    it("формирует CSP с обязательными директивами", (): void => {
        const csp = buildContentSecurityPolicy()

        expect(csp.includes("default-src 'self'")).toBe(true)
        expect(csp.includes("script-src 'self' https://mcp.figma.com")).toBe(true)
        expect(csp.includes("frame-ancestors 'none'")).toBe(true)
        expect(csp.includes("object-src 'none'")).toBe(true)
    })

    it("возвращает полный набор security headers", (): void => {
        const headers = createSecurityHeaders()

        expect(headers["X-Frame-Options"]).toBe("DENY")
        expect(headers["X-Content-Type-Options"]).toBe("nosniff")
        expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
        expect(headers["Strict-Transport-Security"].includes("max-age=31536000")).toBe(true)
        expect(headers["Permissions-Policy"].includes("camera=()")).toBe(true)
        expect(headers["Content-Security-Policy"].includes("connect-src 'self'")).toBe(true)
    })
})
