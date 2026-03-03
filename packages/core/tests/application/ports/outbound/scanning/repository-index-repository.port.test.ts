import {describe, expect, test} from "bun:test"

import type {IRepositoryIndex, RepositoryIndexStatus} from "../../../../../src/application/dto/scanning"
import {REPOSITORY_INDEX_STATUS} from "../../../../../src/application/dto/scanning"
import type {IRepositoryIndexRepository} from "../../../../../src/application/ports/outbound/scanning/repository-index-repository"

class InMemoryRepositoryIndexRepository implements IRepositoryIndexRepository {
    private readonly indexes: IRepositoryIndex[]

    public constructor() {
        this.indexes = []
    }

    public getByRepositoryId(repositoryId: string): Promise<IRepositoryIndex | null> {
        return Promise.resolve(
            this.indexes.find((index) => index.repositoryId === repositoryId) ?? null,
        )
    }

    public save(repositoryIndex: IRepositoryIndex): Promise<void> {
        const existingIndex = this.indexes.findIndex(
            (index) => index.repositoryId === repositoryIndex.repositoryId,
        )

        if (existingIndex === -1) {
            this.indexes.push(repositoryIndex)
            return Promise.resolve()
        }

        this.indexes[existingIndex] = repositoryIndex
        return Promise.resolve()
    }

    public async updateStatus(
        repositoryId: string,
        status: RepositoryIndexStatus,
    ): Promise<void> {
        const existingIndex = this.indexes.find((index) => index.repositoryId === repositoryId)

        if (existingIndex === undefined) {
            return
        }

        const nextIndex: IRepositoryIndex = {
            ...existingIndex,
            status,
        }

        await this.save(nextIndex)
    }

    public async updateLastScan(
        repositoryId: string,
        scanId: string,
        scannedAt: string,
    ): Promise<void> {
        const existingIndex = this.indexes.find((index) => index.repositoryId === repositoryId)

        if (existingIndex === undefined) {
            return
        }

        const nextIndex: IRepositoryIndex = {
            ...existingIndex,
            lastScanId: scanId,
            lastScanAt: scannedAt,
        }

        await this.save(nextIndex)
    }
}

describe("IRepositoryIndexRepository contract", () => {
    test("save и getByRepositoryId возвращают сохраненный индекс", async () => {
        const indexRepository = new InMemoryRepositoryIndexRepository()
        const index: IRepositoryIndex = {
            repositoryId: "repo-1",
            defaultBranch: "main",
            totalFiles: 12,
            totalLoc: 3000,
            languages: [
                {
                    language: "TypeScript",
                    fileCount: 8,
                    loc: 2500,
                },
            ],
            status: REPOSITORY_INDEX_STATUS.INDEXED,
        }

        await indexRepository.save(index)
        const saved = await indexRepository.getByRepositoryId("repo-1")

        expect(saved?.repositoryId).toBe("repo-1")
        expect(saved?.status).toBe(REPOSITORY_INDEX_STATUS.INDEXED)
    })

    test("updateStatus и updateLastScan обновляют отдельные поля", async () => {
        const indexRepository = new InMemoryRepositoryIndexRepository()
        const index: IRepositoryIndex = {
            repositoryId: "repo-2",
            defaultBranch: "main",
            totalFiles: 5,
            totalLoc: 1000,
            languages: [],
            status: REPOSITORY_INDEX_STATUS.NOT_INDEXED,
        }

        await indexRepository.save(index)
        await indexRepository.updateStatus("repo-2", REPOSITORY_INDEX_STATUS.INDEXING)

        const indexing = await indexRepository.getByRepositoryId("repo-2")
        expect(indexing?.status).toBe(REPOSITORY_INDEX_STATUS.INDEXING)

        await indexRepository.updateLastScan("repo-2", "scan-99", "2026-03-03T12:00:00.000Z")
        const updated = await indexRepository.getByRepositoryId("repo-2")
        expect(updated?.lastScanId).toBe("scan-99")
        expect(updated?.lastScanAt).toBe("2026-03-03T12:00:00.000Z")
    })
})
