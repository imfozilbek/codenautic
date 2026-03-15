import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IBillingResponse,
    IInviteOrgMemberRequest,
    IOrgMemberResponse,
    IOrgMembersResponse,
    IOrgProfileResponse,
    IOrganizationApi,
    IRemoveOrgMemberRequest,
    IUpdateOrgMemberRoleRequest,
    IUpdateOrgProfileRequest,
    IUpdatePlanRequest,
} from "@/lib/api/endpoints/organization.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const apiInstance: { readonly organization: IOrganizationApi } = createApiContracts()

/**
 * Параметры useOrganization().
 */
export interface IUseOrganizationArgs {
    /**
     * Включить/выключить автозагрузку профиля, участников и биллинга.
     */
    readonly enabled?: boolean
}

/**
 * Результат useOrganization().
 */
export interface IUseOrganizationResult {
    /**
     * Query профиля организации.
     */
    readonly profileQuery: UseQueryResult<IOrgProfileResponse, Error>
    /**
     * Query списка участников организации.
     */
    readonly membersQuery: UseQueryResult<IOrgMembersResponse, Error>
    /**
     * Query состояния биллинга.
     */
    readonly billingQuery: UseQueryResult<IBillingResponse, Error>
    /**
     * Мутация обновления профиля.
     */
    readonly updateProfile: UseMutationResult<
        IOrgProfileResponse,
        Error,
        IUpdateOrgProfileRequest
    >
    /**
     * Мутация приглашения участника.
     */
    readonly inviteMember: UseMutationResult<
        IOrgMemberResponse,
        Error,
        IInviteOrgMemberRequest
    >
    /**
     * Мутация обновления роли участника.
     */
    readonly updateMemberRole: UseMutationResult<
        IOrgMemberResponse,
        Error,
        IUpdateOrgMemberRoleRequest
    >
    /**
     * Мутация удаления участника.
     */
    readonly removeMember: UseMutationResult<
        { readonly removed: boolean },
        Error,
        IRemoveOrgMemberRequest
    >
    /**
     * Мутация обновления тарифного плана.
     */
    readonly updatePlan: UseMutationResult<IBillingResponse, Error, IUpdatePlanRequest>
}

/**
 * React Query хук для операций над организацией.
 *
 * Загружает профиль, участников и биллинг.
 * Предоставляет мутации для обновления профиля, управления участниками и плана.
 *
 * @param args - Конфигурация загрузки.
 * @returns Queries и мутации для организации.
 */
export function useOrganization(args: IUseOrganizationArgs = {}): IUseOrganizationResult {
    const { enabled = true } = args
    const queryClient = useQueryClient()

    const profileQuery = useQuery({
        queryKey: queryKeys.organization.profile(),
        queryFn: async (): Promise<IOrgProfileResponse> => {
            return apiInstance.organization.getProfile()
        },
        enabled,
    })

    const membersQuery = useQuery({
        queryKey: queryKeys.organization.members(),
        queryFn: async (): Promise<IOrgMembersResponse> => {
            return apiInstance.organization.getMembers()
        },
        enabled,
    })

    const billingQuery = useQuery({
        queryKey: queryKeys.organization.billing(),
        queryFn: async (): Promise<IBillingResponse> => {
            return apiInstance.organization.getBilling()
        },
        enabled,
    })

    const updateProfile = useMutation<
        IOrgProfileResponse,
        Error,
        IUpdateOrgProfileRequest
    >({
        mutationFn: async (
            data: IUpdateOrgProfileRequest,
        ): Promise<IOrgProfileResponse> => {
            return apiInstance.organization.updateProfile(data)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.profile(),
            })
        },
    })

    const inviteMember = useMutation<
        IOrgMemberResponse,
        Error,
        IInviteOrgMemberRequest
    >({
        mutationFn: async (
            data: IInviteOrgMemberRequest,
        ): Promise<IOrgMemberResponse> => {
            return apiInstance.organization.inviteMember(data)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.members(),
            })
        },
    })

    const updateMemberRole = useMutation<
        IOrgMemberResponse,
        Error,
        IUpdateOrgMemberRoleRequest
    >({
        mutationFn: async (
            data: IUpdateOrgMemberRoleRequest,
        ): Promise<IOrgMemberResponse> => {
            return apiInstance.organization.updateMemberRole(data)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.members(),
            })
        },
    })

    const removeMember = useMutation<
        { readonly removed: boolean },
        Error,
        IRemoveOrgMemberRequest
    >({
        mutationFn: async (
            data: IRemoveOrgMemberRequest,
        ): Promise<{ readonly removed: boolean }> => {
            return apiInstance.organization.removeMember(data)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.members(),
            })
        },
    })

    const updatePlan = useMutation<IBillingResponse, Error, IUpdatePlanRequest>({
        mutationFn: async (data: IUpdatePlanRequest): Promise<IBillingResponse> => {
            return apiInstance.organization.updatePlan(data)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.billing(),
            })
        },
    })

    return {
        profileQuery,
        membersQuery,
        billingQuery,
        updateProfile,
        inviteMember,
        updateMemberRole,
        removeMember,
        updatePlan,
    }
}
