import type { ReactElement } from "react"

import { Card, CardBody, CardHeader } from "@/components/ui"
import type { IExternalContextPreviewResponse } from "@/lib/api/endpoints/external-context.endpoint"

/** Параметры preview внешнего контекста. */
export interface IContextPreviewProps {
    /** Имя выбранного источника. */
    readonly sourceName?: string
    /** Preview-данные выбранного источника. */
    readonly preview?: IExternalContextPreviewResponse
    /** Загрузка preview. */
    readonly isLoading?: boolean
    /** Ошибка загрузки preview. */
    readonly isError?: boolean
    /** Кастомный текст пустого состояния. */
    readonly emptyStateLabel?: string
}

/**
 * Панель preview внешнего контекста (сниппеты).
 *
 * @param props Параметры preview-панели.
 * @returns Карточка со сниппетами и deep-links.
 */
export function ContextPreview(props: IContextPreviewProps): ReactElement {
    const title = props.sourceName === undefined ? "Context preview" : `${props.sourceName} preview`
    const emptyStateLabel = props.emptyStateLabel ?? "No context items loaded yet."

    return (
        <Card>
            <CardHeader>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
            </CardHeader>
            <CardBody className="space-y-3">
                {props.isLoading === true ? (
                    <p aria-live="polite" className="text-sm text-foreground-500">
                        Loading context preview...
                    </p>
                ) : props.isError === true ? (
                    <p aria-live="polite" className="text-sm text-danger">
                        Unable to load context preview.
                    </p>
                ) : props.preview === undefined || props.preview.items.length === 0 ? (
                    <p className="text-sm text-foreground-500">{emptyStateLabel}</p>
                ) : (
                    <ul className="space-y-2">
                        {props.preview.items.map((item): ReactElement => (
                            <li
                                key={item.id}
                                className="rounded-lg border border-default-200 bg-content1 p-3"
                            >
                                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                <p className="mt-1 text-xs text-foreground-600">{item.excerpt}</p>
                                <a
                                    className="mt-2 inline-block text-xs font-medium text-primary"
                                    href={item.url}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    Open source item
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </CardBody>
        </Card>
    )
}
