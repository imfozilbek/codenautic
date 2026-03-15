import { http, HttpResponse, delay } from "msw"

import type { ISamlConfig, IOidcConfig, TSsoProvider } from "@/lib/api/endpoints/sso.endpoint"

import { getMockStore } from "../store/create-mock-store"
import { api } from "./handler-utils"

/**
 * MSW handlers для SSO API.
 *
 * Обрабатывают операции SAML/OIDC конфигурации: get, update, test connection.
 * Используют SsoCollection из mock store для хранения состояния.
 */
export const ssoHandlers = [
    /**
     * GET /sso/saml — возвращает SAML конфигурацию.
     */
    http.get(api("/sso/saml"), async () => {
        await delay(80)
        const store = getMockStore()
        const saml = store.sso.getSaml()

        return HttpResponse.json({ saml })
    }),

    /**
     * PUT /sso/saml — обновляет SAML конфигурацию.
     */
    http.put(api("/sso/saml"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as ISamlConfig

        const saml = store.sso.updateSaml(body)

        return HttpResponse.json({ saml })
    }),

    /**
     * GET /sso/oidc — возвращает OIDC конфигурацию.
     */
    http.get(api("/sso/oidc"), async () => {
        await delay(80)
        const store = getMockStore()
        const oidc = store.sso.getOidc()

        return HttpResponse.json({ oidc })
    }),

    /**
     * PUT /sso/oidc — обновляет OIDC конфигурацию.
     */
    http.put(api("/sso/oidc"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as IOidcConfig

        const oidc = store.sso.updateOidc(body)

        return HttpResponse.json({ oidc })
    }),

    /**
     * POST /sso/test — тестирует SSO подключение.
     */
    http.post(api("/sso/test"), async ({ request }) => {
        await delay(200)
        const store = getMockStore()
        const body = (await request.json()) as { readonly provider: TSsoProvider }

        const isValid =
            body.provider === "saml"
                ? hasSamlRequiredConfig(store.sso.getSaml())
                : hasOidcRequiredConfig(store.sso.getOidc())

        if (isValid) {
            return HttpResponse.json({
                provider: body.provider,
                status: "passed",
                message: `${body.provider.toUpperCase()} connectivity check passed.`,
            })
        }

        return HttpResponse.json({
            provider: body.provider,
            status: "failed",
            message: `${body.provider.toUpperCase()} configuration is incomplete or invalid.`,
        })
    }),
]

/**
 * Проверяет валидность SAML конфигурации.
 *
 * @param config - SAML конфигурация для проверки.
 * @returns true если конфигурация валидна.
 */
function hasSamlRequiredConfig(config: ISamlConfig): boolean {
    const hasEntityId = config.entityId.trim().length > 0
    const hasSsoUrl = config.ssoUrl.trim().startsWith("https://")
    const hasCertificate = config.x509Certificate.trim().length > 0

    return hasEntityId && hasSsoUrl && hasCertificate
}

/**
 * Проверяет валидность OIDC конфигурации.
 *
 * @param config - OIDC конфигурация для проверки.
 * @returns true если конфигурация валидна.
 */
function hasOidcRequiredConfig(config: IOidcConfig): boolean {
    const hasIssuer = config.issuerUrl.trim().startsWith("https://")
    const hasClientId = config.clientId.trim().length > 0
    const hasClientSecret = config.clientSecret.trim().length >= 8

    return hasIssuer && hasClientId && hasClientSecret
}
