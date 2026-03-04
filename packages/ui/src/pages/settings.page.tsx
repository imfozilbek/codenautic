import { type ReactElement } from "react"

import { Link } from "@tanstack/react-router"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { readUiRoleFromStorage } from "@/lib/permissions/ui-policy"

/**
 * Базовая overview-страница раздела settings.
 *
 * @returns Блок с входными ссылками в поднастройки.
 */
export function SettingsPage(): ReactElement {
    const uiRole = readUiRoleFromStorage()
    const checklistRole = uiRole === "admin" ? "admin" : "developer"

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
            <ActivationChecklist role={checklistRole} />
            <Card>
                <CardHeader>
                    <p className="text-base font-semibold">Quick setup</p>
                </CardHeader>
                <CardBody className="space-y-2 text-sm text-slate-700">
                    <p>
                        Настройте review-политику, провайдеров и подключения через быстрые страницы
                        ниже.
                    </p>
                    <ul className="space-y-1">
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-code-review"
                            >
                                Code Review configuration
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-appearance"
                            >
                                Appearance settings
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-notifications"
                            >
                                Notification center
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-llm-providers"
                            >
                                LLM providers
                            </Link>
                        </li>
                        <li>
                        <Link
                            className="underline underline-offset-4"
                                to="/settings-git-providers"
                        >
                                Git providers
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-integrations"
                            >
                                Integrations
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-webhooks"
                            >
                                Webhook management
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-token-usage"
                            >
                                Token usage
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-organization"
                            >
                                Organization settings
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-contract-validation"
                            >
                                Import/export contract validation
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-privacy-redaction"
                            >
                                Privacy-safe export
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-provider-degradation"
                            >
                                Provider degradation mode
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-concurrency"
                            >
                                Concurrent config resolver
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-jobs"
                            >
                                Operations jobs monitor
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-billing"
                            >
                                Billing lifecycle
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-team"
                            >
                                Team management
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-rules-library"
                            >
                                Rules library
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-audit-logs"
                            >
                                Audit logs
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-sso"
                            >
                                SSO provider management
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/settings-byok"
                            >
                                BYOK management
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="underline underline-offset-4"
                                to="/onboarding"
                            >
                                Start repository onboarding
                            </Link>
                        </li>
                    </ul>
                </CardBody>
            </Card>
        </section>
    )
}
