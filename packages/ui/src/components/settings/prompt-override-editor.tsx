import { lazy, Suspense, type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Textarea } from "@/components/ui"
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
            <h3 className="text-sm font-semibold text-foreground">
                {t("settings:promptOverrideEditor.title")}
            </h3>
            <p className="text-xs text-muted-foreground">
                {t("settings:promptOverrideEditor.description")}
            </p>
            <Textarea
                aria-label={t("settings:promptOverrideEditor.ariaLabel")}
                minRows={5}
                onValueChange={props.onChange}
                placeholder={t("settings:promptOverrideEditor.placeholder")}
                value={props.value}
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="solid"
                    onPress={(): void => {
                        setIsPreviewVisible((previous): boolean => !previous)
                    }}
                >
                    {isPreviewVisible === true
                        ? t("settings:promptOverrideEditor.hidePromptPreview")
                        : t("settings:promptOverrideEditor.showPromptPreview")}
                </Button>
                <Button size="sm" variant="flat" onPress={props.onReset}>
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
                            <p className="text-xs text-muted-foreground">
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
