import type {
    IScanProgressEvent,
    IScanProgressResponse,
} from "@/lib/api/endpoints/scan-progress.endpoint"

/**
 * Коллекция scan progress для mock API.
 *
 * Хранит in-memory события прогресса сканирования по jobId.
 */
export class ScanProgressCollection {
    /**
     * События прогресса по jobId.
     */
    private eventsByJobId: Map<string, IScanProgressEvent[]> = new Map()

    /**
     * Возвращает прогресс сканирования по jobId.
     *
     * @param jobId - Идентификатор задания.
     * @returns Прогресс с событиями.
     */
    public getProgress(jobId: string): IScanProgressResponse {
        return {
            jobId,
            events: [...(this.eventsByJobId.get(jobId) ?? [])],
        }
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param entries - Начальные записи по jobId.
     */
    public seed(
        entries: ReadonlyArray<{
            readonly jobId: string
            readonly events: ReadonlyArray<IScanProgressEvent>
        }>,
    ): void {
        this.clear()
        for (const entry of entries) {
            this.eventsByJobId.set(entry.jobId, [...entry.events])
        }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.eventsByJobId = new Map()
    }
}
