import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TSensitiveType = "api_key" | "email" | "secret" | "token"

interface ISensitiveHit {
    /** Категория чувствительного фрагмента. */
    readonly type: TSensitiveType
    /** Обнаруженный raw фрагмент. */
    readonly value: string
}

const DETECTION_PATTERNS: ReadonlyArray<{
    readonly type: TSensitiveType
    readonly pattern: RegExp
}> = [
    {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        type: "email",
    },
    {
        pattern: /\b(?:api[_-]?key|x-api-key)\s*[:=]\s*[A-Za-z0-9._-]{8,}\b/gi,
        type: "api_key",
    },
    {
        pattern: /\b(?:token|bearer)\s*[:=]?\s*[A-Za-z0-9._-]{10,}\b/gi,
        type: "token",
    },
    {
        pattern: /\b(?:secret|password)\s*[:=]\s*[^\s,;]{6,}\b/gi,
        type: "secret",
    },
]

function detectSensitiveFragments(text: string): ReadonlyArray<ISensitiveHit> {
    const hits: Array<ISensitiveHit> = []

    DETECTION_PATTERNS.forEach((matcher): void => {
        const matches = text.match(matcher.pattern)
        if (matches === null) {
            return
        }

        matches.forEach((match): void => {
            hits.push({
                type: matcher.type,
                value: match,
            })
        })
    })

    return hits
}

function buildRedactedText(text: string, hits: ReadonlyArray<ISensitiveHit>): string {
    return hits.reduce((current, hit): string => {
        const normalizedType = hit.type.toUpperCase()
        return current.replaceAll(hit.value, `[REDACTED_${normalizedType}]`)
    }, text)
}

/**
 * Экран privacy-safe export/redaction.
 *
 * @returns Проверка/редакция чувствительных данных перед export/share.
 */
export function SettingsPrivacyRedactionPage(): ReactElement {
    const [sourceText, setSourceText] = useState(
        "token=abc123456789\nowner=security@acme.dev\nnote=share review summary only",
    )
    const [redactedText, setRedactedText] = useState("")
    const [redactedSourceText, setRedactedSourceText] = useState("")
    const [lastExportState, setLastExportState] = useState<string>("No export executed yet.")

    const sensitiveHits = useMemo((): ReadonlyArray<ISensitiveHit> => {
        return detectSensitiveFragments(sourceText)
    }, [sourceText])

    const hasSensitiveData = sensitiveHits.length > 0

    const handleApplyRedaction = (): void => {
        if (hasSensitiveData !== true) {
            setRedactedText(sourceText)
            setRedactedSourceText(sourceText)
            showToastInfo("No sensitive fragments detected.")
            return
        }

        const nextRedacted = buildRedactedText(sourceText, sensitiveHits)
        setRedactedText(nextRedacted)
        setRedactedSourceText(sourceText)
        showToastSuccess("Sensitive fragments redacted.")
    }

    const handleExport = (): void => {
        if (
            hasSensitiveData === true &&
            (redactedText.length === 0 || redactedSourceText !== sourceText)
        ) {
            setLastExportState(
                "Export blocked: sensitive fragments detected. Apply redaction for current source text first.",
            )
            showToastError("Export blocked by privacy guard.")
            return
        }

        const exportedPayload = hasSensitiveData === true ? redactedText : sourceText
        setLastExportState(
            `Safe export confirmed (${exportedPayload.length} chars). Sensitive data removed.`,
        )
        showToastSuccess("Safe export confirmed.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Privacy-safe export</h1>
            <p className="text-sm text-foreground/70">
                Detect and redact secrets/PII before copy, export or share operations.
            </p>

            {hasSensitiveData ? (
                <Alert color="danger" title="Sensitive fragments detected" variant="flat">
                    Export is blocked until suggested redaction is applied.
                </Alert>
            ) : (
                <Alert color="success" title="No sensitive fragments" variant="flat">
                    Current payload is safe for export.
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Source content</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Textarea
                        aria-label="Privacy source text"
                        minRows={6}
                        value={sourceText}
                        onValueChange={setSourceText}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button onPress={handleApplyRedaction}>Apply redaction suggestions</Button>
                        <Button variant="flat" onPress={handleExport}>
                            Confirm safe export
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Detection summary</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {hasSensitiveData ? (
                        <ul aria-label="Sensitive hits list" className="space-y-2">
                            {sensitiveHits.map(
                                (hit, index): ReactElement => (
                                    <li
                                        className="rounded-lg border border-border bg-surface p-3 text-sm"
                                        key={`${hit.type}-${String(index)}`}
                                    >
                                        <p className="font-semibold text-foreground">{hit.type}</p>
                                        <p className="text-foreground/70">{hit.value}</p>
                                    </li>
                                ),
                            )}
                        </ul>
                    ) : (
                        <p className="text-sm text-foreground/70">
                            No hits. You can export directly.
                        </p>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Redacted preview</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    <Textarea
                        aria-label="Privacy redacted preview"
                        isReadOnly
                        minRows={6}
                        value={redactedText}
                    />
                    <Alert color="primary" title="Export state" variant="flat">
                        {lastExportState}
                    </Alert>
                </CardBody>
            </Card>
        </section>
    )
}
