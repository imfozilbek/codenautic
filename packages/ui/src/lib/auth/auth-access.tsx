import type { ReactElement, ReactNode } from "react"
import { createContext, useContext } from "react"

import type { TTenantId, TUiRole } from "@/lib/access/access-types"

import type { IAuthSession } from "./types"

/**
 * Доверенный auth/access контекст для защищённой части UI.
 */
export interface IAuthAccessContextValue {
    /** Текущая авторизованная сессия. */
    readonly session: IAuthSession
    /** Разрешённая роль пользователя. */
    readonly role: TUiRole
    /** Активный tenant по данным сессии. */
    readonly tenantId: TTenantId
}

interface IAuthAccessProviderProps {
    /** Контекст доступа для защищённого UI. */
    readonly value: IAuthAccessContextValue
    /** Дочерние элементы. */
    readonly children: ReactNode
}

const AuthAccessContext = createContext<IAuthAccessContextValue | undefined>(undefined)

/**
 * Провайдер доверенного auth/access состояния.
 *
 * @param props Параметры провайдера.
 * @returns React provider для защищённого UI.
 */
export function AuthAccessProvider(props: IAuthAccessProviderProps): ReactElement {
    return <AuthAccessContext.Provider value={props.value}>{props.children}</AuthAccessContext.Provider>
}

/**
 * Возвращает доверенный auth/access контекст, если он доступен.
 *
 * @returns Контекст доступа или undefined вне защищённого дерева.
 */
export function useAuthAccess(): IAuthAccessContextValue | undefined {
    return useContext(AuthAccessContext)
}
