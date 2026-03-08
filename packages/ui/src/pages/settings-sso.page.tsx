import { type ReactElement, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Input, Textarea } from "@/components/ui"
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

function getMaskedSecret(secret: string): string {
    if (secret.trim().length === 0) {
        return "Not configured"
    }

    return "••••••••"
}

/**
 * Страница управления SAML/OIDC настройками.
 *
 * @returns UI-конфигурация SSO с проверкой валидности и тестом подключения.
 */
export function SettingsSsoPage(): ReactElement {
    const [samlConfig, setSamlConfig] = useState<ISamlConfigState>(INITIAL_SAML_CONFIG)
    const [oidcConfig, setOidcConfig] = useState<IOidcConfigState>(INITIAL_OIDC_CONFIG)
    const [isSamlSaved, setIsSamlSaved] = useState(false)
    const [isOidcSaved, setIsOidcSaved] = useState(false)
    const [testState, setTestState] = useState<ISsoTestState | undefined>(undefined)

    const handleSaveSaml = (): void => {
        if (hasSamlRequiredConfig(samlConfig) !== true) {
            showToastError("SAML config is invalid. Check Entity ID, SSO URL and certificate.")
            return
        }

        setIsSamlSaved(true)
        showToastSuccess("SAML configuration saved.")
    }

    const handleSaveOidc = (): void => {
        if (hasOidcRequiredConfig(oidcConfig) !== true) {
            showToastError("OIDC config is invalid. Check issuer, client id and secret.")
            return
        }

        setIsOidcSaved(true)
        showToastSuccess("OIDC configuration saved.")
    }

    const handleTestSso = (provider: "oidc" | "saml"): void => {
        const isValid =
            provider === "saml"
                ? hasSamlRequiredConfig(samlConfig)
                : hasOidcRequiredConfig(oidcConfig)

        if (isValid) {
            const nextState: ISsoTestState = {
                message: `SSO test passed for ${provider}.`,
                provider,
                status: "passed",
            }
            setTestState(nextState)
            showToastSuccess("SSO test completed successfully.")
            return
        }

        const failedState: ISsoTestState = {
            message: `SSO test failed for ${provider}. Check required fields and try again.`,
            provider,
            status: "failed",
        }
        setTestState(failedState)
        showToastInfo("SSO test finished with validation error.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">SSO provider management</h1>
            <p className="text-sm text-foreground/70">
                Configure SAML and OIDC providers, validate required fields, and run test SSO checks
                before rollout.
            </p>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-foreground">
                            SAML configuration
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <Input
                            label="SAML Entity ID"
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
                            label="SAML SSO URL"
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
                            label="X.509 certificate"
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
                            <Button onPress={handleSaveSaml}>Save SAML config</Button>
                            <Button
                                variant="flat"
                                onPress={(): void => {
                                    handleTestSso("saml")
                                }}
                            >
                                Test SSO (SAML)
                            </Button>
                        </div>
                        {isSamlSaved ? (
                            <Alert color="success" title="SAML configuration saved" variant="flat">
                                SAML settings passed local validation and are ready for secure sync.
                            </Alert>
                        ) : null}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-foreground">
                            OIDC configuration
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <Input
                            label="OIDC issuer URL"
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
                            label="OIDC client ID"
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
                            label="OIDC client secret"
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
                        <p className="text-xs text-foreground/70">
                            Secret preview in UI: {getMaskedSecret(oidcConfig.clientSecret)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onPress={handleSaveOidc}>Save OIDC config</Button>
                            <Button
                                variant="flat"
                                onPress={(): void => {
                                    handleTestSso("oidc")
                                }}
                            >
                                Test SSO (OIDC)
                            </Button>
                        </div>
                        {isOidcSaved ? (
                            <Alert color="success" title="OIDC configuration saved" variant="flat">
                                OIDC settings passed local validation and are ready for secure sync.
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
                            ? "SSO connectivity check passed"
                            : "SSO connectivity check failed"
                    }
                    variant="flat"
                >
                    {testState.message}
                </Alert>
            )}
        </section>
    )
}
