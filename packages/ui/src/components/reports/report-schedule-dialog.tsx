import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { useDynamicTranslation } from "@/lib/i18n"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TScheduleFormat = "pdf" | "png" | "html"

/**
 * Диалог настройки расписания доставки отчётов.
 *
 * @returns UI c recipients, cron, format и preview schedule.
 */
export function ReportScheduleDialog(): ReactElement {
    const { t } = useTranslation(["reports"])
    const { td } = useDynamicTranslation(["reports"])
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [recipients, setRecipients] = useState<string>("team@codenautic.app")
    const [cronExpression, setCronExpression] = useState<string>("0 9 * * 1")
    const [format, setFormat] = useState<TScheduleFormat>("pdf")
    const [status, setStatus] = useState<string>(t("reports:scheduleDialog.noScheduleYet"))

    const schedulePreview = useMemo((): string => {
        const normalizedRecipients =
            recipients.trim().length === 0
                ? t("reports:scheduleDialog.noRecipients")
                : recipients.trim()
        return td("reports:scheduleDialog.schedulePreview", {
            cron: cronExpression,
            format: format.toUpperCase(),
            recipients: normalizedRecipients,
        })
    }, [cronExpression, format, recipients, td])

    const handleRecipientsChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setRecipients(event.currentTarget.value)
    }
    const handleCronChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setCronExpression(event.currentTarget.value)
    }
    const handleSaveSchedule = (): void => {
        setStatus(
            td("reports:scheduleDialog.scheduleSaved", {
                cron: cronExpression,
                format: format.toUpperCase(),
            }),
        )
        showToastSuccess(t("reports:scheduleDialog.scheduleSavedToast"))
    }

    return (
        <Card>
            <CardHeader>
                <p className="text-base font-semibold text-foreground">
                    {t("reports:scheduleDialog.title")}
                </p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="flex gap-2">
                    <Button
                        onPress={(): void => {
                            setIsOpen(true)
                            showToastInfo(t("reports:scheduleDialog.openedToast"))
                        }}
                    >
                        {t("reports:scheduleDialog.openDialog")}
                    </Button>
                </div>
                {isOpen === false ? null : (
                    <div
                        aria-label="Report schedule dialog"
                        className="space-y-3 rounded border border-border bg-surface p-3"
                        role="dialog"
                    >
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:scheduleDialog.recipientsLabel")}
                            </span>
                            <input
                                aria-label={t("reports:scheduleDialog.recipientsLabel")}
                                className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
                                type="text"
                                value={recipients}
                                onChange={handleRecipientsChange}
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:scheduleDialog.cronExpressionLabel")}
                            </span>
                            <input
                                aria-label={t("reports:scheduleDialog.cronExpressionLabel")}
                                className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
                                type="text"
                                value={cronExpression}
                                onChange={handleCronChange}
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:scheduleDialog.deliveryFormatLabel")}
                            </span>
                            <select
                                aria-label={t("reports:scheduleDialog.deliveryFormatLabel")}
                                className={NATIVE_FORM.select}
                                value={format}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "pdf" ||
                                        nextValue === "png" ||
                                        nextValue === "html"
                                    ) {
                                        setFormat(nextValue)
                                    }
                                }}
                            >
                                <option value="pdf">pdf</option>
                                <option value="png">png</option>
                                <option value="html">html</option>
                            </select>
                        </label>
                        <Alert
                            color="primary"
                            title={t("reports:scheduleDialog.schedulePreviewTitle")}
                            variant="flat"
                        >
                            <span aria-label="Schedule preview value">{schedulePreview}</span>
                        </Alert>
                        <div className="flex gap-2">
                            <Button color="primary" onPress={handleSaveSchedule}>
                                {t("reports:scheduleDialog.saveSchedule")}
                            </Button>
                            <Button
                                variant="flat"
                                onPress={(): void => {
                                    setIsOpen(false)
                                }}
                            >
                                {t("reports:scheduleDialog.closeDialog")}
                            </Button>
                        </div>
                    </div>
                )}
                <Alert
                    color="primary"
                    title={t("reports:scheduleDialog.scheduleStatusTitle")}
                    variant="flat"
                >
                    {status}
                </Alert>
            </CardBody>
        </Card>
    )
}
