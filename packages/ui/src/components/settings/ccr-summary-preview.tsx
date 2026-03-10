import { type ReactElement, useMemo } from "react"
import { useTranslation } from "react-i18next"

export type TCCRSummaryDetailLevel = "CONCISE" | "STANDARD" | "DEEP"

export interface ICCRSummaryPreviewSettings {
    readonly detailLevel: TCCRSummaryDetailLevel
    readonly enabled: boolean
    readonly includeRiskOverview: boolean
    readonly includeTimeline: boolean
    readonly maxSuggestions: number
}

interface ICCRSummaryPreviewProps {
    readonly settings: ICCRSummaryPreviewSettings
}

/**
 * Превью итоговой структуры CCR summary с учетом текущей конфигурации.
 *
 * @param props - настройки генерации summary.
 * @returns Карточка предпросмотра с включенными секциями и лимитами.
 */
export function CCRSummaryPreview(props: ICCRSummaryPreviewProps): ReactElement {
    const { t } = useTranslation(["settings"])

    const detailLabels = useMemo(
        (): Record<TCCRSummaryDetailLevel, string> => ({
            CONCISE: t("settings:ccrSummaryPreview.detailConcise"),
            STANDARD: t("settings:ccrSummaryPreview.detailStandard"),
            DEEP: t("settings:ccrSummaryPreview.detailDeep"),
        }),
        [t],
    )

    if (props.settings.enabled !== true) {
        return (
            <article
                className="space-y-2 rounded-md border border-dashed border-border bg-surface p-3"
                data-testid="ccr-summary-preview"
            >
                <h3 className="text-sm font-semibold text-foreground">
                    {t("settings:ccrSummaryPreview.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                    {t("settings:ccrSummaryPreview.generationDisabled")}
                </p>
            </article>
        )
    }

    const sections = [
        props.settings.includeRiskOverview === true
            ? t("settings:ccrSummaryPreview.sectionRiskOverview")
            : undefined,
        props.settings.includeTimeline === true
            ? t("settings:ccrSummaryPreview.sectionTimelineHighlights")
            : undefined,
        t("settings:ccrSummaryPreview.sectionTopSuggestions"),
    ].filter((item): item is string => item !== undefined)

    return (
        <article
            className="space-y-2 rounded-md border border-border bg-surface p-3"
            data-testid="ccr-summary-preview"
        >
            <h3 className="text-sm font-semibold text-foreground">
                {t("settings:ccrSummaryPreview.title")}
            </h3>
            <p
                className="text-xs text-muted-foreground"
                data-testid="ccr-summary-preview-detail-level"
            >
                {t("settings:ccrSummaryPreview.detailLevel", {
                    level: detailLabels[props.settings.detailLevel],
                })}
            </p>
            <p
                className="text-xs text-muted-foreground"
                data-testid="ccr-summary-preview-max-suggestions"
            >
                {t("settings:ccrSummaryPreview.maxSuggestions", {
                    count: props.settings.maxSuggestions,
                })}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-foreground">
                {sections.map(
                    (section): ReactElement => (
                        <li key={section}>{section}</li>
                    ),
                )}
            </ul>
        </article>
    )
}
