import { type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

const REGENERATED_SUMMARIES: ReadonlyArray<string> = [
    "Delivery throughput increased while unresolved risk concentration shifted to infrastructure boundaries.",
    "Architecture stability improved after guardrail enforcement, with lower churn in domain modules.",
    "Quality trend is positive, but dependency volatility around adapters still requires monitoring.",
]

export interface IAiSummaryWidgetProps {
    readonly initialSummary: string
}

/**
 * AI narrative summary widget with regenerate and copy actions.
 *
 * @param props Виджет получает стартовый AI summary текст.
 * @returns UI с summary, regenerate и copy-to-clipboard действиями.
 */
export function AiSummaryWidget(props: IAiSummaryWidgetProps): ReactElement {
    const { t } = useTranslation(["reports"])
    const [summary, setSummary] = useState<string>(props.initialSummary)
    const [regenerationIndex, setRegenerationIndex] = useState<number>(0)
    const [status, setStatus] = useState<string>(t("reports:aiSummary.summaryReady"))

    const handleRegenerate = (): void => {
        const nextIndex = (regenerationIndex + 1) % REGENERATED_SUMMARIES.length
        const nextSummary = REGENERATED_SUMMARIES[nextIndex] ?? summary

        setRegenerationIndex(nextIndex)
        setSummary(nextSummary)
        setStatus(t("reports:aiSummary.summaryRegenerated"))
        showToastInfo(t("reports:aiSummary.summaryRegeneratedToast"))
    }
    const handleCopySummary = (): void => {
        const clipboard = globalThis.navigator.clipboard
        if (clipboard === undefined) {
            setStatus(t("reports:aiSummary.clipboardUnavailable"))
            showToastInfo(t("reports:aiSummary.clipboardUnavailableToast"))
            return
        }

        void clipboard
            .writeText(summary)
            .then((): void => {
                setStatus(t("reports:aiSummary.summaryCopied"))
                showToastSuccess(t("reports:aiSummary.summaryCopiedToast"))
            })
            .catch((): void => {
                setStatus(t("reports:aiSummary.copyFailed"))
                showToastError(t("reports:aiSummary.copyFailedToast"))
            })
    }

    return (
        <Card>
            <CardHeader>
                <p className="text-base font-semibold text-foreground">
                    {t("reports:aiSummary.title")}
                </p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p
                    aria-label={t("reports:ariaLabel.aiSummary.summaryText")}
                    className="rounded border border-border bg-surface p-3 text-sm"
                >
                    {summary}
                </p>
                <div className="flex gap-2">
                    <Button color="primary" onPress={handleRegenerate}>
                        {t("reports:aiSummary.regenerateSummary")}
                    </Button>
                    <Button variant="flat" onPress={handleCopySummary}>
                        {t("reports:aiSummary.copySummary")}
                    </Button>
                </div>
                <Alert color="primary" title={t("reports:aiSummary.statusTitle")} variant="flat">
                    {status}
                </Alert>
            </CardBody>
        </Card>
    )
}
