import { type ChangeEvent, lazy, Suspense, type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, TextArea } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import type { IRuleEditorMarkdownPreviewProps } from "./rule-editor-markdown-preview"

const LazyPromptOverridePreview = lazy(
    (): Promise<{
        default: (props: IRuleEditorMarkdownPreviewProps) => ReactElement
    }> => import("./rule-editor-markdown-preview"),
)

interface IPromptOverrideEditorProps {
    readonly value: string
    readonly onChange: (value: string) => void
    readonly onReset: () => void
}

/**
 * Редактор prompt override для CCR summary с lazy-loaded preview.
 *
 * @param props - текущее значение и callbacks управления.
 * @returns Карточка редактора prompt c динамически загружаемым preview.
 */
export function PromptOverrideEditor(props: IPromptOverrideEditorProps): ReactElement {
    const { t } = useTranslation(["settings"])
    const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false)

    return (
        <section className="space-y-3 rounded-md border border-border bg-surface p-3">
            <h3 className={TYPOGRAPHY.cardTitle}>{t("settings:promptOverrideEditor.title")}</h3>
            <p className={TYPOGRAPHY.captionMuted}>
                {t("settings:promptOverrideEditor.description")}
            </p>
            <TextArea
                aria-label={t("settings:promptOverrideEditor.ariaLabel")}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
                    props.onChange(event.target.value)
                }}
                placeholder={t("settings:promptOverrideEditor.placeholder")}
                value={props.value}
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="primary"
                    onPress={(): void => {
                        setIsPreviewVisible((previous): boolean => !previous)
                    }}
                >
                    {isPreviewVisible === true
                        ? t("settings:promptOverrideEditor.hidePromptPreview")
                        : t("settings:promptOverrideEditor.showPromptPreview")}
                </Button>
                <Button size="sm" variant="secondary" onPress={props.onReset}>
                    {t("settings:promptOverrideEditor.resetPromptOverride")}
                </Button>
            </div>
            {isPreviewVisible === false ? null : (
                <section
                    aria-label={t("settings:promptOverrideEditor.previewAriaLabel")}
                    className="space-y-2"
                >
                    <Suspense
                        fallback={
                            <p className={TYPOGRAPHY.captionMuted}>
                                {t("settings:promptOverrideEditor.loadingPreview")}
                            </p>
                        }
                    >
                        <LazyPromptOverridePreview content={props.value} />
                    </Suspense>
                </section>
            )}
        </section>
    )
}
