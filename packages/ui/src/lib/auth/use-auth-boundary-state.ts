import { useEffect, useMemo, useRef, useState } from "react"
import {
    type QueryClient,
    type UseMutationResult,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query"

import type { IAuthApi } from "@/lib/api"
import { queryKeys } from "@/lib/query/query-keys"

import { createHandleLogout, createHandleOAuthSignIn } from "./auth-handlers"
import type { IAuthBoundaryLabels } from "./auth-labels"
import {
    clearPersistedAuthSession,
    loadPersistedAuthSession,
    persistAuthSession,
    shouldRefreshAuthSession,
} from "./auth-session"
import { resolveAuthStatusCodeFromError } from "./auth-status"
import type { TAuthGuardStatusCode } from "./auth-status"
import type { IAuthSession, TOAuthProvider } from "./types"

/**
 * Аргументы внутреннего auth boundary hook.
 */
export interface IUseAuthBoundaryStateArgs {
    readonly authApi: IAuthApi
    readonly storage: Storage | undefined
    readonly redirect: (authorizationUrl: string) => void
    readonly labels: IAuthBoundaryLabels
    readonly intendedDestination: string
}

/**
 * Состояние и действия auth boundary.
 */
export interface IAuthBoundaryState {
    readonly session: IAuthSession | null | undefined
    readonly isPending: boolean
    readonly interactionError: string | null
    readonly authStatusCode: TAuthGuardStatusCode | undefined
    readonly handleOAuthSignIn: (provider: TOAuthProvider) => Promise<void>
    readonly handleLogout: () => Promise<void>
}

/**
 * Собирает runtime-состояние auth boundary: session, refresh, sign-in, logout.
 *
 * @param args Зависимости auth boundary.
 * @returns Текущее состояние и действия UI.
 */
export function useAuthBoundaryState(args: IUseAuthBoundaryStateArgs): IAuthBoundaryState {
    const queryClient = useQueryClient()
    const [interactionError, setInteractionError] = useState<string | null>(null)
    const refreshAttemptRef = useRef<string | null>(null)
    const initialSession = useInitialSession(args.storage)

    const sessionQuery = useQuery({
        queryKey: queryKeys.auth.session(),
        queryFn: async (): Promise<IAuthSession | null> => {
            const response = await args.authApi.getSession()
            return response.session
        },
        initialData: initialSession,
        retry: false,
    })

    const refreshMutation = useMutation({
        mutationFn: async (): Promise<IAuthSession | null> => {
            const response = await args.authApi.refreshSession()
            return response.session
        },
        onSuccess: (session): void => {
            queryClient.setQueryData(queryKeys.auth.session(), session)
        },
        onError: (): void => {
            queryClient.setQueryData(queryKeys.auth.session(), null)
        },
    })

    usePersistedSessionEffect(sessionQuery.data, args.storage)
    useRefreshSessionEffect(sessionQuery.data, refreshMutation, queryClient, refreshAttemptRef)

    return {
        session: sessionQuery.data,
        isPending: sessionQuery.isPending,
        interactionError,
        authStatusCode: resolveAuthStatusCodeFromError(sessionQuery.error),
        handleOAuthSignIn: createHandleOAuthSignIn(
            args.authApi,
            args.redirect,
            args.intendedDestination,
            args.labels.oauthStartFailed,
            setInteractionError,
        ),
        handleLogout: createHandleLogout(
            args.authApi,
            args.storage,
            queryClient,
            args.labels.logoutFailed,
            setInteractionError,
        ),
    }
}

/**
 * Инициализирует session state из безопасного snapshot storage.
 *
 * @param storage Browser storage.
 * @returns Начальная session для React Query или undefined.
 */
function useInitialSession(storage: Storage | undefined): IAuthSession | undefined {
    return useMemo((): IAuthSession | undefined => {
        const cachedSession = loadPersistedAuthSession(storage)
        if (cachedSession === undefined) {
            return undefined
        }

        return {
            provider: cachedSession.provider,
            expiresAt: cachedSession.expiresAt,
            user: cachedSession.user,
        }
    }, [storage])
}

/**
 * Синхронизирует session snapshot в storage при изменении состояния.
 *
 * @param session Текущая auth session.
 * @param storage Browser storage.
 */
function usePersistedSessionEffect(
    session: IAuthSession | null | undefined,
    storage: Storage | undefined,
): void {
    useEffect((): void => {
        if (session === undefined) {
            return
        }

        if (session === null) {
            clearPersistedAuthSession(storage)
            return
        }

        persistAuthSession(storage, session)
    }, [session, storage])
}

/**
 * Автоматически обновляет session, если срок жизни близок к истечению.
 *
 * @param session Текущая auth session.
 * @param refreshMutation Mutation для refresh endpoint.
 * @param queryClient Query client для session key.
 * @param refreshAttemptRef Ref для дедупликации refresh по expiresAt.
 */
function useRefreshSessionEffect(
    session: IAuthSession | null | undefined,
    refreshMutation: UseMutationResult<IAuthSession | null, Error, void, unknown>,
    queryClient: QueryClient,
    refreshAttemptRef: { current: string | null },
): void {
    useEffect((): void => {
        if (session === undefined || session === null) {
            return
        }

        if (shouldRefreshAuthSession(session) !== true) {
            refreshAttemptRef.current = null
            return
        }

        if (refreshAttemptRef.current === session.expiresAt) {
            return
        }

        refreshAttemptRef.current = session.expiresAt
        void refreshMutation.mutateAsync().catch((): void => {
            queryClient.setQueryData(queryKeys.auth.session(), null)
        })
    }, [queryClient, refreshAttemptRef, refreshMutation, session])
}
