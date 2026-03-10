import { type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardBody, CardHeader, Input, Textarea } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

interface ISamlConfigState {
    /** SAML Entity ID (SP). */
    readonly entityId: string
    /** URL IdP SSO endpoint. */
    readonly ssoUrl: string
    /** X.509 certificate body. */
    readonly x509Certificate: string
}

interface IOidcConfigState {
    /** OIDC issuer URL. */
    readonly issuerUrl: string
    /** Client identifier. */
    readonly clientId: string
    /** Client secret (masked in UI). */
    readonly clientSecret: string
}

interface ISsoTestState {
    /** Провайдер теста. */
    readonly provider: "oidc" | "saml"
    /** Результат теста. */
    readonly status: "failed" | "passed"
    /** Сообщение результата. */
    readonly message: string
}

const INITIAL_SAML_CONFIG: ISamlConfigState = {
    entityId: "urn:codenautic:sp:acme",
    ssoUrl: "https://idp.acme.dev/sso/saml",
    x509Certificate: "-----BEGIN CERTIFICATE-----\nMIIC...acme...prod\n-----END CERTIFICATE-----",
}

const INITIAL_OIDC_CONFIG: IOidcConfigState = {
    clientId: "codenautic-web",
    clientSecret: "",
    issuerUrl: "https://auth.acme.dev/realms/platform",
}

function hasSamlRequiredConfig(config: ISamlConfigState): boolean {
    const hasEntityId = config.entityId.trim().length > 0
    const hasSsoUrl = config.ssoUrl.trim().startsWith("https://")
    const hasCertificate = config.x509Certificate.trim().length > 0

    return hasEntityId && hasSsoUrl && hasCertificate
}

function hasOidcRequiredConfig(config: IOidcConfigState): boolean {
    const hasIssuer = config.issuerUrl.trim().startsWith("https://")
    const hasClientId = config.clientId.trim().length > 0
    const hasClientSecret = config.clientSecret.trim().length >= 8

    return hasIssuer && hasClientId && hasClientSecret
}

function getMaskedSecret(secret: string, notConfiguredLabel: string): string {
    if (secret.trim().length === 0) {
        return notConfiguredLabel
    }

    return "••••••••"
}

/**
 * Страница управления SAML/OIDC настройками.
 *
 * @returns UI-конфигурация SSO с проверкой валидности и тестом подключения.
 */
export function SettingsSsoPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const [samlConfig, setSamlConfig] = useState<ISamlConfigState>(INITIAL_SAML_CONFIG)
    const [oidcConfig, setOidcConfig] = useState<IOidcConfigState>(INITIAL_OIDC_CONFIG)
    const [isSamlSaved, setIsSamlSaved] = useState(false)
    const [isOidcSaved, setIsOidcSaved] = useState(false)
    const [testState, setTestState] = useState<ISsoTestState | undefined>(undefined)

    const handleSaveSaml = (): void => {
        if (hasSamlRequiredConfig(samlConfig) !== true) {
            showToastError(t("settings:sso.toast.samlConfigInvalid"))
            return
        }

        setIsSamlSaved(true)
        showToastSuccess(t("settings:sso.toast.samlConfigSaved"))
    }

    const handleSaveOidc = (): void => {
        if (hasOidcRequiredConfig(oidcConfig) !== true) {
            showToastError(t("settings:sso.toast.oidcConfigInvalid"))
            return
        }

        setIsOidcSaved(true)
        showToastSuccess(t("settings:sso.toast.oidcConfigSaved"))
    }

    const handleTestSso = (provider: "oidc" | "saml"): void => {
        const isValid =
            provider === "saml"
                ? hasSamlRequiredConfig(samlConfig)
                : hasOidcRequiredConfig(oidcConfig)

        if (isValid) {
            const nextState: ISsoTestState = {
                message: t("settings:sso.toast.ssoTestPassedMessage", { provider }),
                provider,
                status: "passed",
            }
            setTestState(nextState)
            showToastSuccess(t("settings:sso.toast.ssoTestPassed"))
            return
        }

        const failedState: ISsoTestState = {
            message: t("settings:sso.toast.ssoTestFailedMessage", { provider }),
            provider,
            status: "failed",
        }
        setTestState(failedState)
        showToastInfo(t("settings:sso.toast.ssoTestFailed"))
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>{t("settings:sso.pageTitle")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>{t("settings:sso.pageSubtitle")}</p>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:sso.samlConfiguration")}
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <Input
                            label={t("settings:sso.samlEntityId")}
                            placeholder="urn:codenautic:sp:acme"
                            value={samlConfig.entityId}
                            onValueChange={(value): void => {
                                setSamlConfig(
                                    (previous): ISamlConfigState => ({
                                        ...previous,
                                        entityId: value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            label={t("settings:sso.samlSsoUrl")}
                            placeholder="https://idp.acme.dev/sso/saml"
                            value={samlConfig.ssoUrl}
                            onValueChange={(value): void => {
                                setSamlConfig(
                                    (previous): ISamlConfigState => ({
                                        ...previous,
                                        ssoUrl: value,
                                    }),
                                )
                            }}
                        />
                        <Textarea
                            label={t("settings:sso.x509Certificate")}
                            minRows={5}
                            placeholder="-----BEGIN CERTIFICATE-----"
                            value={samlConfig.x509Certificate}
                            onValueChange={(value): void => {
                                setSamlConfig(
                                    (previous): ISamlConfigState => ({
                                        ...previous,
                                        x509Certificate: value,
                                    }),
                                )
                            }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onPress={handleSaveSaml}>
                                {t("settings:sso.saveSamlConfig")}
                            </Button>
                            <Button
                                variant="flat"
                                onPress={(): void => {
                                    handleTestSso("saml")
                                }}
                            >
                                {t("settings:sso.testSsoSaml")}
                            </Button>
                        </div>
                        {isSamlSaved ? (
                            <Alert
                                color="success"
                                title={t("settings:sso.samlConfigSavedTitle")}
                                variant="flat"
                            >
                                {t("settings:sso.samlConfigSavedDescription")}
                            </Alert>
                        ) : null}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:sso.oidcConfiguration")}
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <Input
                            label={t("settings:sso.oidcIssuerUrl")}
                            placeholder="https://auth.acme.dev/realms/platform"
                            value={oidcConfig.issuerUrl}
                            onValueChange={(value): void => {
                                setOidcConfig(
                                    (previous): IOidcConfigState => ({
                                        ...previous,
                                        issuerUrl: value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            label={t("settings:sso.oidcClientId")}
                            placeholder="codenautic-web"
                            value={oidcConfig.clientId}
                            onValueChange={(value): void => {
                                setOidcConfig(
                                    (previous): IOidcConfigState => ({
                                        ...previous,
                                        clientId: value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            label={t("settings:sso.oidcClientSecret")}
                            placeholder="client secret"
                            type="password"
                            value={oidcConfig.clientSecret}
                            onValueChange={(value): void => {
                                setOidcConfig(
                                    (previous): IOidcConfigState => ({
                                        ...previous,
                                        clientSecret: value,
                                    }),
                                )
                            }}
                        />
                        <p className="text-xs text-text-secondary">
                            {t("settings:sso.secretPreview", {
                                preview: getMaskedSecret(
                                    oidcConfig.clientSecret,
                                    t("settings:sso.notConfigured"),
                                ),
                            })}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onPress={handleSaveOidc}>
                                {t("settings:sso.saveOidcConfig")}
                            </Button>
                            <Button
                                variant="flat"
                                onPress={(): void => {
                                    handleTestSso("oidc")
                                }}
                            >
                                {t("settings:sso.testSsoOidc")}
                            </Button>
                        </div>
                        {isOidcSaved ? (
                            <Alert
                                color="success"
                                title={t("settings:sso.oidcConfigSavedTitle")}
                                variant="flat"
                            >
                                {t("settings:sso.oidcConfigSavedDescription")}
                            </Alert>
                        ) : null}
                    </CardBody>
                </Card>
            </div>

            {testState === undefined ? null : (
                <Alert
                    color={testState.status === "passed" ? "success" : "warning"}
                    title={
                        testState.status === "passed"
                            ? t("settings:sso.connectivityCheckPassed")
                            : t("settings:sso.connectivityCheckFailed")
                    }
                    variant="flat"
                >
                    {testState.message}
                </Alert>
            )}
        </section>
    )
}
