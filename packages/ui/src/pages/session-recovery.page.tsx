import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { PageShell } from "@/components/layout/page-shell"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Route-level экран восстановления пользовательской сессии.
 *
 * @returns Session recovery flow с шагами re-auth и возврата в рабочий контекст.
 */
export function SessionRecoveryPage(): ReactElement {
    const { t } = useTranslation(["system"])
    const navigate = useNavigate()

    return (
        <PageShell
            subtitle={t("system:sessionRecovery.pageSubtitle")}
            title={t("system:sessionRecovery.pageTitle")}
        >
            <Alert
                color="primary"
                title={t("system:sessionRecovery.guidanceTitle")}
                variant="flat"
            >
                {t("system:sessionRecovery.guidanceMessage")}
            </Alert>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("system:sessionRecovery.recoveryStepsTitle")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/85">
                        <li>{t("system:sessionRecovery.step1")}</li>
                        <li>{t("system:sessionRecovery.step2")}</li>
                        <li>{t("system:sessionRecovery.step3")}</li>
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
                            {t("system:sessionRecovery.openOrganizationSettings")}
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
                            {t("system:sessionRecovery.reAuthenticate")}
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
                            {t("system:sessionRecovery.backToDiagnostics")}
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </PageShell>
    )
}
