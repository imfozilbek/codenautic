import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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
    const { t } = useTranslation(["settings"])
    const [sourceText, setSourceText] = useState(
        "token=abc123456789\nowner=security@acme.dev\nnote=share review summary only",
    )
    const [redactedText, setRedactedText] = useState("")
    const [redactedSourceText, setRedactedSourceText] = useState("")
    const [lastExportState, setLastExportState] = useState<string>(t("settings:privacyRedaction.noExportYet"))

    const sensitiveHits = useMemo((): ReadonlyArray<ISensitiveHit> => {
        return detectSensitiveFragments(sourceText)
    }, [sourceText])

    const hasSensitiveData = sensitiveHits.length > 0

    const handleApplyRedaction = (): void => {
        if (hasSensitiveData !== true) {
            setRedactedText(sourceText)
            setRedactedSourceText(sourceText)
            showToastInfo(t("settings:privacyRedaction.toast.noSensitiveFragments"))
            return
        }

        const nextRedacted = buildRedactedText(sourceText, sensitiveHits)
        setRedactedText(nextRedacted)
        setRedactedSourceText(sourceText)
        showToastSuccess(t("settings:privacyRedaction.toast.sensitiveFragmentsRedacted"))
    }

    const handleExport = (): void => {
        if (
            hasSensitiveData === true &&
            (redactedText.length === 0 || redactedSourceText !== sourceText)
        ) {
            setLastExportState(
                t("settings:privacyRedaction.exportBlocked"),
            )
            showToastError(t("settings:privacyRedaction.toast.exportBlocked"))
            return
        }

        const exportedPayload = hasSensitiveData === true ? redactedText : sourceText
        setLastExportState(
            t("settings:privacyRedaction.safeExportConfirmed", { chars: exportedPayload.length }),
        )
        showToastSuccess(t("settings:privacyRedaction.toast.safeExportConfirmed"))
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>{t("settings:privacyRedaction.pageTitle")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                {t("settings:privacyRedaction.pageSubtitle")}
            </p>

            {hasSensitiveData ? (
                <Alert color="danger" title={t("settings:privacyRedaction.sensitiveFragmentsDetectedTitle")} variant="flat">
                    {t("settings:privacyRedaction.sensitiveFragmentsDetectedDescription")}
                </Alert>
            ) : (
                <Alert color="success" title={t("settings:privacyRedaction.noSensitiveFragmentsTitle")} variant="flat">
                    {t("settings:privacyRedaction.noSensitiveFragmentsDescription")}
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:privacyRedaction.sourceContent")}</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Textarea
                        aria-label="Privacy source text"
                        minRows={6}
                        value={sourceText}
                        onValueChange={setSourceText}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button onPress={handleApplyRedaction}>{t("settings:privacyRedaction.applyRedactionSuggestions")}</Button>
                        <Button variant="flat" onPress={handleExport}>
                            {t("settings:privacyRedaction.confirmSafeExport")}
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:privacyRedaction.detectionSummary")}</p>
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
                                        <p className="text-text-secondary">{hit.value}</p>
                                    </li>
                                ),
                            )}
                        </ul>
                    ) : (
                        <p className="text-sm text-text-secondary">
                            {t("settings:privacyRedaction.noHitsMessage")}
                        </p>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:privacyRedaction.redactedPreview")}</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    <Textarea
                        aria-label="Privacy redacted preview"
                        isReadOnly
                        minRows={6}
                        value={redactedText}
                    />
                    <Alert color="primary" title={t("settings:privacyRedaction.exportState")} variant="flat">
                        {lastExportState}
                    </Alert>
                </CardBody>
            </Card>
        </section>
    )
}
