import {describe, expect, test} from "bun:test"

import type {IRepositoryIndex, RepositoryIndexStatus} from "../../../../src/application/dto/scanning"
import {REPOSITORY_INDEX_STATUS} from "../../../../src/application/dto/scanning"

describe("IRepositoryIndex", () => {
    test("поддерживает индекс репозитория и статус", () => {
        const status: RepositoryIndexStatus = REPOSITORY_INDEX_STATUS.INDEXED
        const repositoryIndex: IRepositoryIndex = {
            repositoryId: "repo-001",
            defaultBranch: "main",
            lastScanId: "scan-007",
            lastScanAt: "2026-03-03T10:00:00.000Z",
            totalFiles: 10,
            totalLoc: 2048,
            languages: [
                {
                    language: "TypeScript",
                    fileCount: 9,
                    loc: 1980,
                },
            ],
            status,
        }

        expect(repositoryIndex.repositoryId).toBe("repo-001")
        expect(repositoryIndex.defaultBranch).toBe("main")
        expect(repositoryIndex.status).toBe(REPOSITORY_INDEX_STATUS.INDEXED)
        expect(repositoryIndex.totalLoc).toBe(2048)
    })

    test("поддерживает пустой индекс для незакрашенных репозиториев", () => {
        const repositoryIndex: IRepositoryIndex = {
            repositoryId: "repo-empty",
            defaultBranch: "main",
            totalFiles: 0,
            totalLoc: 0,
            languages: [],
            status: REPOSITORY_INDEX_STATUS.NOT_INDEXED,
        }

        expect(repositoryIndex.totalFiles).toBe(0)
        expect(repositoryIndex.languages).toHaveLength(0)
        expect(repositoryIndex.lastScanId).toBeUndefined()
    })
})
