import type { IChatPanelContext } from "@/components/chat/chat-panel"
import { type TReviewStatus } from "@/components/reviews/review-status-badge"

/** Уровень важности CCR. */
export type TCcrSeverity = "low" | "medium" | "high"

/** Модель строки CCR для UI-экранов review. */
export interface ICcrRowData {
    /** Идентификатор CCR. */
    readonly id: string
    /** Заголовок/тема. */
    readonly title: string
    /** Репозиторий. */
    readonly repository: string
    /** Владелец. */
    readonly assignee: string
    /** Статус. */
    readonly status: TReviewStatus
    /** Количество комментариев. */
    readonly comments: number
    /** Обновление. */
    readonly updatedAt: string
    /** Команда. */
    readonly team: string
    /** Уровень критичности. */
    readonly severity: TCcrSeverity
    /** Прикреплённые файлы. */
    readonly attachedFiles: ReadonlyArray<string>
}

/** Сторона строки диффа. */
export type TCcrDiffLineSide = "left" | "right"

/** Тип статуса строки в диффе. */
export type TCcrDiffLineType = "context" | "removed" | "added"

/** Inline-комментарий к конкретной строке диффа. */
export interface ICcrDiffComment {
    /** Автор комментария. */
    readonly author: string
    /** Текст комментария. */
    readonly message: string
    /** Позиция линии комментария. */
    readonly line: number
    /** Сторона строки для комментария. */
    readonly side: TCcrDiffLineSide
}

/** Одна строка unified-диффа. */
export interface ICcrDiffLine {
    /** Номер строки слева. */
    readonly leftLine?: number
    /** Номер строки справа. */
    readonly rightLine?: number
    /** Содержимое слева. */
    readonly leftText: string
    /** Содержимое справа. */
    readonly rightText: string
    /** Тип изменения строки. */
    readonly type: TCcrDiffLineType
    /** Комментарии к строке. */
    readonly comments?: ReadonlyArray<ICcrDiffComment>
}

/** Дифф по файлу. */
export interface ICcrDiffFile {
    /** Путь файла. */
    readonly filePath: string
    /** Язык для подсветки. */
    readonly language: string
    /** Строки диффа. */
    readonly lines: ReadonlyArray<ICcrDiffLine>
}

/** Тип обратной связи по комментарию. */
export type TReviewCommentFeedback = "like" | "dislike"

/** Комментарий review с вложенностью. */
export interface IReviewCommentThread {
    /** Идентификатор комментария. */
    readonly id: string
    /** Автор комментария. */
    readonly author: string
    /** Сообщение. */
    readonly message: string
    /** Время создания. */
    readonly createdAt: string
    /** Разрешен ли комментарий. */
    readonly isResolved: boolean
    /** Оценка пользователем. */
    readonly feedback?: TReviewCommentFeedback
    /** Вложенные ответы. */
    readonly replies: ReadonlyArray<IReviewCommentThread>
}

/** Mock-thread для review-контекста. */
const MOCK_CCR_REVIEW_THREADS: ReadonlyArray<{
    readonly ccrId: string
    readonly threads: ReadonlyArray<IReviewCommentThread>
}> = [
    {
        ccrId: "ccr-9001",
        threads: [
            {
                id: "t1",
                author: "Ari",
                createdAt: "2026-03-01 10:20",
                feedback: "like",
                isResolved: false,
                message: "Could we log the revoked error as a security event too?",
                replies: [
                    {
                        id: "t1-1",
                        author: "Nika",
                        createdAt: "2026-03-01 10:28",
                        isResolved: false,
                        message: "Good point, we can hook into existing audit logger.",
                        replies: [
                            {
                                id: "t1-1-1",
                                author: "Oleg",
                                createdAt: "2026-03-01 10:33",
                                isResolved: true,
                                feedback: "dislike",
                                message: "Let's not add too much noise for revoked users.",
                                replies: [],
                            },
                        ],
                    },
                ],
            },
            {
                id: "t2",
                author: "Sari",
                createdAt: "2026-03-01 10:42",
                isResolved: false,
                message: "Do we still need return next() here or can middleware be async-safe?",
                replies: [],
            },
        ],
    },
    {
        ccrId: "ccr-9002",
        threads: [
            {
                id: "u1",
                author: "Lena",
                createdAt: "2026-03-01 09:15",
                isResolved: true,
                message: "Need to add exponential backoff to retry queue.",
                replies: [],
            },
        ],
    },
]

/** Mock-диффы для CCR-деталок. */
const MOCK_CCR_DIFFS: ReadonlyArray<{ ccrId: string; files: ReadonlyArray<ICcrDiffFile> }> = [
    {
        ccrId: "ccr-9001",
        files: [
            {
                filePath: "src/auth/middleware.ts",
                language: "typescript",
                lines: [
                    {
                        leftLine: 1,
                        rightLine: 1,
                        leftText: 'import { verifyToken } from "@/lib/auth/legacy"',
                        rightText: 'import { verifyToken } from "@/lib/auth/legacy"',
                        type: "context",
                    },
                    {
                        leftLine: 2,
                        rightLine: 2,
                        leftText: "import { log } from \"./logger\"",
                        rightText: "import { log } from \"./logger\"",
                        type: "context",
                    },
                    {
                        leftLine: 3,
                        rightLine: 3,
                        leftText: "import { isUserBlocked } from \"./policy\"",
                        rightText: 'import { isUserBlocked, isUserRevoked } from "./policy"',
                        type: "added",
                    },
                    {
                        leftLine: 4,
                        rightLine: 4,
                        leftText: "export function authMiddleware(req, res, next) {",
                        rightText: "export function authMiddleware(req, res, next) {",
                        type: "context",
                    },
                    {
                        leftLine: 5,
                        rightLine: 5,
                        leftText: "  const token = req.headers.authorization?.replace(\"Bearer \", \"\")",
                        rightText: "  const token = req.headers.authorization?.replace(\"Bearer \", \"\")",
                        type: "context",
                    },
                    {
                        leftLine: 6,
                        rightLine: 6,
                        leftText: "  const user = verifyToken(token)",
                        rightText: '  const user = verifyToken(token)',
                        type: "context",
                    },
                    {
                        leftLine: 7,
                        rightLine: 7,
                        leftText: "  if (!user || isUserBlocked(user.id)) {",
                        rightText: "  if (!user || isUserBlocked(user.id)) {",
                        type: "context",
                    },
                    {
                        leftLine: 8,
                        rightLine: 8,
                        leftText: '    return res.status(401).json({ error: "invalid token" })',
                        rightText: '    return res.status(401).json({ error: "invalid token" })',
                        type: "context",
                    },
                    {
                        leftLine: 9,
                        rightLine: 9,
                        leftText: "  }",
                        rightText: "  }",
                        type: "context",
                    },
                    {
                        leftLine: 10,
                        rightLine: 10,
                        leftText: "",
                        rightText: '  if (isUserRevoked(user.id)) {',
                        type: "added",
                    },
                    {
                        leftLine: undefined,
                        rightLine: 11,
                        leftText: "",
                        rightText: '    return res.status(401).json({ error: "revoked" })',
                        type: "added",
                        comments: [
                            {
                                author: "Ari",
                                line: 11,
                                message: "Need consistent error message with existing auth errors.",
                                side: "right",
                            },
                        ],
                    },
                    {
                        leftLine: undefined,
                        rightLine: 12,
                        leftText: "",
                        rightText: "  }",
                        type: "added",
                    },
                    {
                        leftLine: 11,
                        rightLine: 13,
                        leftText: "  req.user = user",
                        rightText: "  req.user = user",
                        type: "context",
                    },
                    {
                        leftLine: 12,
                        rightLine: 14,
                        leftText: "  next()",
                        rightText: "  return next()",
                        type: "added",
                    },
                    {
                        leftLine: 13,
                        rightLine: undefined,
                        leftText: "}",
                        rightText: "",
                        type: "removed",
                        comments: [
                            {
                                author: "Nika",
                                line: 13,
                                message: "Should we keep explicit return for middleware consistency?",
                                side: "left",
                            },
                        ],
                    },
                ],
            },
            {
                filePath: "src/auth/index.ts",
                language: "typescript",
                lines: [
                    {
                        leftLine: 1,
                        rightLine: 1,
                        leftText: "export * from \"./middleware\"",
                        rightText: "export * from \"./middleware\"",
                        type: "context",
                    },
                    {
                        leftLine: 2,
                        rightLine: undefined,
                        leftText: "",
                        rightText: "export { isAdmin } from \"./policy\"",
                        type: "added",
                    },
                ],
            },
        ],
    },
    {
        ccrId: "ccr-9002",
        files: [
            {
                filePath: "src/scanner/retry.ts",
                language: "typescript",
                lines: [
                    {
                        leftLine: 1,
                        rightLine: 1,
                        leftText: "import pLimit from \"p-limit\"",
                        rightText: "import pLimit from \"p-limit\"",
                        type: "context",
                    },
                    {
                        leftLine: 2,
                        rightLine: 2,
                        leftText: "import { RetryPolicy } from \"./retry-policy\"",
                        rightText: "import { RetryPolicy } from \"./retry-policy\"",
                        type: "context",
                    },
                    {
                        leftLine: 3,
                        rightLine: 3,
                        leftText: "const DEFAULT_RETRIES = 2",
                        rightText: "const DEFAULT_RETRIES = 3",
                        type: "added",
                    },
                    {
                        leftLine: 4,
                        rightLine: 4,
                        leftText: "const timeout = 500",
                        rightText: "const timeout = 500",
                        type: "context",
                    },
                    {
                        leftLine: 5,
                        rightLine: undefined,
                        leftText: "",
                        rightText: "const jitterBase = 75",
                        type: "added",
                    },
                ],
            },
        ],
    },
]

/**
 * Mock CCR-данные для UI-экранов review.
 */
export const MOCK_CCR_ROWS: ReadonlyArray<ICcrRowData> = [
    {
        assignee: "Ari",
        comments: 12,
        id: "ccr-9001",
        repository: "repo-core",
        severity: "high",
        status: "new",
        team: "runtime",
        title: "Refactor auth middleware",
        updatedAt: "2026-03-01 10:12",
        attachedFiles: ["src/auth/index.ts", "src/auth/middleware.ts"],
    },
    {
        assignee: "Nika",
        comments: 3,
        id: "ccr-9002",
        repository: "repo-ui",
        severity: "medium",
        status: "queued",
        team: "frontend",
        title: "Add retry policy for scanner",
        updatedAt: "2026-03-01 09:40",
        attachedFiles: ["src/scanner/index.ts", "src/scanner/retry.ts"],
    },
    {
        assignee: "Ari",
        comments: 9,
        id: "ccr-9003",
        repository: "repo-mobile",
        severity: "low",
        status: "in_progress",
        team: "mobile",
        title: "Fix memory leaks in stream parser",
        updatedAt: "2026-02-28 19:18",
        attachedFiles: ["src/stream/reader.ts", "src/stream/lexer.ts"],
    },
    {
        assignee: "Sari",
        comments: 4,
        id: "ccr-9004",
        repository: "repo-core",
        severity: "medium",
        status: "approved",
        team: "runtime",
        title: "Tune telemetry export window",
        updatedAt: "2026-02-28 16:10",
        attachedFiles: ["src/telemetry/exporter.ts", "src/telemetry/runner.ts"],
    },
    {
        assignee: "Nika",
        comments: 13,
        id: "ccr-9005",
        repository: "repo-ui",
        severity: "high",
        status: "rejected",
        team: "frontend",
        title: "Large bundle regression",
        updatedAt: "2026-02-28 12:43",
        attachedFiles: ["packages/ui/bundle.config.ts", "packages/ui/webpack.config.ts"],
    },
    {
        assignee: "Oleg",
        comments: 2,
        id: "ccr-9006",
        repository: "repo-api",
        severity: "low",
        status: "in_progress",
        team: "backend",
        title: "Endpoint contract drift",
        updatedAt: "2026-02-27 14:20",
        attachedFiles: ["src/api/contracts/user.ts", "src/api/contracts/review.ts"],
    },
    {
        assignee: "Mila",
        comments: 1,
        id: "ccr-9007",
        repository: "repo-api",
        severity: "high",
        status: "new",
        team: "backend",
        title: "Critical auth edge-case",
        updatedAt: "2026-02-27 11:01",
        attachedFiles: ["src/auth/token.ts", "src/auth/middleware.ts", "src/auth/refresh.ts"],
    },
    {
        assignee: "Ari",
        comments: 5,
        id: "ccr-9008",
        repository: "repo-data",
        severity: "medium",
        status: "queued",
        team: "data",
        title: "Optimize graph traversal path",
        updatedAt: "2026-02-26 17:30",
        attachedFiles: ["src/data/graph.ts", "src/data/shortest-path.ts"],
    },
    {
        assignee: "Nika",
        comments: 6,
        id: "ccr-9009",
        repository: "repo-core",
        severity: "low",
        status: "new",
        team: "runtime",
        title: "Clean up deprecated API docs",
        updatedAt: "2026-02-26 10:12",
        attachedFiles: ["docs/api/legacy.md", "docs/api/overview.md"],
    },
    {
        assignee: "Mila",
        comments: 2,
        id: "ccr-9010",
        repository: "repo-data",
        severity: "medium",
        status: "approved",
        team: "data",
        title: "Rework data contract validation",
        updatedAt: "2026-02-25 09:45",
        attachedFiles: ["src/data/validation.ts", "src/data/schema.ts"],
    },
]

/**
 * Найти CCR по идентификатору.
 *
 * @param id Идентификатор CCR.
 * @returns CCR-строка или undefined.
 */
export function getCcrById(id: string): ICcrRowData | undefined {
    return MOCK_CCR_ROWS.find((ccr): boolean => ccr.id === id)
}

/**
 * Преобразовать CCR в контекст для chat-panel.
 *
 * @param ccr Данные CCR.
 * @returns Контекст чата.
 */
export function ccrToContextItem(ccr: ICcrRowData): IChatPanelContext {
    return {
        attachedFiles: ccr.attachedFiles,
        ccrNumber: ccr.id.replace("ccr-", ""),
        id: ccr.id,
        repoName: ccr.repository,
    }
}

/**
 * Получить mock-диффы для заданного CCR.
 *
 * @param ccrId Идентификатор CCR.
 * @returns Массив диффов по файлам.
 */
export function getCcrDiffById(ccrId: string): ReadonlyArray<ICcrDiffFile> {
    const entry = MOCK_CCR_DIFFS.find((row): boolean => row.ccrId === ccrId)

    if (entry === undefined) {
        return []
    }

    return entry.files
}

/**
 * Получить mock-threadы комментариев для данного CCR.
 *
 * @param ccrId Идентификатор CCR.
 * @returns Массив деревьев комментариев.
 */
export function getCcrReviewThreadsById(ccrId: string): ReadonlyArray<IReviewCommentThread> {
    const entry = MOCK_CCR_REVIEW_THREADS.find((row): boolean => row.ccrId === ccrId)

    if (entry === undefined) {
        return []
    }

    return entry.threads
}
