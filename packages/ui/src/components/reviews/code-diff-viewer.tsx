import { useMemo } from "react"
import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import ReactDiffViewer from "react-diff-viewer-continued"

import { TYPOGRAPHY } from "@/lib/constants/typography"
import type { ICcrDiffComment, ICcrDiffFile } from "@/pages/ccr-data"

/**
 * Props for the CodeDiffViewer component.
 */
interface ICodeDiffViewerProps {
    /**
     * Диффы по файлам для отображения.
     */
    readonly files: ReadonlyArray<ICcrDiffFile>
}

/**
 * Собрать все inline-комментарии из строк файла.
 *
 * @param file - Файл диффа с массивом строк.
 * @returns Массив комментариев из всех строк файла.
 */
function collectFileComments(file: ICcrDiffFile): ReadonlyArray<ICcrDiffComment> {
    return file.lines.flatMap((line): ReadonlyArray<ICcrDiffComment> => line.comments ?? [])
}

/**
 * Реконструировать исходный текст (left side) из строк диффа.
 *
 * @param file - Файл диффа.
 * @returns Многострочный текст для left side.
 */
function reconstructOldText(file: ICcrDiffFile): string {
    return file.lines
        .filter((line): boolean => line.type !== "added")
        .map((line): string => line.leftText)
        .join("\n")
}

/**
 * Реконструировать новый текст (right side) из строк диффа.
 *
 * @param file - Файл диффа.
 * @returns Многострочный текст для right side.
 */
function reconstructNewText(file: ICcrDiffFile): string {
    return file.lines
        .filter((line): boolean => line.type !== "removed")
        .map((line): string => line.rightText)
        .join("\n")
}

/**
 * Панель диффа для одного файла.
 *
 * Отображает header с путём, статистикой строк и языком,
 * ReactDiffViewer для side-by-side diff, и список комментариев.
 *
 * @param props - Данные файла диффа (ICcrDiffFile).
 * @returns Панель файлового диффа.
 */
function CodeDiffFilePanel(props: ICcrDiffFile): ReactElement {
    const { t } = useTranslation(["reviews"])

    const lineCounts = useMemo((): { added: number; removed: number } => {
        let added = 0
        let removed = 0

        for (const line of props.lines) {
            if (line.type === "added") {
                added += 1
            }
            if (line.type === "removed") {
                removed += 1
            }
        }

        return { added, removed }
    }, [props.lines])

    const oldText = useMemo((): string => reconstructOldText(props), [props])
    const newText = useMemo((): string => reconstructNewText(props), [props])
    const comments = useMemo(
        (): ReadonlyArray<ICcrDiffComment> => collectFileComments(props),
        [props],
    )

    return (
        <section className="rounded-lg border border-border">
            <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
                <h3 className={TYPOGRAPHY.cardTitle}>{props.filePath}</h3>
                <span className="rounded bg-surface-secondary px-2 py-0.5 text-[11px] text-foreground">
                    +{String(lineCounts.added)} / -{String(lineCounts.removed)}
                </span>
                <span className={TYPOGRAPHY.captionMuted}>
                    {t("reviews:codeDiff.language", { language: props.language })}
                </span>
            </header>
            <div className="overflow-x-auto">
                <ReactDiffViewer
                    oldValue={oldText}
                    newValue={newText}
                    splitView={true}
                    useDarkTheme={false}
                    showDiffOnly={false}
                />
            </div>
            {comments.length > 0 ? (
                <ul className="border-t border-border px-3 py-2">
                    {comments.map(
                        (comment: ICcrDiffComment): ReactElement => (
                            <li
                                key={`${comment.author}-${String(comment.line)}-${comment.side}`}
                                className="mt-1 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
                            >
                                <p className="font-medium">
                                    {comment.author} ({comment.side}:{comment.line})
                                </p>
                                <p>{comment.message}</p>
                            </li>
                        ),
                    )}
                </ul>
            ) : null}
        </section>
    )
}

/**
 * Viewer для code diff с side-by-side layout.
 *
 * Рендерит ReactDiffViewer для каждого файла из массива `files`.
 * Пустое состояние — сообщение "No available diff content".
 *
 * @param props - Props с массивом файлов диффа.
 * @returns Секция с diff viewer.
 */
export function CodeDiffViewer(props: ICodeDiffViewerProps): ReactElement {
    const { t } = useTranslation(["reviews"])

    if (props.files.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
                {t("reviews:codeDiff.noDiffContent")}
            </div>
        )
    }

    return (
        <section className="space-y-4" aria-label={t("reviews:codeDiff.viewerAriaLabel")}>
            <h2 className={TYPOGRAPHY.sectionTitle}>{t("reviews:codeDiff.sectionTitle")}</h2>
            {props.files.map(
                (file): ReactElement => (
                    <CodeDiffFilePanel {...file} key={file.filePath} />
                ),
            )}
        </section>
    )
}
