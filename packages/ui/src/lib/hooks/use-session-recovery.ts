import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"

import {
    buildDraftFieldKey,
    clearSessionPendingIntent,
    readSessionDraftSnapshot,
    readSessionPendingIntent,
    writeSessionDraftSnapshot,
    writeSessionPendingIntent,
    type ISessionExpiredEventDetail,
} from "@/lib/session/session-recovery"

/**
 * Минимальный интервал между autosave draft записями (мс).
 */
const DRAFT_AUTOSAVE_THROTTLE_MS = 500

/**
 * Результат хука восстановления сессии.
 */
export interface ISessionRecoveryResult {
    /** Открыт ли модал восстановления сессии. */
    readonly isSessionRecoveryOpen: boolean
    /** HTTP-код ошибки аутентификации (401 или 419). */
    readonly sessionFailureCode: 401 | 419
    /** Сообщение о восстановленном черновике. */
    readonly restoredDraftMessage: string | undefined
    /** Закрыть модал восстановления. */
    readonly setIsSessionRecoveryOpen: (value: boolean) => void
    /** Обработчик повторной аутентификации. */
    readonly handleReAuthenticate: () => void
}

/**
 * Управление восстановлением сессии: отслеживание session-expired,
 * автосохранение черновиков из input-полей, восстановление после re-auth.
 *
 * @returns Состояние и обработчики восстановления сессии.
 */
export function useSessionRecovery(): ISessionRecoveryResult {
    const [isSessionRecoveryOpen, setIsSessionRecoveryOpen] = useState(false)
    const [sessionFailureCode, setSessionFailureCode] = useState<401 | 419>(401)
    const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | undefined>(undefined)
    const navigate = useNavigate()
    const location = useLocation()
    const lastDraftWriteRef = useRef<number>(0)

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleSessionExpired = (event: CustomEvent<ISessionExpiredEventDetail>): void => {
            const detail = event.detail
            const code = detail?.code === 419 ? 419 : 401
            const pendingIntent = detail?.pendingIntent ?? location.pathname

            setSessionFailureCode(code)
            setIsSessionRecoveryOpen(true)
            writeSessionPendingIntent(pendingIntent)
        }

        const handleInputAutosave = (event: Event): void => {
            const target = event.target
            const isInputElement = target instanceof HTMLInputElement
            const isTextAreaElement = target instanceof HTMLTextAreaElement
            if (isInputElement !== true && isTextAreaElement !== true) {
                return
            }

            if (isInputElement) {
                const isTextInput =
                    target.type === "text" ||
                    target.type === "email" ||
                    target.type === "search" ||
                    target.type === "url" ||
                    target.type === "tel"
                if (isTextInput !== true) {
                    return
                }
            }

            const value = target.value.trim()
            if (value.length === 0) {
                return
            }

            const now = Date.now()
            if (now - lastDraftWriteRef.current < DRAFT_AUTOSAVE_THROTTLE_MS) {
                return
            }
            lastDraftWriteRef.current = now

            writeSessionDraftSnapshot({
                fieldKey: buildDraftFieldKey(target),
                path: location.pathname,
                updatedAt: new Date().toISOString(),
                value: target.value,
            })
        }

        window.addEventListener("codenautic:session-expired", handleSessionExpired)
        document.addEventListener("input", handleInputAutosave, true)

        return (): void => {
            window.removeEventListener("codenautic:session-expired", handleSessionExpired)
            document.removeEventListener("input", handleInputAutosave, true)
        }
    }, [location.pathname])

    const handleReAuthenticate = (): void => {
        const pendingIntent = readSessionPendingIntent()
        const draftSnapshot = readSessionDraftSnapshot()

        setIsSessionRecoveryOpen(false)

        if (draftSnapshot !== undefined) {
            setRestoredDraftMessage(
                `Recovered draft from ${draftSnapshot.fieldKey} (${draftSnapshot.path}).`,
            )
            window.dispatchEvent(
                new CustomEvent("codenautic:session-draft-restored", {
                    detail: draftSnapshot,
                }),
            )
        }

        clearSessionPendingIntent()
        void navigate({
            to: pendingIntent ?? location.pathname,
        })
    }

    return {
        handleReAuthenticate,
        isSessionRecoveryOpen,
        restoredDraftMessage,
        sessionFailureCode,
        setIsSessionRecoveryOpen,
    }
}
