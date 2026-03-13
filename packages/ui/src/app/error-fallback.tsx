import { useEffect, type ReactElement } from "react"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { Button } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"

interface IErrorWithStatusCode {
    readonly statusCode: number
    readonly message?: string
}

interface IResolvedRouteError {
    readonly statusCode: number | null
    readonly message: string
}

interface IErrorFallbackProps extends ErrorComponentProps {
    readonly scopeLabel: string
}

const UNKNOWN_ERROR_MESSAGE = "Не удалось обработать ошибку маршрута"

/**
 * Глобальный fallback для ошибок роутера.
 *
 * @param props Контекст router boundary.
 * @returns UI состояния глобальной ошибки.
 */
export function GlobalErrorFallback(props: ErrorComponentProps): ReactElement {
    return <ErrorFallback {...props} scopeLabel="Глобальная ошибка приложения" />
}

/**
 * Route-level fallback для локальных ошибок страниц.
 *
 * @param props Контекст router boundary.
 * @returns UI состояния route-ошибки.
 */
export function RouteErrorFallback(props: ErrorComponentProps): ReactElement {
    return <ErrorFallback {...props} scopeLabel="Ошибка страницы" />
}

/**
 * Fallback для not-found сценариев маршрутизации.
 *
 * @returns UI состояния 404 для route tree.
 */
export function NotFoundFallback(): ReactElement {
    return (
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
            <h1 className={TYPOGRAPHY.splash}>Страница не найдена</h1>
            <p className="mt-4 text-base text-muted-foreground">
                Запрошенный маршрут отсутствует или был перемещён.
            </p>
        </section>
    )
}

function ErrorFallback(props: IErrorFallbackProps): ReactElement {
    const resolvedError = resolveRouteError(props.error)
    const statusCode = resolvedError.statusCode

    useEffect((): void => {
        if (statusCode === 401) {
            window.location.assign("/sign-in")
        }
    }, [statusCode])

    return (
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
            <h1 className={TYPOGRAPHY.splash}>{props.scopeLabel}</h1>
            <ErrorFallbackContent
                message={resolvedError.message}
                reset={props.reset}
                statusCode={statusCode}
            />
        </section>
    )
}

/**
 * Условный контент для ErrorFallback в зависимости от HTTP-статуса.
 *
 * @param props Статус-код, сообщение и reset-callback.
 * @returns Описание ошибки и кнопки действий.
 */
function ErrorFallbackContent(props: {
    readonly statusCode: number | null
    readonly message: string
    readonly reset: () => void
}): ReactElement {
    if (props.statusCode === 401) {
        return (
            <p className="mt-4 text-base text-muted-foreground">
                Сессия истекла, перенаправляем на страницу входа...
            </p>
        )
    }

    if (props.statusCode === 403) {
        return (
            <>
                <p className="mt-4 text-base text-warning">
                    Доступ запрещён для текущего пользователя.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Button
                        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:bg-foreground/80"
                        onPress={(): void => {
                            window.location.assign("/")
                        }}
                    >
                        Вернуться на главную
                    </Button>
                    <Button
                        variant="flat"
                        onPress={(): void => {
                            window.location.assign(
                                "/help-diagnostics?from=error-fallback",
                            )
                        }}
                    >
                        Открыть диагностику
                    </Button>
                </div>
            </>
        )
    }

    const isServerError =
        props.statusCode !== null && props.statusCode >= 500
    const isUnknownStatus = props.statusCode === null

    if (isServerError || isUnknownStatus) {
        return (
            <>
                <p className="mt-4 text-base text-danger">{props.message}</p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Button
                        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:bg-foreground/80"
                        onPress={props.reset}
                    >
                        Повторить
                    </Button>
                    <Button
                        variant="flat"
                        onPress={(): void => {
                            window.location.assign(
                                "/help-diagnostics?from=error-fallback",
                            )
                        }}
                    >
                        Открыть диагностику
                    </Button>
                </div>
            </>
        )
    }

    return <p className="mt-4 text-base text-foreground">{props.message}</p>
}

function resolveRouteError(error: unknown): IResolvedRouteError {
    const statusCode = extractStatusCode(error)
    const message = extractErrorMessage(error)

    return {
        statusCode,
        message,
    }
}

function extractStatusCode(error: unknown): number | null {
    if (isErrorWithStatusCode(error)) {
        return error.statusCode
    }

    return null
}

function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.trim()
        if (message.length > 0) {
            return message
        }
    }

    if (isErrorWithStatusCode(error)) {
        const message = error.message?.trim()
        if (message !== undefined && message.length > 0) {
            return message
        }
    }

    return UNKNOWN_ERROR_MESSAGE
}

function isErrorWithStatusCode(error: unknown): error is IErrorWithStatusCode {
    if (!isRecord(error)) {
        return false
    }

    const statusCode = error["statusCode"]
    return typeof statusCode === "number"
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}
