import { type ReactElement } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"

/**
 * Route-level экран восстановления пользовательской сессии.
 *
 * @returns Session recovery flow с шагами re-auth и возврата в рабочий контекст.
 */
export function SessionRecoveryPage(): ReactElement {
    const navigate = useNavigate()

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Session recovery flow</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Restore authentication and continue from saved workflow state after session expiry.
            </p>

            <Alert color="primary" title="Session guidance" variant="flat">
                Re-authenticate first, then return to your active review, issue, or onboarding context.
            </Alert>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Recovery steps</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--foreground)]/85">
                        <li>Open organization settings and verify active session and tenant context.</li>
                        <li>Re-login if token is expired or tenant was switched by policy.</li>
                        <li>Return to diagnostics and confirm auth check status is healthy.</li>
                    </ol>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                void navigate({
                                    to: "/settings-organization",
                                })
                            }}
                        >
                            Open organization settings
                        </Button>
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                void navigate({
                                    to: "/login",
                                })
                            }}
                        >
                            Re-authenticate
                        </Button>
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                void navigate({
                                    to: "/help-diagnostics",
                                })
                            }}
                        >
                            Back to diagnostics
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </section>
    )
}

