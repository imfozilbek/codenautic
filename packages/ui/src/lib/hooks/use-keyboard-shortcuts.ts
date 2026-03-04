import { useEffect, useMemo } from "react"

import {
    KeyboardShortcutRegistry,
    type IShortcutConflict,
    type IShortcutDefinition,
    type IShortcutDescriptor,
} from "@/lib/keyboard/shortcut-registry"

export interface IUseKeyboardShortcutsArgs {
    readonly routePath: string
    readonly shortcuts: ReadonlyArray<IShortcutDefinition>
}

export interface IUseKeyboardShortcutsResult {
    readonly conflicts: ReadonlyArray<IShortcutConflict>
    readonly shortcuts: ReadonlyArray<IShortcutDescriptor>
}

/**
 * Подключает глобальный keydown-listener на основе registry и текущего route context.
 *
 * @param args Конфигурация shortcut definitions и текущий путь.
 * @returns Активные shortcuts и список конфликтов signatures.
 */
export function useKeyboardShortcuts(
    args: IUseKeyboardShortcutsArgs,
): IUseKeyboardShortcutsResult {
    const registry = useMemo((): KeyboardShortcutRegistry => {
        return new KeyboardShortcutRegistry(args.shortcuts)
    }, [args.shortcuts])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleKeydown = (event: KeyboardEvent): void => {
            registry.handleKeydown(event, {
                routePath: args.routePath,
            })
        }

        window.addEventListener("keydown", handleKeydown)
        return (): void => {
            window.removeEventListener("keydown", handleKeydown)
        }
    }, [args.routePath, registry])

    return {
        conflicts: registry.getConflicts(),
        shortcuts: registry.getEnabledShortcuts({
            routePath: args.routePath,
        }),
    }
}
