import { type ReactElement } from "react"

import { Card, CardBody, CardHeader, StyledLink } from "@/components/ui"
import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { useUiRole } from "@/lib/permissions/ui-policy"

/**
 * Базовая overview-страница раздела settings.
 *
 * @returns Блок с входными ссылками в поднастройки.
 */
export function SettingsPage(): ReactElement {
    const uiRole = useUiRole()
    const checklistRole = uiRole === "admin" ? "admin" : "developer"

    return (
        <section className="space-y-4">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-text-secondary">
                    Configure providers, onboarding defaults, governance rules, and operational
                    controls for your workspace.
                </p>
            </header>
            <ActivationChecklist role={checklistRole} />
            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Quick setup</p>
                </CardHeader>
                <CardBody className="space-y-2 text-sm text-text-tertiary">
                    <p>
                        Настройте review-политику, провайдеров и подключения через быстрые страницы
                        ниже.
                    </p>
                    <ul className="space-y-1">
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-code-review"
                            >
                                Code Review configuration
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-appearance"
                            >
                                Appearance settings
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-notifications"
                            >
                                Notification center
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-llm-providers"
                            >
                                LLM providers
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-git-providers"
                            >
                                Git providers
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-integrations"
                            >
                                Integrations
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-webhooks"
                            >
                                Webhook management
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-token-usage"
                            >
                                Token usage
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-adoption-analytics"
                            >
                                Usage & adoption analytics
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-organization"
                            >
                                Organization settings
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-contract-validation"
                            >
                                Import/export contract validation
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-privacy-redaction"
                            >
                                Privacy-safe export
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-provider-degradation"
                            >
                                Provider degradation mode
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-concurrency"
                            >
                                Concurrent config resolver
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-jobs"
                            >
                                Operations jobs monitor
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-billing"
                            >
                                Billing lifecycle
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-team"
                            >
                                Team management
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-rules-library"
                            >
                                Rules library
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-audit-logs"
                            >
                                Audit logs
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-sso"
                            >
                                SSO provider management
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/settings-byok"
                            >
                                BYOK management
                            </StyledLink>
                        </li>
                        <li>
                            <StyledLink
                                className="font-medium text-foreground"
                                to="/onboarding"
                            >
                                Start repository onboarding
                            </StyledLink>
                        </li>
                    </ul>
                </CardBody>
            </Card>
        </section>
    )
}
