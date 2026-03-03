import type { ReactElement } from "react"
import { Avatar, Button } from "@/components/ui"
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui"

/**
 * Настройки отображения пользовательского блока в header.
 */
export interface IUserMenuProps {
    /** Имя пользователя. */
    readonly userName?: string
    /** Email пользователя. */
    readonly userEmail?: string
    /** Коллбэк для выхода из системы. */
    readonly onSignOut?: () => Promise<void> | void
}

/**
 * Минимальный user-menu без выпадающих слоёв.
 *
 * Служит placeholder, пока не введена полноценная навигация в settings/profile.
 *
 * @param props Параметры пользовательского меню.
 * @returns Блок с avatar и кнопкой sign out.
 */
export function UserMenu(props: IUserMenuProps): ReactElement {
    const initials = props.userName !== undefined ? props.userName.slice(0, 2).toUpperCase() : "CN"

    return (
        <Dropdown>
            <DropdownTrigger>
                <Button className="h-8 min-h-8 px-1" radius="full" size="sm" variant="light">
                    <div className="inline-flex items-center gap-2 rounded-full">
                        <Avatar label={props.userName ?? "User"} size="sm" />
                        <span className="hidden text-xs font-medium sm:inline">
                            {props.userName ?? "User"}
                        </span>
                        <span className="sr-only">{initials}</span>
                    </div>
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu">
                <DropdownItem key="name">{props.userName ?? "User"}</DropdownItem>
                <DropdownItem key="email">{props.userEmail ?? "user@example.com"}</DropdownItem>
                {props.onSignOut === undefined ? null : (
                    <DropdownItem
                        key="logout"
                        color="danger"
                        onPress={(): void => {
                            const signOut = props.onSignOut
                            if (signOut === undefined) {
                                return
                            }

                            void signOut()
                        }}
                    >
                        Sign out
                    </DropdownItem>
                )}
            </DropdownMenu>
        </Dropdown>
    )
}
