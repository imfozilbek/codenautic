import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
    IOidcConfig,
    ISamlConfig,
    ISamlConfigResponse,
    IOidcConfigResponse,
    ISsoTestRequest,
    ISsoTestResponse,
} from "@/lib/api/endpoints/sso.endpoint"
import type { IUseSsoResult } from "@/lib/hooks/queries/use-sso"

/**
 * Начальные seed данные SAML.
 */
const DEFAULT_SAML: ISamlConfig = {
    entityId: "urn:codenautic:sp:acme",
    ssoUrl: "https://idp.acme.dev/sso/saml",
    x509Certificate: "-----BEGIN CERTIFICATE-----\nMIIC...acme...prod\n-----END CERTIFICATE-----",
}

/**
 * Начальные seed данные OIDC.
 */
const DEFAULT_OIDC: IOidcConfig = {
    clientId: "codenautic-web",
    clientSecret: "",
    issuerUrl: "https://auth.acme.dev/realms/platform",
}

/**
 * Мутабельный стейт для SSO конфигураций.
 */
const ssoState: { saml: ISamlConfig; oidc: IOidcConfig } = {
    saml: { ...DEFAULT_SAML },
    oidc: { ...DEFAULT_OIDC },
}

/**
 * Проверяет валидность SAML конфигурации.
 *
 * @param config - SAML конфигурация.
 * @returns true если валидна.
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
 * @param config - OIDC конфигурация.
 * @returns true если валидна.
 */
function hasOidcRequiredConfig(config: IOidcConfig): boolean {
    const hasIssuer = config.issuerUrl.trim().startsWith("https://")
    const hasClientId = config.clientId.trim().length > 0
    const hasClientSecret = config.clientSecret.trim().length >= 8

    return hasIssuer && hasClientId && hasClientSecret
}

vi.mock("@/lib/hooks/queries/use-sso", async () => {
    const { useState } = await import("react")

    return {
        useSso: (): IUseSsoResult => {
            const [saml, setSaml] = useState<ISamlConfig>(() => ({ ...ssoState.saml }))
            const [oidc, setOidc] = useState<IOidcConfig>(() => ({ ...ssoState.oidc }))

            return {
                samlQuery: {
                    data: { saml },
                    isLoading: false,
                    isError: false,
                    error: null,
                } as unknown as IUseSsoResult["samlQuery"],
                oidcQuery: {
                    data: { oidc },
                    isLoading: false,
                    isError: false,
                    error: null,
                } as unknown as IUseSsoResult["oidcQuery"],
                updateSaml: {
                    mutate: (
                        data: ISamlConfig,
                        options?: {
                            readonly onSuccess?: (response: ISamlConfigResponse) => void
                        },
                    ): void => {
                        setSaml({ ...data })
                        ssoState.saml = { ...data }
                        if (options?.onSuccess !== undefined) {
                            options.onSuccess({ saml: data })
                        }
                    },
                    isPending: false,
                } as unknown as IUseSsoResult["updateSaml"],
                updateOidc: {
                    mutate: (
                        data: IOidcConfig,
                        options?: {
                            readonly onSuccess?: (response: IOidcConfigResponse) => void
                        },
                    ): void => {
                        setOidc({ ...data })
                        ssoState.oidc = { ...data }
                        if (options?.onSuccess !== undefined) {
                            options.onSuccess({ oidc: data })
                        }
                    },
                    isPending: false,
                } as unknown as IUseSsoResult["updateOidc"],
                testConnection: {
                    mutate: (
                        data: ISsoTestRequest,
                        options?: {
                            readonly onSuccess?: (response: ISsoTestResponse) => void
                        },
                    ): void => {
                        const isValid =
                            data.provider === "saml"
                                ? hasSamlRequiredConfig(ssoState.saml)
                                : hasOidcRequiredConfig(ssoState.oidc)

                        const response: ISsoTestResponse = isValid
                            ? {
                                  provider: data.provider,
                                  status: "passed",
                                  message: `SSO test passed for ${data.provider}.`,
                              }
                            : {
                                  provider: data.provider,
                                  status: "failed",
                                  message: `SSO test failed for ${data.provider}. Check required fields and try again.`,
                              }

                        if (options?.onSuccess !== undefined) {
                            options.onSuccess(response)
                        }
                    },
                    isPending: false,
                } as unknown as IUseSsoResult["testConnection"],
            }
        },
    }
})

import { SettingsSsoPage } from "@/pages/settings-sso.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsSsoPage", (): void => {
    beforeEach((): void => {
        ssoState.saml = { ...DEFAULT_SAML }
        ssoState.oidc = { ...DEFAULT_OIDC }
    })

    it("сохраняет SAML/OIDC конфиг и выполняет test SSO сценарий", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "SSO provider management" }),
        ).not.toBeNull()

        await user.clear(screen.getByRole("textbox", { name: "SAML Entity ID" }))
        await user.type(
            screen.getByRole("textbox", { name: "SAML Entity ID" }),
            "urn:codenautic:sp:enterprise",
        )
        await user.clear(screen.getByRole("textbox", { name: "SAML SSO URL" }))
        await user.type(
            screen.getByRole("textbox", { name: "SAML SSO URL" }),
            "https://idp.enterprise.dev/sso",
        )
        await user.click(screen.getByRole("button", { name: "Save SAML config" }))
        expect(screen.getByText("SAML configuration saved")).not.toBeNull()

        await user.clear(screen.getByLabelText("OIDC client secret"))
        await user.type(screen.getByLabelText("OIDC client secret"), "supersecret")
        await user.click(screen.getByRole("button", { name: "Save OIDC config" }))
        expect(screen.getByText("OIDC configuration saved")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Test SSO (SAML)" }))
        expect(screen.getByText("SSO test passed for saml.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Test SSO (OIDC)" }))
        expect(screen.getByText("SSO test passed for oidc.")).not.toBeNull()
    })

    it("заполняет и сохраняет OIDC конфигурацию", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        await user.clear(screen.getByRole("textbox", { name: "OIDC issuer URL" }))
        await user.type(
            screen.getByRole("textbox", { name: "OIDC issuer URL" }),
            "https://auth.enterprise.dev/realms/main",
        )
        await user.clear(screen.getByRole("textbox", { name: "OIDC client ID" }))
        await user.type(screen.getByRole("textbox", { name: "OIDC client ID" }), "enterprise-app")
        await user.clear(screen.getByLabelText("OIDC client secret"))
        await user.type(screen.getByLabelText("OIDC client secret"), "longsecret123")

        await user.click(screen.getByRole("button", { name: "Save OIDC config" }))

        expect(screen.getByText("OIDC configuration saved")).not.toBeNull()
        expect(
            screen.getByText(
                "OIDC settings passed local validation and are ready for secure sync.",
            ),
        ).not.toBeNull()
    })

    it("показывает ошибку валидации при сохранении SAML с пустым Entity ID", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        await user.clear(screen.getByRole("textbox", { name: "SAML Entity ID" }))
        await user.click(screen.getByRole("button", { name: "Save SAML config" }))

        expect(screen.queryByText("SAML configuration saved")).toBeNull()
    })

    it("показывает ошибку валидации при сохранении OIDC с коротким client secret", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        await user.clear(screen.getByLabelText("OIDC client secret"))
        await user.type(screen.getByLabelText("OIDC client secret"), "short")

        await user.click(screen.getByRole("button", { name: "Save OIDC config" }))

        expect(screen.queryByText("OIDC configuration saved")).toBeNull()
    })

    it("показывает ошибку валидации при сохранении OIDC с пустым client secret", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        await user.click(screen.getByRole("button", { name: "Save OIDC config" }))

        expect(screen.queryByText("OIDC configuration saved")).toBeNull()
    })

    it("тест подключения OIDC проваливается при невалидной конфигурации", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        await user.click(screen.getByRole("button", { name: "Test SSO (OIDC)" }))

        expect(screen.getByText("SSO connectivity check failed")).not.toBeNull()
        expect(
            screen.getByText("SSO test failed for oidc. Check required fields and try again."),
        ).not.toBeNull()
    })

    it("тест подключения SAML проходит с валидной начальной конфигурацией", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        await user.click(screen.getByRole("button", { name: "Test SSO (SAML)" }))

        expect(screen.getByText("SSO connectivity check passed")).not.toBeNull()
        expect(screen.getByText("SSO test passed for saml.")).not.toBeNull()
    })

    it("показывает маскированный секрет после ввода и 'Not configured' при пустом", (): void => {
        renderWithProviders(<SettingsSsoPage />)

        expect(screen.getByText(/Not configured/)).not.toBeNull()
    })

    it("показывает маскированный секрет после ввода значения", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        await user.clear(screen.getByLabelText("OIDC client secret"))
        await user.type(screen.getByLabelText("OIDC client secret"), "mysecretvalue")

        expect(screen.getByText(/••••••••/)).not.toBeNull()
    })

    it("сохранённые значения SAML остаются после сохранения", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsSsoPage />)

        const entityIdInput = screen.getByRole("textbox", { name: "SAML Entity ID" })
        const ssoUrlInput = screen.getByRole("textbox", { name: "SAML SSO URL" })

        await user.clear(entityIdInput)
        await user.type(entityIdInput, "urn:codenautic:sp:custom")
        await user.clear(ssoUrlInput)
        await user.type(ssoUrlInput, "https://custom-idp.dev/sso")

        await user.click(screen.getByRole("button", { name: "Save SAML config" }))
        expect(screen.getByText("SAML configuration saved")).not.toBeNull()

        expect(screen.getByRole("textbox", { name: "SAML Entity ID" })).toHaveValue(
            "urn:codenautic:sp:custom",
        )
        expect(screen.getByRole("textbox", { name: "SAML SSO URL" })).toHaveValue(
            "https://custom-idp.dev/sso",
        )
    })
})
