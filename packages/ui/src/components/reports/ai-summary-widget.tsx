import { type ReactElement, useState } from "react"

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
    const [summary, setSummary] = useState<string>(props.initialSummary)
    const [regenerationIndex, setRegenerationIndex] = useState<number>(0)
    const [status, setStatus] = useState<string>("Summary ready.")

    const handleRegenerate = (): void => {
        const nextIndex = (regenerationIndex + 1) % REGENERATED_SUMMARIES.length
        const nextSummary = REGENERATED_SUMMARIES[nextIndex] ?? summary

        setRegenerationIndex(nextIndex)
        setSummary(nextSummary)
        setStatus("Summary regenerated.")
        showToastInfo("AI summary regenerated.")
    }
    const handleCopySummary = (): void => {
        const clipboard = globalThis.navigator.clipboard
        if (clipboard === undefined) {
            setStatus("Clipboard API unavailable. Copy manually.")
            showToastInfo("Clipboard API unavailable.")
            return
        }

        void clipboard
            .writeText(summary)
            .then((): void => {
                setStatus("Summary copied to clipboard.")
                showToastSuccess("AI summary copied.")
            })
            .catch((): void => {
                setStatus("Failed to copy summary.")
                showToastError("Failed to copy AI summary.")
            })
    }

    return (
        <Card>
            <CardHeader>
                <p className="text-base font-semibold text-foreground">AI summary widget</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p
                    aria-label="AI summary text"
                    className="rounded border border-border bg-surface p-3 text-sm"
                >
                    {summary}
                </p>
                <div className="flex gap-2">
                    <Button onPress={handleRegenerate}>Regenerate summary</Button>
                    <Button variant="flat" onPress={handleCopySummary}>
                        Copy summary
                    </Button>
                </div>
                <Alert color="primary" title="AI summary status" variant="flat">
                    {status}
                </Alert>
            </CardBody>
        </Card>
    )
}
