import { type ReactElement, useCallback, useState } from "react"

import { Button } from "@/components/ui"

import { resolveProviderLabel } from "./auth-labels"
import { OAUTH_PROVIDERS, type TOAuthProvider } from "./types"

/**
 * Свойства панели входа.
 */
export interface IAuthLoginPanelProps {
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
export function AuthLoginPanel(props: IAuthLoginPanelProps): ReactElement {
    const [pendingProvider, setPendingProvider] = useState<TOAuthProvider | null>(null)

    const handleSignIn = useCallback(
        (provider: TOAuthProvider): void => {
            setPendingProvider(provider)
            void props.onOAuthSignIn(provider).finally((): void => {
                setPendingProvider(null)
            })
        },
        [props.onOAuthSignIn],
    )

    return (
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-semibold tracking-tight">{props.appTitle}</h1>
            <p className="mt-4 text-base text-muted-foreground">{props.description}</p>
            {props.statusMessage !== undefined ? (
                <p aria-live="polite" className="mt-3 text-sm text-warning" role="status">
                    {props.statusMessage}
                </p>
            ) : null}
            <div className="mt-8 grid w-full max-w-sm gap-3">
                {OAUTH_PROVIDERS.map((provider) => (
                    <Button
                        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-border hover:bg-surface-muted"
                        isDisabled={pendingProvider !== null}
                        isLoading={pendingProvider === provider}
                        key={provider}
                        onPress={(): void => {
                            handleSignIn(provider)
                        }}
                    >
                        {resolveProviderLabel(provider)}
                    </Button>
                ))}
            </div>
            {props.interactionError !== null ? (
                <p aria-live="assertive" className="mt-4 text-sm text-danger" role="alert">
                    {props.interactionError}
                </p>
            ) : null}
        </section>
    )
}

/**
 * Рендерит loading состояние проверки auth session.
 *
 * @param appTitle Заголовок приложения.
 * @param message Сообщение загрузки.
 * @returns Loading UI.
 */
export function renderAuthLoadingState(appTitle: string, message: string): ReactElement {
    return (
        <section
            aria-busy="true"
            className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8"
        >
            <h1 className="text-3xl font-semibold tracking-tight">{appTitle}</h1>
            <p className="mt-4 text-base text-muted-foreground">{message}</p>
        </section>
    )
}
