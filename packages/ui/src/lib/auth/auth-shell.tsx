import type { ReactElement } from "react"

import { Button } from "@/components/ui"

/**
 * Свойства shell для авторизованного пользователя.
 */
export interface IAuthenticatedShellProps {
    readonly appTitle: string
    readonly userDisplayName: string
    readonly userEmail: string
    readonly logoutLabel: string
    readonly onLogout: () => Promise<void>
    readonly children: ReactElement
}

/**
 * Параметры рендера авторизованной сессии.
 */
export interface IAuthAuthenticatedShellRenderProps {
    readonly appTitle: string
    readonly userDisplayName: string
    readonly userEmail: string
    readonly logoutLabel: string
    readonly onLogout: () => Promise<void>
    readonly interactionError: string | null
    readonly children: ReactElement
}

/**
 * Shell защищённого UI с user-инфо и кнопкой logout.
 *
 * @param props Параметры authenticated shell.
 * @returns Контейнер защищённого интерфейса.
 */
export function AuthenticatedShell(props: IAuthenticatedShellProps): ReactElement {
    return (
        <div className="min-h-screen">
            <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6">
                <div>
                    <p className="text-sm text-muted-foreground">{props.appTitle}</p>
                    <h2 className="text-lg font-semibold text-foreground">
                        {props.userDisplayName}
                    </h2>
                    <p className="text-sm text-muted-foreground">{props.userEmail}</p>
                </div>
                <Button
                    className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/80"
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
 * Рендерит shell для авторизованного состояния.
 *
 * @param props Параметры отрисовки shell.
 * @returns Авторизованный layout.
 */
export function renderAuthLoginShell(props: IAuthAuthenticatedShellRenderProps): ReactElement {
    return (
        <AuthenticatedShell
            appTitle={props.appTitle}
            userDisplayName={props.userDisplayName}
            userEmail={props.userEmail}
            logoutLabel={props.logoutLabel}
            onLogout={props.onLogout}
        >
            <>
                {props.interactionError !== null ? (
                    <p aria-live="assertive" className="px-6 pb-2 text-sm text-danger" role="alert">
                        {props.interactionError}
                    </p>
                ) : null}
                {props.children}
            </>
        </AuthenticatedShell>
    )
}
