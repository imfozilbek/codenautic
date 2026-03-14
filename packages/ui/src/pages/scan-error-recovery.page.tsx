import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardContent, CardHeader } from "@heroui/react"
import { PageShell } from "@/components/layout/page-shell"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Route-level экран для восстановления после ошибок scan pipeline.
 *
 * @returns Пошаговый recovery flow с быстрыми переходами.
 */
export function ScanErrorRecoveryPage(): ReactElement {
    const { t } = useTranslation(["system"])
    const navigate = useNavigate()

    return (
        <PageShell
            subtitle={t("system:scanErrorRecovery.pageSubtitle")}
            title={t("system:scanErrorRecovery.pageTitle")}
        >
            <Alert status="warning">
                <Alert.Title>{t("system:scanErrorRecovery.recoveryFlowTitle")}</Alert.Title>
                <Alert.Description>{t("system:scanErrorRecovery.recoveryFlowMessage")}</Alert.Description>
            </Alert>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("system:scanErrorRecovery.recommendedStepsTitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/85">
                        <li>{t("system:scanErrorRecovery.step1")}</li>
                        <li>{t("system:scanErrorRecovery.step2")}</li>
                        <li>{t("system:scanErrorRecovery.step3")}</li>
                    </ol>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={(): void => {
                                void navigate({
                                    to: "/repositories",
                                })
                            }}
                        >
                            {t("system:scanErrorRecovery.openRepositories")}
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={(): void => {
                                void navigate({
                                    to: "/settings-jobs",
                                })
                            }}
                        >
                            {t("system:scanErrorRecovery.openJobsCenter")}
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={(): void => {
                                void navigate({
                                    to: "/help-diagnostics",
                                })
                            }}
                        >
                            {t("system:scanErrorRecovery.backToDiagnostics")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </PageShell>
    )
}
