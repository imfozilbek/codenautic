import {useEffect, type ReactElement} from "react"
import type {ErrorComponentProps} from "@tanstack/react-router"

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
            <h1 className="text-3xl font-semibold tracking-tight">Страница не найдена</h1>
            <p className="mt-4 text-base text-slate-600">
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

    if (statusCode === 401) {
        return (
            <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
                <h1 className="text-3xl font-semibold tracking-tight">{props.scopeLabel}</h1>
                <p className="mt-4 text-base text-slate-600">Сессия истекла, перенаправляем на страницу входа...</p>
            </section>
        )
    }

    if (statusCode === 403) {
        return (
            <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
                <h1 className="text-3xl font-semibold tracking-tight">{props.scopeLabel}</h1>
                <p className="mt-4 text-base text-amber-700">Доступ запрещён для текущего пользователя.</p>
                <button
                    className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                    onClick={(): void => {
                        window.location.assign("/")
                    }}
                    type="button"
                >
                    Вернуться на главную
                </button>
            </section>
        )
    }

    const isServerError = statusCode !== null && statusCode >= 500
    const isUnknownStatus = statusCode === null

    if (isServerError || isUnknownStatus) {
        return (
            <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
                <h1 className="text-3xl font-semibold tracking-tight">{props.scopeLabel}</h1>
                <p className="mt-4 text-base text-rose-700">{resolvedError.message}</p>
                <button
                    className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                    onClick={props.reset}
                    type="button"
                >
                    Повторить
                </button>
            </section>
        )
    }

    return (
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-semibold tracking-tight">{props.scopeLabel}</h1>
            <p className="mt-4 text-base text-slate-700">{resolvedError.message}</p>
        </section>
    )
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
