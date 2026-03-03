import {describe, expect, test} from "bun:test"

import {
    SCAN_PHASE,
    type IScanProgress,
    SCAN_STATUS,
    type ScanPhase,
    type ScanStatus,
} from "../../../../src/application/dto/scanning"

describe("IScanProgress", () => {
    test("поддерживает базовый прогресс сканирования в рабочем состоянии", () => {
        const status: ScanStatus = SCAN_STATUS.SCANNING_FILES
        const phase: ScanPhase = SCAN_PHASE.FILE_PARSING
        const progress: IScanProgress = {
            scanId: "scan-001",
            repositoryId: "repo-001",
            status,
            totalFiles: 20,
            processedFiles: 8,
            currentPhase: phase,
            startedAt: "2026-03-03T08:00:00.000Z",
            updatedAt: "2026-03-03T08:00:02.000Z",
        }

        expect(progress.scanId).toBe("scan-001")
        expect(progress.status).toBe(SCAN_STATUS.SCANNING_FILES)
        expect(progress.currentPhase).toBe(phase)
        expect(progress.totalFiles).toBe(20)
        expect(progress.processedFiles).toBe(8)
    })

    test("поддерживает состояние ошибки со сообщением", () => {
        const progress: IScanProgress = {
            scanId: "scan-002",
            repositoryId: "repo-002",
            status: SCAN_STATUS.FAILED,
            totalFiles: 40,
            processedFiles: 12,
            currentPhase: SCAN_PHASE.GRAPH_BUILDING,
            startedAt: "2026-03-03T08:10:00.000Z",
            updatedAt: "2026-03-03T08:11:00.000Z",
            errorMessage: "scan processing failed",
        }

        expect(progress.status).toBe(SCAN_STATUS.FAILED)
        expect(progress.errorMessage).toBe("scan processing failed")
        expect(progress.currentPhase).toBe(SCAN_PHASE.GRAPH_BUILDING)
        expect(progress.updatedAt).toBe("2026-03-03T08:11:00.000Z")
    })
})
