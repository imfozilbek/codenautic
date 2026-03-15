import { type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Input, TextArea } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import { useSso } from "@/lib/hooks/queries/use-sso"

/**
 * Локальное состояние SAML конфигурации для формы.
 */
interface ISamlConfigState {
    /**
     * SAML Entity ID (SP).
     */
    readonly entityId: string
    /**
     * URL IdP SSO endpoint.
     */
    readonly ssoUrl: string
    /**
     * X.509 certificate body.
     */
    readonly x509Certificate: string
}

/**
 * Локальное состояние OIDC конфигурации для формы.
 */
interface IOidcConfigState {
    /**
     * OIDC issuer URL.
     */
    readonly issuerUrl: string
    /**
     * Client identifier.
     */
    readonly clientId: string
    /**
     * Client secret (masked in UI).
     */
    readonly clientSecret: string
}

/**
 * Результат теста SSO подключения.
 */
interface ISsoTestState {
    /**
     * Провайдер теста.
     */
    readonly provider: "oidc" | "saml"
    /**
     * Результат теста.
     */
    readonly status: "failed" | "passed"
    /**
     * Сообщение результата.
     */
    readonly message: string
}

/**
 * Проверяет валидность SAML конфигурации.
 *
 * @param config - SAML конфигурация для проверки.
 * @returns true если конфигурация валидна.
 */
function hasSamlRequiredConfig(config: ISamlConfigState): boolean {
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
function hasOidcRequiredConfig(config: IOidcConfigState): boolean {
    const hasIssuer = config.issuerUrl.trim().startsWith("https://")
    const hasClientId = config.clientId.trim().length > 0
    const hasClientSecret = config.clientSecret.trim().length >= 8

    return hasIssuer && hasClientId && hasClientSecret
}

/**
 * Возвращает маскированное представление секрета.
 *
 * @param secret - Секрет для маскирования.
 * @param notConfiguredLabel - Текст при отсутствии секрета.
 * @returns Маскированная строка или метка отсутствия.
 */
function getMaskedSecret(secret: string, notConfiguredLabel: string): string {
    if (secret.trim().length === 0) {
        return notConfiguredLabel
    }

    return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
}

/**
 * Страница управления SAML/OIDC настройками.
 *
 * @returns UI-конфигурация SSO с проверкой валидности и тестом подключения.
 */
export function SettingsSsoPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const { samlQuery, oidcQuery, updateSaml, updateOidc, testConnection } = useSso()

    const samlData = samlQuery.data?.saml
    const oidcData = oidcQuery.data?.oidc

    const [samlConfig, setSamlConfig] = useState<ISamlConfigState>((): ISamlConfigState => {
        if (samlData !== undefined) {
            return samlData
        }
        return { entityId: "", ssoUrl: "", x509Certificate: "" }
    })
    const [oidcConfig, setOidcConfig] = useState<IOidcConfigState>((): IOidcConfigState => {
        if (oidcData !== undefined) {
            return oidcData
        }
        return { issuerUrl: "", clientId: "", clientSecret: "" }
    })
    const [isSamlSaved, setIsSamlSaved] = useState(false)
    const [isOidcSaved, setIsOidcSaved] = useState(false)
    const [testState, setTestState] = useState<ISsoTestState | undefined>(undefined)

    const handleSaveSaml = (): void => {
        if (hasSamlRequiredConfig(samlConfig) !== true) {
            showToastError(t("settings:sso.toast.samlConfigInvalid"))
            return
        }

        updateSaml.mutate(samlConfig, {
            onSuccess: (): void => {
                setIsSamlSaved(true)
                showToastSuccess(t("settings:sso.toast.samlConfigSaved"))
            },
        })
    }

    const handleSaveOidc = (): void => {
        if (hasOidcRequiredConfig(oidcConfig) !== true) {
            showToastError(t("settings:sso.toast.oidcConfigInvalid"))
            return
        }

        updateOidc.mutate(oidcConfig, {
            onSuccess: (): void => {
                setIsOidcSaved(true)
                showToastSuccess(t("settings:sso.toast.oidcConfigSaved"))
            },
        })
    }

    const handleTestSso = (provider: "oidc" | "saml"): void => {
        testConnection.mutate(
            { provider },
            {
                onSuccess: (response): void => {
                    const nextState: ISsoTestState = {
                        message: response.message,
                        provider: response.provider,
                        status: response.status,
                    }
                    setTestState(nextState)

                    if (response.status === "passed") {
                        showToastSuccess(t("settings:sso.toast.ssoTestPassed"))
                    } else {
                        showToastInfo(t("settings:sso.toast.ssoTestFailed"))
                    }
                },
            },
        )
    }

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]"><div className="space-y-1.5"><h1 className={TYPOGRAPHY.pageTitle}>{t("settings:sso.pageTitle")}</h1><p className={TYPOGRAPHY.bodyMuted}>{t("settings:sso.pageSubtitle")}</p></div><div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:sso.samlConfiguration")}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input
                            aria-label={t("settings:sso.samlEntityId")}
                            placeholder="urn:codenautic:sp:acme"
                            value={samlConfig.entityId}
                            onChange={(e): void => {
                                setSamlConfig(
                                    (previous): ISamlConfigState => ({
                                        ...previous,
                                        entityId: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            aria-label={t("settings:sso.samlSsoUrl")}
                            placeholder="https://idp.acme.dev/sso/saml"
                            value={samlConfig.ssoUrl}
                            onChange={(e): void => {
                                setSamlConfig(
                                    (previous): ISamlConfigState => ({
                                        ...previous,
                                        ssoUrl: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <TextArea
                            aria-label={t("settings:sso.x509Certificate")}
                            className="min-h-[120px]"
                            placeholder="-----BEGIN CERTIFICATE-----"
                            value={samlConfig.x509Certificate}
                            onChange={(e): void => {
                                setSamlConfig(
                                    (previous): ISamlConfigState => ({
                                        ...previous,
                                        x509Certificate: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                isDisabled={updateSaml.isPending}
                                variant="primary"
                                onPress={handleSaveSaml}
                            >
                                {t("settings:sso.saveSamlConfig")}
                            </Button>
                            <Button
                                isDisabled={testConnection.isPending}
                                variant="secondary"
                                onPress={(): void => {
                                    handleTestSso("saml")
                                }}
                            >
                                {t("settings:sso.testSsoSaml")}
                            </Button>
                        </div>
                        {isSamlSaved ? (
                            <Alert status="success">
                                <Alert.Title>{t("settings:sso.samlConfigSavedTitle")}</Alert.Title>
                                <Alert.Description>
                                    {t("settings:sso.samlConfigSavedDescription")}
                                </Alert.Description>
                            </Alert>
                        ) : null}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:sso.oidcConfiguration")}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input
                            aria-label={t("settings:sso.oidcIssuerUrl")}
                            placeholder="https://auth.acme.dev/realms/platform"
                            value={oidcConfig.issuerUrl}
                            onChange={(e): void => {
                                setOidcConfig(
                                    (previous): IOidcConfigState => ({
                                        ...previous,
                                        issuerUrl: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            aria-label={t("settings:sso.oidcClientId")}
                            placeholder="codenautic-web"
                            value={oidcConfig.clientId}
                            onChange={(e): void => {
                                setOidcConfig(
                                    (previous): IOidcConfigState => ({
                                        ...previous,
                                        clientId: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            aria-label={t("settings:sso.oidcClientSecret")}
                            placeholder="client secret"
                            type="password"
                            value={oidcConfig.clientSecret}
                            onChange={(e): void => {
                                setOidcConfig(
                                    (previous): IOidcConfigState => ({
                                        ...previous,
                                        clientSecret: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <p className="text-xs text-muted">
                            {t("settings:sso.secretPreview", {
                                preview: getMaskedSecret(
                                    oidcConfig.clientSecret,
                                    t("settings:sso.notConfigured"),
                                ),
                            })}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                isDisabled={updateOidc.isPending}
                                variant="primary"
                                onPress={handleSaveOidc}
                            >
                                {t("settings:sso.saveOidcConfig")}
                            </Button>
                            <Button
                                isDisabled={testConnection.isPending}
                                variant="secondary"
                                onPress={(): void => {
                                    handleTestSso("oidc")
                                }}
                            >
                                {t("settings:sso.testSsoOidc")}
                            </Button>
                        </div>
                        {isOidcSaved ? (
                            <Alert status="success">
                                <Alert.Title>{t("settings:sso.oidcConfigSavedTitle")}</Alert.Title>
                                <Alert.Description>
                                    {t("settings:sso.oidcConfigSavedDescription")}
                                </Alert.Description>
                            </Alert>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            {testState === undefined ? null : (
                <Alert status={testState.status === "passed" ? "success" : "warning"}>
                    <Alert.Title>
                        {testState.status === "passed"
                            ? t("settings:sso.connectivityCheckPassed")
                            : t("settings:sso.connectivityCheckFailed")}
                    </Alert.Title>
                    <Alert.Description>{testState.message}</Alert.Description>
                </Alert>
            )}
        </div></div>
    )
}
