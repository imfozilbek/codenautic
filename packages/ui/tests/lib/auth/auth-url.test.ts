import { afterEach, describe, expect, it, vi } from "vitest"

import {
    getCurrentRelativeUrl,
    getSessionStorageOrUndefined,
    isCurrentPage,
    navigateToPath,
    redirectToAuthorizationUrl,
    resolveAuthRedirectUri,
    resolveBoundaryRoutePath,
    resolveIntendedDestinationPath,
    sanitizeAppDestinationPath,
} from "@/lib/auth/auth-url"

describe("sanitizeAppDestinationPath", (): void => {
    it("when destination is undefined, then returns fallback", (): void => {
        expect(sanitizeAppDestinationPath(undefined, "/dashboard")).toBe("/dashboard")
    })

    it("when destination is empty string, then returns fallback", (): void => {
        expect(sanitizeAppDestinationPath("", "/dashboard")).toBe("/dashboard")
    })

    it("when destination is whitespace only, then returns fallback", (): void => {
        expect(sanitizeAppDestinationPath("   ", "/dashboard")).toBe("/dashboard")
    })

    it("when destination starts with //, then returns fallback (protocol-relative blocked)", (): void => {
        expect(sanitizeAppDestinationPath("//evil.com/attack", "/dashboard")).toBe("/dashboard")
    })

    it("when destination starts with /, then returns destination as-is", (): void => {
        expect(sanitizeAppDestinationPath("/reviews/123", "/dashboard")).toBe("/reviews/123")
    })

    it("when destination is same-origin absolute URL, then extracts path+search+hash", (): void => {
        const origin = window.location.origin
        const result = sanitizeAppDestinationPath(
            `${origin}/settings?tab=general#section`,
            "/dashboard",
        )
        expect(result).toBe("/settings?tab=general#section")
    })

    it("when destination is external origin, then returns fallback", (): void => {
        expect(sanitizeAppDestinationPath("https://evil.com/steal", "/dashboard")).toBe(
            "/dashboard",
        )
    })

    it("when destination is invalid URL, then returns fallback", (): void => {
        expect(sanitizeAppDestinationPath("not-a-url-at-all", "/dashboard")).toBe("/dashboard")
    })

    it("when destination is same-origin URL with // pathname, then returns fallback", (): void => {
        const origin = window.location.origin
        const sameOriginDoubleSlash = `${origin}//evil-path`
        const result = sanitizeAppDestinationPath(sameOriginDoubleSlash, "/dashboard")
        expect(result).toBe("/dashboard")
    })
})

describe("resolveAuthRedirectUri", (): void => {
    it("when given a relative path, then returns full same-origin URL", (): void => {
        const result = resolveAuthRedirectUri("/callback")
        expect(result).toBe(`${window.location.origin}/callback`)
    })

    it("when given an external URL, then sanitizes to fallback and returns same-origin", (): void => {
        const result = resolveAuthRedirectUri("https://evil.com/steal")
        expect(result).toBe(`${window.location.origin}/`)
    })
})

describe("resolveIntendedDestinationPath", (): void => {
    it("when destination is undefined, then returns current relative URL", (): void => {
        const result = resolveIntendedDestinationPath(undefined)
        expect(result).toBe(getCurrentRelativeUrl())
    })

    it("when destination is valid path, then returns that path", (): void => {
        const result = resolveIntendedDestinationPath("/reviews")
        expect(result).toBe("/reviews")
    })
})

describe("getCurrentRelativeUrl", (): void => {
    it("when called, then returns pathname + search + hash of current location", (): void => {
        const result = getCurrentRelativeUrl()
        expect(result).toBe(
            `${window.location.pathname}${window.location.search}${window.location.hash}`,
        )
    })
})

describe("isCurrentPage", (): void => {
    it("when path matches current pathname, then returns true", (): void => {
        expect(isCurrentPage(window.location.pathname)).toBe(true)
    })

    it("when path does not match current pathname, then returns false", (): void => {
        expect(isCurrentPage("/some-other-page-that-does-not-exist")).toBe(false)
    })
})

describe("resolveBoundaryRoutePath", (): void => {
    it("when routePath is provided and valid, then returns that path", (): void => {
        expect(resolveBoundaryRoutePath("/settings")).toBe("/settings")
    })

    it("when routePath is undefined, then returns current pathname as fallback", (): void => {
        expect(resolveBoundaryRoutePath(undefined)).toBe(window.location.pathname)
    })

    it("when routePath starts with //, then returns current pathname as fallback", (): void => {
        expect(resolveBoundaryRoutePath("//evil.com")).toBe(window.location.pathname)
    })
})

describe("redirectToAuthorizationUrl", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("when called, then assigns the authorization URL to window.location", (): void => {
        const assignSpy = vi
            .spyOn(window.location, "assign")
            .mockImplementation((): void => {})

        redirectToAuthorizationUrl("https://oauth.example.com/authorize")

        expect(assignSpy).toHaveBeenCalledTimes(1)
        expect(assignSpy).toHaveBeenCalledWith("https://oauth.example.com/authorize")
    })
})

describe("navigateToPath", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("when called, then assigns the path to window.location", (): void => {
        const assignSpy = vi
            .spyOn(window.location, "assign")
            .mockImplementation((): void => {})

        navigateToPath("/dashboard")

        expect(assignSpy).toHaveBeenCalledTimes(1)
        expect(assignSpy).toHaveBeenCalledWith("/dashboard")
    })
})

describe("getSessionStorageOrUndefined", (): void => {
    it("when sessionStorage is available, then returns it", (): void => {
        const result = getSessionStorageOrUndefined()
        expect(result).toBe(window.sessionStorage)
    })
})
