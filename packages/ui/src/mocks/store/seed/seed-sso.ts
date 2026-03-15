import type { SsoCollection } from "../collections/sso-collection"

/**
 * Заполняет sso-коллекцию начальными конфигурациями.
 *
 * Загружает seed-данные SAML и OIDC из страницы settings-sso.
 *
 * @param sso - Коллекция SSO для заполнения.
 */
export function seedSso(sso: SsoCollection): void {
    sso.seed({
        saml: {
            entityId: "urn:codenautic:sp:acme",
            ssoUrl: "https://idp.acme.dev/sso/saml",
            x509Certificate:
                "-----BEGIN CERTIFICATE-----\nMIIC...acme...prod\n-----END CERTIFICATE-----",
        },
        oidc: {
            clientId: "codenautic-web",
            clientSecret: "",
            issuerUrl: "https://auth.acme.dev/realms/platform",
        },
    })
}
