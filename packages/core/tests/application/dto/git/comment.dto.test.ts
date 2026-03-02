import {describe, expect, test} from "bun:test"

import {
    INLINE_COMMENT_SIDE,
    type ICommentDTO,
    type IInlineCommentDTO,
} from "../../../../src/application/dto/git/comment.dto"

describe("Comment DTOs", () => {
    test("supports base comment payload", () => {
        const comment: ICommentDTO = {
            id: "comment-1",
            body: "Please rename this variable for clarity",
            author: "review-bot",
            createdAt: "2026-03-03T08:00:00.000Z",
        }

        expect(comment.id).toBe("comment-1")
        expect(comment.author).toBe("review-bot")
    })

    test("supports inline comment payload with side", () => {
        const inlineComment: IInlineCommentDTO = {
            id: "comment-2",
            body: "Potential null dereference",
            author: "review-bot",
            createdAt: "2026-03-03T08:01:00.000Z",
            filePath: "src/service.ts",
            line: 27,
            side: INLINE_COMMENT_SIDE.RIGHT,
        }

        expect(inlineComment.side).toBe("RIGHT")
        expect(inlineComment.filePath).toBe("src/service.ts")
    })
})
