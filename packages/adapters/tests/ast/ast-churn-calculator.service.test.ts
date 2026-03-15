import {describe, expect, test} from "bun:test"

import {
    AST_CHURN_CALCULATOR_ERROR_CODE,
    AstChurnCalculatorError,
    AstChurnCalculatorService,
    type AstChurnCalculatorExecuteGit,
} from "../../src/ast"

type AstChurnCalculatorErrorCode =
    (typeof AST_CHURN_CALCULATOR_ERROR_CODE)[keyof typeof AST_CHURN_CALCULATOR_ERROR_CODE]

interface IExecuteGitCall {
    readonly command: string
    readonly args: readonly string[]
    readonly cwd: string
}

/**
 * Asserts typed AST churn calculator error for async action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstChurnCalculatorError(
    callback: () => Promise<unknown>,
    code: AstChurnCalculatorErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstChurnCalculatorError)

        if (error instanceof AstChurnCalculatorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstChurnCalculatorError to be thrown")
}

/**
 * Resolves file path argument from `git log` invocation.
 *
 * @param args Git command arguments.
 * @returns File path argument.
 */
function resolveFilePathArgument(args: readonly string[]): string {
    const separatorIndex = args.indexOf("--")
    const filePath = separatorIndex >= 0 ? args[separatorIndex + 1] : undefined
    if (typeof filePath === "string") {
        return filePath
    }

    throw new Error("Expected git command to contain file path argument")
}

describe("AstChurnCalculatorService", () => {
    test("calculates churn from unique git commits per file", async () => {
        const calls: IExecuteGitCall[] = []
        const executeGit: AstChurnCalculatorExecuteGit = (
            command,
            args,
            cwd,
        ): Promise<string> => {
            calls.push({
                command,
                args,
                cwd,
            })

            const filePath = resolveFilePathArgument(args)
            if (filePath === "src/a.ts") {
                return Promise.resolve("aaaa1111\nbbbb2222\naaaa1111\n")
            }

            return Promise.resolve("")
        }
        const service = new AstChurnCalculatorService({
            executeGit,
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })

        const result = await service.calculate({
            repositoryPath: " /tmp/repo ",
            filePaths: [" src/b.ts ", "src/a.ts"],
            days: 10,
        })

        expect(result.items).toEqual([
            {
                filePath: "src/a.ts",
                churn: 2,
            },
            {
                filePath: "src/b.ts",
                churn: 0,
            },
        ])
        expect(result.summary).toEqual({
            fileCount: 2,
            totalChurn: 2,
            days: 10,
            sinceIso: "2026-03-05T12:00:00.000Z",
        })
        expect(calls).toHaveLength(2)
        expect(calls[0]).toEqual({
            command: "git",
            args: ["log", "--since=2026-03-05T12:00:00.000Z", "--pretty=format:%H", "--", "src/a.ts"],
            cwd: "/tmp/repo",
        })
        expect(calls[1]).toEqual({
            command: "git",
            args: ["log", "--since=2026-03-05T12:00:00.000Z", "--pretty=format:%H", "--", "src/b.ts"],
            cwd: "/tmp/repo",
        })
    })

    test("throws typed errors for invalid churn calculator input", async () => {
        const service = new AstChurnCalculatorService({
            executeGit: () => Promise.resolve(""),
        })

        await expectAstChurnCalculatorError(
            () =>
                service.calculate({
                    repositoryPath: " ",
                    filePaths: ["src/a.ts"],
                }),
            AST_CHURN_CALCULATOR_ERROR_CODE.INVALID_REPOSITORY_PATH,
        )

        await expectAstChurnCalculatorError(
            () =>
                service.calculate({
                    repositoryPath: "/tmp/repo",
                    filePaths: [],
                }),
            AST_CHURN_CALCULATOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )

        await expectAstChurnCalculatorError(
            () =>
                service.calculate({
                    repositoryPath: "/tmp/repo",
                    filePaths: ["src/a.ts", "src/a.ts"],
                }),
            AST_CHURN_CALCULATOR_ERROR_CODE.DUPLICATE_FILE_PATH,
        )

        await expectAstChurnCalculatorError(
            () =>
                service.calculate({
                    repositoryPath: "/tmp/repo",
                    filePaths: ["src/a.ts"],
                    days: 0,
                }),
            AST_CHURN_CALCULATOR_ERROR_CODE.INVALID_DAYS,
        )
    })

    test("wraps git failures into typed churn errors", async () => {
        const service = new AstChurnCalculatorService({
            executeGit: () => Promise.reject(new Error("fatal: not a git repository")),
        })

        await expectAstChurnCalculatorError(
            () =>
                service.calculate({
                    repositoryPath: "/tmp/repo",
                    filePaths: ["src/a.ts"],
                }),
            AST_CHURN_CALCULATOR_ERROR_CODE.GIT_LOG_FAILED,
        )
    })
})
