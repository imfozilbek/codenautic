import { lazy, Suspense, type ReactElement, useState } from "react"

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
    const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false)

    return (
        <section className="space-y-3 rounded-md border border-border bg-surface p-3">
            <h3 className="text-sm font-semibold text-foreground">Prompt override editor</h3>
            <p className="text-xs text-muted-foreground">
                Override default summary prompt for repository-specific output structure.
            </p>
            <Textarea
                aria-label="CCR summary prompt override"
                minRows={5}
                onValueChange={props.onChange}
                placeholder="Write custom CCR summary prompt..."
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
                    {isPreviewVisible === true ? "Hide prompt preview" : "Show prompt preview"}
                </Button>
                <Button size="sm" variant="flat" onPress={props.onReset}>
                    Reset prompt override
                </Button>
            </div>
            {isPreviewVisible === false ? null : (
                <section aria-label="Prompt override preview" className="space-y-2">
                    <Suspense
                        fallback={
                            <p className="text-xs text-muted-foreground">Loading preview...</p>
                        }
                    >
                        <LazyPromptOverridePreview content={props.value} />
                    </Suspense>
                </section>
            )}
        </section>
    )
}
