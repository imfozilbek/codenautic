import { type ReactElement } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"

/**
 * Route-level экран для восстановления после ошибок scan pipeline.
 *
 * @returns Пошаговый recovery flow с быстрыми переходами.
 */
export function ScanErrorRecoveryPage(): ReactElement {
    const navigate = useNavigate()

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Scan error recovery</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Recover failed repository scans using safe retry steps and diagnostics links.
            </p>

            <Alert color="warning" title="Recovery flow" variant="flat">
                Follow the steps below to restore scan progress without losing onboarding context.
            </Alert>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Recommended steps
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--foreground)]/85">
                        <li>Open repositories and confirm provider connectivity and webhook status.</li>
                        <li>Retry scan for the affected repository from the onboarding queue.</li>
                        <li>Open jobs and check worker logs if retry fails again.</li>
                    </ol>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                void navigate({
                                    to: "/repositories",
                                })
                            }}
                        >
                            Open repositories
                        </Button>
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                void navigate({
                                    to: "/settings-jobs",
                                })
                            }}
                        >
                            Open jobs center
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

