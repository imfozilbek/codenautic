import type { ReactElement, ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
    type QueryClient,
    type UseMutationResult,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui"
import type { IAuthApi } from "@/lib/api"
import { createApiContracts, isApiHttpError } from "@/lib/api"
import { queryKeys } from "@/lib/query/query-keys"
import {
    clearPersistedAuthSession,
    loadPersistedAuthSession,
    persistAuthSession,
    shouldRefreshAuthSession,
} from "./auth-session"
import { OAUTH_PROVIDERS, type IAuthSession, type TOAuthProvider } from "./types"

const DEFAULT_AUTH_API = createApiContracts().auth

export type TAuthGuardStatusCode = 401 | 403

export interface IAuthBoundaryRenderContext {
    /** Отображаемое имя пользователя. */
    readonly userName: string
    /** Email пользователя для отображения. */
    readonly userEmail: string
    /** Handler для выхода из текущей сессии. */
    readonly onSignOut: () => Promise<void>
}

/**
 * Конфигурация boundary-компонента для защищённых route.
 */
export interface IAuthBoundaryProps {
    readonly children: ReactElement | ((context: IAuthBoundaryRenderContext) => ReactElement)
    readonly authApi?: IAuthApi
    readonly storage?: Storage
    readonly onRedirect?: (authorizationUrl: string) => void
    readonly loginPath?: string
    readonly intendedDestination?: string
    readonly authStatusHint?: TAuthGuardStatusCode
    readonly onNavigateToLogin?: (loginPath: string) => void
}

/**
 * Тексты UI для auth boundary.
 */
interface IAuthBoundaryLabels {
    readonly appTitle: string
    readonly checkingSession: string
    readonly loginTitle: string
    readonly logout: string
    readonly oauthStartFailed: string
    readonly logoutFailed: string
    readonly unauthorizedState: string
    readonly forbiddenState: string
}

/**
 * Аргументы внутреннего auth boundary hook.
 */
interface IUseAuthBoundaryStateArgs {
    readonly authApi: IAuthApi
    readonly storage: Storage | undefined
    readonly redirect: (authorizationUrl: string) => void
    readonly labels: IAuthBoundaryLabels
    readonly intendedDestination: string
}

/**
 * Состояние и действия auth boundary.
 */
interface IAuthBoundaryState {
    readonly session: IAuthSession | null | undefined
    readonly isPending: boolean
    readonly interactionError: string | null
    readonly authStatusCode: TAuthGuardStatusCode | undefined
    readonly handleOAuthSignIn: (provider: TOAuthProvider) => Promise<void>
    readonly handleLogout: () => Promise<void>
}

/**
 * Граница авторизации для защищённых route с refresh и logout flow.
 *
 * @param props Параметры auth boundary.
 * @returns UI для loading/login/authenticated состояний.
 */
export function AuthBoundary(props: IAuthBoundaryProps): ReactElement {
    const { t } = useTranslation(["auth", "common"])
    const labels = createAuthBoundaryLabels(t)
    const storage = props.storage ?? getSessionStorageOrUndefined()
    const authApi = props.authApi ?? DEFAULT_AUTH_API
    const redirect = props.onRedirect ?? redirectToAuthorizationUrl
    const intendedDestination = resolveIntendedDestinationPath(props.intendedDestination)

    const state = useAuthBoundaryState({
        authApi,
        storage,
        redirect,
        labels,
        intendedDestination,
    })
    const authStatusCode = resolveAuthStatusCode(state.authStatusCode, props.authStatusHint)
    const effectiveAuthStatusCode = resolveDefaultAuthStatusCode(authStatusCode, state.session)
    const shouldRedirectToLogin = shouldNavigateToLogin(
        props.loginPath,
        state.isPending,
        state.session,
        effectiveAuthStatusCode,
    )
    const loginRedirectPath = createLoginRedirectPath(
        props.loginPath,
        intendedDestination,
        effectiveAuthStatusCode,
    )
    const navigateToLogin = props.onNavigateToLogin ?? navigateToPath

    useEffect((): void => {
        if (shouldRedirectToLogin !== true) {
            return
        }

        if (loginRedirectPath === undefined) {
            return
        }

        navigateToLogin(loginRedirectPath)
    }, [loginRedirectPath, navigateToLogin, shouldRedirectToLogin])

    if (state.isPending === true || shouldRedirectToLogin === true) {
        return renderAuthLoadingState(labels.appTitle, labels.checkingSession)
    }

    const authStatusMessage = resolveAuthStatusMessage(effectiveAuthStatusCode, labels)

    if (state.session === undefined) {
        return (
            <AuthLoginPanel
                appTitle={labels.appTitle}
                description={labels.loginTitle}
                interactionError={state.interactionError}
                onOAuthSignIn={state.handleOAuthSignIn}
                statusMessage={authStatusMessage}
            />
        )
    }

    if (state.session === null) {
        return (
            <AuthLoginPanel
                appTitle={labels.appTitle}
                description={labels.loginTitle}
                interactionError={state.interactionError}
                onOAuthSignIn={state.handleOAuthSignIn}
                statusMessage={authStatusMessage}
            />
        )
    }

    if (typeof props.children === "function") {
        return props.children({
            userName: state.session.user.displayName,
            userEmail: state.session.user.email,
            onSignOut: state.handleLogout,
        })
    }

    return (
        <AuthenticatedShell
            appTitle={labels.appTitle}
            userDisplayName={state.session.user.displayName}
            userEmail={state.session.user.email}
            logoutLabel={labels.logout}
            onLogout={state.handleLogout}
        >
            <>
                {state.interactionError !== null ? (
                    <p
                        aria-live="assertive"
                        className="px-6 pb-2 text-sm text-rose-700"
                        role="alert"
                    >
                        {state.interactionError}
                    </p>
                ) : null}
                {props.children}
            </>
        </AuthenticatedShell>
    )
}

/**
 * Собирает runtime-состояние auth boundary: session, refresh, sign-in, logout.
 *
 * @param args Зависимости auth boundary.
 * @returns Текущее состояние и действия UI.
 */
function useAuthBoundaryState(args: IUseAuthBoundaryStateArgs): IAuthBoundaryState {
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
function createHandleOAuthSignIn(
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
function createHandleLogout(
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

/**
 * Формирует переводимые метки auth boundary.
 *
 * @param t Функция i18n перевода.
 * @returns Набор локализованных текстов.
 */
function createAuthBoundaryLabels(t: (key: string) => string): IAuthBoundaryLabels {
    return {
        appTitle: t("common:appTitle"),
        checkingSession: t("auth:checkingSession"),
        loginTitle: t("auth:loginTitle"),
        logout: t("auth:logout"),
        oauthStartFailed: t("auth:oauthStartFailed"),
        logoutFailed: t("auth:logoutFailed"),
        unauthorizedState: t("auth:unauthorizedState"),
        forbiddenState: t("auth:forbiddenState"),
    }
}

/**
 * Рендерит loading состояние проверки auth session.
 *
 * @param appTitle Заголовок приложения.
 * @param message Сообщение загрузки.
 * @returns Loading UI.
 */
function renderAuthLoadingState(appTitle: string, message: string): ReactElement {
    return (
        <section
            aria-busy="true"
            className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8"
        >
            <h1 className="text-3xl font-semibold tracking-tight">{appTitle}</h1>
            <p className="mt-4 text-base text-slate-600">{message}</p>
        </section>
    )
}

/**
 * Свойства панели входа.
 */
interface IAuthLoginPanelProps {
    readonly appTitle: string
    readonly description: string
    readonly interactionError: string | null
    readonly statusMessage: string | undefined
    readonly onOAuthSignIn: (provider: TOAuthProvider) => Promise<void>
}

/**
 * Панель входа для неавторизованных пользователей.
 *
 * @param props Параметры панели входа.
 * @returns Login UI.
 */
function AuthLoginPanel(props: IAuthLoginPanelProps): ReactElement {
    return (
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-semibold tracking-tight">{props.appTitle}</h1>
            <p className="mt-4 text-base text-slate-600">{props.description}</p>
            {props.statusMessage !== undefined ? (
                <p aria-live="polite" className="mt-3 text-sm text-amber-700" role="status">
                    {props.statusMessage}
                </p>
            ) : null}
            <div className="mt-8 grid w-full max-w-sm gap-3">
                {OAUTH_PROVIDERS.map((provider) => (
                    <Button
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-100"
                        key={provider}
                        onPress={(): void => {
                            void props.onOAuthSignIn(provider)
                        }}
                    >
                        {resolveProviderLabel(provider)}
                    </Button>
                ))}
            </div>
            {props.interactionError !== null ? (
                <p aria-live="assertive" className="mt-4 text-sm text-rose-700" role="alert">
                    {props.interactionError}
                </p>
            ) : null}
        </section>
    )
}

/**
 * Свойства shell для авторизованного пользователя.
 */
interface IAuthenticatedShellProps {
    readonly appTitle: string
    readonly userDisplayName: string
    readonly userEmail: string
    readonly logoutLabel: string
    readonly onLogout: () => Promise<void>
    readonly children: ReactElement
}

/**
 * Shell защищённого UI с user-инфо и кнопкой logout.
 *
 * @param props Параметры authenticated shell.
 * @returns Контейнер защищённого интерфейса.
 */
function AuthenticatedShell(props: IAuthenticatedShellProps): ReactElement {
    return (
        <div className="min-h-screen">
            <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6">
                <div>
                    <p className="text-sm text-slate-500">{props.appTitle}</p>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {props.userDisplayName}
                    </h2>
                    <p className="text-sm text-slate-600">{props.userEmail}</p>
                </div>
                <Button
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                    onPress={(): void => {
                        void props.onLogout()
                    }}
                >
                    {props.logoutLabel}
                </Button>
            </header>
            {props.children}
        </div>
    )
}

/**
 * Определяет label OAuth/OIDC provider для login UI.
 *
 * @param provider OAuth/OIDC provider.
 * @returns Пользовательский label кнопки входа.
 */
function resolveProviderLabel(provider: TOAuthProvider): string {
    if (provider === "oidc") {
        return "OIDC"
    }

    if (provider === "gitlab") {
        return "GitLab"
    }

    if (provider === "github") {
        return "GitHub"
    }

    return "Google"
}

/**
 * Формирует redirect URI для OAuth/OIDC flow.
 *
 * @param intendedDestination Целевой путь после успешной авторизации.
 * @returns Redirect URI в текущем origin.
 */
function resolveAuthRedirectUri(intendedDestination: string): string {
    return new URL(intendedDestination, window.location.origin).toString()
}

/**
 * Возвращает актуальный status code для auth guard.
 *
 * @param runtimeCode Код, вычисленный из runtime ошибки.
 * @param hintCode Код, переданный через route search.
 * @returns Приоритетный статус для UI/redirect.
 */
function resolveAuthStatusCode(
    runtimeCode: TAuthGuardStatusCode | undefined,
    hintCode: TAuthGuardStatusCode | undefined,
): TAuthGuardStatusCode | undefined {
    if (runtimeCode !== undefined) {
        return runtimeCode
    }

    return hintCode
}

/**
 * Подставляет default auth код для null session (анонимный пользователь).
 *
 * @param authStatusCode Текущий auth status code.
 * @param session Текущее session состояние.
 * @returns Итоговый статус для redirect/login state.
 */
function resolveDefaultAuthStatusCode(
    authStatusCode: TAuthGuardStatusCode | undefined,
    session: IAuthSession | null | undefined,
): TAuthGuardStatusCode | undefined {
    if (authStatusCode !== undefined) {
        return authStatusCode
    }

    if (session === null) {
        return 401
    }

    return undefined
}

/**
 * Извлекает auth status code из ошибки запроса session endpoint.
 *
 * @param error Ошибка загрузки auth session.
 * @returns `401`/`403` или undefined.
 */
function resolveAuthStatusCodeFromError(error: Error | null): TAuthGuardStatusCode | undefined {
    if (error === null) {
        return undefined
    }

    if (isApiHttpError(error) !== true) {
        return undefined
    }

    if (error.status === 401 || error.status === 403) {
        return error.status
    }

    return undefined
}

/**
 * Определяет, нужно ли перенаправить пользователя на login route.
 *
 * @param loginPath Путь login route.
 * @param isPending Признак pending состояния session query.
 * @param session Текущая auth session.
 * @param authStatusCode Текущий auth статус.
 * @returns true, если нужно выполнить redirect.
 */
function shouldNavigateToLogin(
    loginPath: string | undefined,
    isPending: boolean,
    session: IAuthSession | null | undefined,
    authStatusCode: TAuthGuardStatusCode | undefined,
): boolean {
    if (loginPath === undefined || isPending === true) {
        return false
    }

    if (isCurrentPage(loginPath) === true) {
        return false
    }

    if (session !== undefined && session !== null) {
        return false
    }

    if (authStatusCode === 401 || authStatusCode === 403 || session === null) {
        return true
    }

    return false
}

/**
 * Формирует login route path с сохранением intended destination.
 *
 * @param loginPath Базовый путь страницы логина.
 * @param intendedDestination Целевой путь после успешной авторизации.
 * @param authStatusCode Код auth статуса.
 * @returns Финальный redirect path.
 */
function createLoginRedirectPath(
    loginPath: string | undefined,
    intendedDestination: string,
    authStatusCode: TAuthGuardStatusCode | undefined,
): string | undefined {
    if (loginPath === undefined) {
        return undefined
    }

    const searchParams = new URLSearchParams()
    searchParams.set("next", intendedDestination)

    if (authStatusCode === 401 || authStatusCode === 403) {
        searchParams.set("reason", String(authStatusCode))
    }

    return `${loginPath}?${searchParams.toString()}`
}

/**
 * Формирует текущий относительный URL (path + search + hash).
 *
 * @returns Относительный URL текущей страницы.
 */
function getCurrentRelativeUrl(): string {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

/**
 * Проверяет, открыта ли текущая страница по целевому path.
 *
 * @param path Path для сравнения.
 * @returns true, если path совпадает с текущим pathname.
 */
function isCurrentPage(path: string): boolean {
    return window.location.pathname === path
}

/**
 * Нормализует intended destination и блокирует внешние URL.
 *
 * @param destination Желаемый путь после авторизации.
 * @returns Безопасный относительный путь.
 */
function resolveIntendedDestinationPath(destination: string | undefined): string {
    if (destination === undefined) {
        return getCurrentRelativeUrl()
    }

    const trimmedDestination = destination.trim()
    if (trimmedDestination.length === 0) {
        return "/"
    }

    if (trimmedDestination.startsWith("/")) {
        return trimmedDestination
    }

    try {
        const parsedDestination = new URL(trimmedDestination)
        if (parsedDestination.origin !== window.location.origin) {
            return "/"
        }

        return `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`
    } catch {
        return "/"
    }
}

/**
 * Возвращает текст auth статуса для явного отображения 401/403 состояний.
 *
 * @param authStatusCode Auth статус.
 * @param labels Локализованные метки auth boundary.
 * @returns Текстовое сообщение или undefined.
 */
function resolveAuthStatusMessage(
    authStatusCode: TAuthGuardStatusCode | undefined,
    labels: IAuthBoundaryLabels,
): string | undefined {
    if (authStatusCode === 401) {
        return labels.unauthorizedState
    }

    if (authStatusCode === 403) {
        return labels.forbiddenState
    }

    return undefined
}

/**
 * Выполняет browser redirect на внешний OAuth authorization URL.
 *
 * @param authorizationUrl URL авторизации.
 */
function redirectToAuthorizationUrl(authorizationUrl: string): void {
    window.location.assign(authorizationUrl)
}

/**
 * Выполняет redirect на внутренний путь приложения.
 *
 * @param path Внутренний путь с query-параметрами.
 */
function navigateToPath(path: string): void {
    window.location.assign(path)
}

/**
 * Возвращает доступный sessionStorage или undefined.
 *
 * @returns Browser storage для auth snapshot.
 */
function getSessionStorageOrUndefined(): Storage | undefined {
    return window.sessionStorage
}
