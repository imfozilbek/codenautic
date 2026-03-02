/**
 * Supported inline comment sides in diff views.
 */
export const INLINE_COMMENT_SIDE = {
    LEFT: "LEFT",
    RIGHT: "RIGHT",
} as const

/**
 * Inline comment side literal type.
 */
export type InlineCommentSide = (typeof INLINE_COMMENT_SIDE)[keyof typeof INLINE_COMMENT_SIDE]

/**
 * Platform-agnostic comment payload.
 */
export interface ICommentDTO {
    readonly id: string
    readonly body: string
    readonly author: string
    readonly createdAt: string
}

/**
 * Platform-agnostic inline comment payload.
 */
export interface IInlineCommentDTO extends ICommentDTO {
    readonly filePath: string
    readonly line: number
    readonly side: InlineCommentSide
}
