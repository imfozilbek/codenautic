import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
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
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>
                {t("system:scanErrorRecovery.pageTitle")}
            </h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                {t("system:scanErrorRecovery.pageSubtitle")}
            </p>

            <Alert
                color="warning"
                title={t("system:scanErrorRecovery.recoveryFlowTitle")}
                variant="flat"
            >
                {t("system:scanErrorRecovery.recoveryFlowMessage")}
            </Alert>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("system:scanErrorRecovery.recommendedStepsTitle")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/85">
                        <li>{t("system:scanErrorRecovery.step1")}</li>
                        <li>{t("system:scanErrorRecovery.step2")}</li>
                        <li>{t("system:scanErrorRecovery.step3")}</li>
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
                            {t("system:scanErrorRecovery.openRepositories")}
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
                            {t("system:scanErrorRecovery.openJobsCenter")}
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
                            {t("system:scanErrorRecovery.backToDiagnostics")}
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </section>
    )
}
