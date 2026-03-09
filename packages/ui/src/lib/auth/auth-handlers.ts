import type { QueryClient } from "@tanstack/react-query"

import type { IAuthApi } from "@/lib/api"
import { queryKeys } from "@/lib/query/query-keys"

import { clearPersistedAuthSession } from "./auth-session"
import { resolveAuthRedirectUri } from "./auth-url"
import type { TOAuthProvider } from "./types"

/**
 * Создаёт обработчик старта OAuth/OIDC flow.
 *
 * @param authApi Auth endpoint client.
 * @param redirect Redirect callback.
 * @param intendedDestination Path назначения после успешного логина.
 * @param oauthErrorText Текст ошибки OAuth старта.
 * @param setInteractionError Setter UI ошибки.
 * @returns Обработчик входа через provider.
 */
export function createHandleOAuthSignIn(
    authApi: IAuthApi,
    redirect: (authorizationUrl: string) => void,
    intendedDestination: string,
    oauthErrorText: string,
    setInteractionError: (value: string | null) => void,
): (provider: TOAuthProvider) => Promise<void> {
    return async (provider: TOAuthProvider): Promise<void> => {
        setInteractionError(null)

        try {
            const response = await authApi.startOAuth({
                provider,
                redirectUri: resolveAuthRedirectUri(intendedDestination),
            })
            redirect(response.authorizationUrl)
        } catch {
            setInteractionError(oauthErrorText)
        }
    }
}

/**
 * Создаёт обработчик logout flow.
 *
 * @param authApi Auth endpoint client.
 * @param storage Browser storage.
 * @param queryClient Query client.
 * @param logoutErrorText Текст ошибки logout.
 * @param setInteractionError Setter UI ошибки.
 * @returns Обработчик logout.
 */
export function createHandleLogout(
    authApi: IAuthApi,
    storage: Storage | undefined,
    queryClient: QueryClient,
    logoutErrorText: string,
    setInteractionError: (value: string | null) => void,
): () => Promise<void> {
    return async (): Promise<void> => {
        setInteractionError(null)

        try {
            await authApi.logout()
            clearPersistedAuthSession(storage)
            queryClient.setQueryData(queryKeys.auth.session(), null)
        } catch {
            setInteractionError(logoutErrorText)
        }
    }
}
