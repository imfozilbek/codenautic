import {describe, expect, test} from "bun:test"

import {NotFoundError} from "../../../../src/domain/errors/not-found.error"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {
    SCAN_PHASE,
    SCAN_STATUS,
    type IScanProgress,
    type ScanPhase,
} from "../../../../src/application/dto/scanning"
import type {IScanProgressRepository} from "../../../../src/application/ports/outbound/scanning/scan-progress-repository"
import {GetScanStatusUseCase} from "../../../../src/application/use-cases/scanning/get-scan-status.use-case"

class InMemoryScanProgressRepository implements IScanProgressRepository {
    private readonly records: IScanProgress[]

    public constructor() {
        this.records = []
    }

    public save(scanProgress: IScanProgress): Promise<void> {
        const existingIndex = this.records.findIndex(
            (record) => record.scanId === scanProgress.scanId,
        )

        if (existingIndex === -1) {
            this.records.push(scanProgress)
            return Promise.resolve()
        }

        this.records[existingIndex] = scanProgress
        return Promise.resolve()
    }

    public findByScanId(scanId: string): Promise<IScanProgress | null> {
        const found = this.records.find((record) => record.scanId === scanId)
        return Promise.resolve(found ?? null)
    }

    public findByRepoId(repositoryId: string): Promise<readonly IScanProgress[]> {
        return Promise.resolve(
            this.records.filter((record) => record.repositoryId === repositoryId),
        )
    }

    public updateProgress(
        scanId: string,
        processedFiles: number,
        phase: ScanPhase,
    ): Promise<void> {
        const existingIndex = this.records.findIndex((record) => record.scanId === scanId)

        if (existingIndex === -1) {
            return Promise.resolve()
        }

        const current = this.records[existingIndex]
        if (current === undefined) {
            return Promise.resolve()
        }

        this.records[existingIndex] = {
            ...current,
            processedFiles,
            currentPhase: phase,
            updatedAt: "2026-03-03T12:44:00.000Z",
        }

        return Promise.resolve()
    }

    public markCompleted(scanId: string): Promise<void> {
        const existingIndex = this.records.findIndex((record) => record.scanId === scanId)

        if (existingIndex === -1) {
            return Promise.resolve()
        }

        const current = this.records[existingIndex]
        if (current === undefined) {
            return Promise.resolve()
        }

        this.records[existingIndex] = {
            ...current,
            status: SCAN_STATUS.COMPLETED,
            currentPhase: SCAN_PHASE.FINALIZATION,
            updatedAt: "2026-03-03T12:45:00.000Z",
        }

        return Promise.resolve()
    }

    public markFailed(scanId: string, errorMessage: string): Promise<void> {
        const existingIndex = this.records.findIndex((record) => record.scanId === scanId)

        if (existingIndex === -1) {
            return Promise.resolve()
        }

        const current = this.records[existingIndex]
        if (current === undefined) {
            return Promise.resolve()
        }

        this.records[existingIndex] = {
            ...current,
            status: SCAN_STATUS.FAILED,
            errorMessage,
            updatedAt: "2026-03-03T12:46:00.000Z",
        }

        return Promise.resolve()
    }
}

describe("GetScanStatusUseCase", () => {
    test("возвращает прогресс скана по scanId", async () => {
        const scanProgressRepository = new InMemoryScanProgressRepository()
        const progress: IScanProgress = {
            scanId: "scan-1",
            repositoryId: "repo-1",
            status: SCAN_STATUS.SCANNING_FILES,
            totalFiles: 10,
            processedFiles: 3,
            currentPhase: SCAN_PHASE.FILE_PARSING,
            startedAt: "2026-03-03T12:40:00.000Z",
            updatedAt: "2026-03-03T12:42:00.000Z",
        }
        await scanProgressRepository.save(progress)

        const useCase = new GetScanStatusUseCase({
            scanProgressRepository,
        })
        const result = await useCase.execute({
            scanId: "scan-1",
        })

        expect(result.isOk).toBe(true)
        expect(result.value.scanId).toBe("scan-1")
        expect(result.value.processedFiles).toBe(3)
    })

    test("валидация проваливается для пустого scanId", async () => {
        const useCase = new GetScanStatusUseCase({
            scanProgressRepository: new InMemoryScanProgressRepository(),
        })
        const result = await useCase.execute({
            scanId: " ",
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
        const validationError = result.error as ValidationError
        expect(validationError.fields).toEqual([
            {
                field: "scanId",
                message: "must be a non-empty string",
            },
        ])
    })

    test("возвращает NotFoundError, если scanId не найден", async () => {
        const useCase = new GetScanStatusUseCase({
            scanProgressRepository: new InMemoryScanProgressRepository(),
        })
        const result = await useCase.execute({
            scanId: "missing-scan",
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(NotFoundError)
        const notFoundError = result.error as NotFoundError
        expect(notFoundError.code).toBe("NOT_FOUND")
        expect(notFoundError.entityType).toBe("ScanProgress")
        expect(notFoundError.entityId).toBe("missing-scan")
    })
})
