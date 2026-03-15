import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IJob,
    IJobActionRequest,
    IJobActionResponse,
    IJobSchedulesResponse,
    IJobsApi,
    IJobsListResponse,
    IUpdateScheduleRequest,
} from "@/lib/api/endpoints/jobs.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const apiInstance: { readonly jobs: IJobsApi } = createApiContracts()

/**
 * Параметры useJobs().
 */
export interface IUseJobsArgs {
    /**
     * Включить/выключить автозагрузку.
     */
    readonly enabled?: boolean
}

/**
 * Результат useJobs().
 */
export interface IUseJobsResult {
    /**
     * Query списка jobs и audit trail.
     */
    readonly jobsQuery: UseQueryResult<IJobsListResponse, Error>
    /**
     * Query расписаний.
     */
    readonly schedulesQuery: UseQueryResult<IJobSchedulesResponse, Error>
    /**
     * Мутация выполнения действия над job.
     */
    readonly performAction: UseMutationResult<IJobActionResponse, Error, IJobActionRequest>
    /**
     * Мутация обновления расписания.
     */
    readonly updateSchedule: UseMutationResult<IJobSchedulesResponse, Error, IUpdateScheduleRequest>
}

/**
 * React Query хук для operations jobs monitor.
 *
 * Загружает jobs, audit trail и расписания.
 * Предоставляет мутации для действий над jobs и обновления расписаний.
 *
 * @param args - Конфигурация загрузки.
 * @returns Queries и мутации для jobs.
 */
export function useJobs(args: IUseJobsArgs = {}): IUseJobsResult {
    const { enabled = true } = args
    const queryClient = useQueryClient()

    const jobsQuery = useQuery({
        queryKey: queryKeys.jobs.all(),
        queryFn: async (): Promise<IJobsListResponse> => {
            return apiInstance.jobs.listJobs()
        },
        enabled,
    })

    const schedulesQuery = useQuery({
        queryKey: queryKeys.jobs.schedules(),
        queryFn: async (): Promise<IJobSchedulesResponse> => {
            return apiInstance.jobs.getSchedules()
        },
        enabled,
    })

    const performAction = useMutation<IJobActionResponse, Error, IJobActionRequest>({
        mutationFn: async (request: IJobActionRequest): Promise<IJobActionResponse> => {
            return apiInstance.jobs.performAction(request)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.jobs.all(),
            })
        },
    })

    const updateSchedule = useMutation<IJobSchedulesResponse, Error, IUpdateScheduleRequest>({
        mutationFn: async (request: IUpdateScheduleRequest): Promise<IJobSchedulesResponse> => {
            return apiInstance.jobs.updateSchedule(request)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.jobs.schedules(),
            })
        },
    })

    return {
        jobsQuery,
        schedulesQuery,
        performAction,
        updateSchedule,
    }
}
