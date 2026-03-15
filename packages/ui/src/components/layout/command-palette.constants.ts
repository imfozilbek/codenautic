/**
 * Command palette item group category key (maps to `navigation:commandPalette.group.*`).
 */
export type TCommandPaletteGroup =
    | "ccrs"
    | "issues"
    | "repos"
    | "reports"
    | "settings"
    | "actions"
    | "general"

/**
 * Single command palette item.
 */
export interface ICommandPaletteItem {
    readonly group: TCommandPaletteGroup
    readonly id: string
    readonly keywords: string
    readonly label: string
    readonly path: string
}

/**
 * Static command key definition for i18n (`navigation:commandPalette.*`).
 */
export interface IStaticCommandKey {
    readonly group: TCommandPaletteGroup
    readonly id: string
    readonly keywords: string
    readonly labelKey:
        | "openCcrManagement"
        | "openDiagnosticsCenter"
        | "openRepositories"
        | "openReportsWorkspace"
    readonly path: string
}

/**
 * LocalStorage key for persisting recent command palette selections.
 */
export const COMMAND_PALETTE_RECENT_STORAGE_KEY = "codenautic:ui:command-palette:recent:v1"

/**
 * LocalStorage key for persisting pinned command palette items.
 */
export const COMMAND_PALETTE_PINNED_STORAGE_KEY = "codenautic:ui:command-palette:pinned:v1"

/**
 * Maximum number of recent commands stored in the palette history.
 */
export const MAX_RECENT_COMMANDS = 8

/**
 * Static command definitions that map to i18n translation keys.
 * These are always available in the palette regardless of dynamic routes.
 */
export const STATIC_COMMAND_KEYS: ReadonlyArray<IStaticCommandKey> = [
    {
        group: "actions",
        id: "action-open-reviews",
        keywords: "review ccr management triage",
        labelKey: "openCcrManagement",
        path: "/reviews",
    },
    {
        group: "actions",
        id: "action-open-diagnostics",
        keywords: "diagnostics degradation help support",
        labelKey: "openDiagnosticsCenter",
        path: "/help-diagnostics",
    },
    {
        group: "actions",
        id: "action-open-repositories",
        keywords: "repositories onboarding scan",
        labelKey: "openRepositories",
        path: "/repositories",
    },
    {
        group: "actions",
        id: "action-open-reports",
        keywords: "reports analytics export generation viewer",
        labelKey: "openReportsWorkspace",
        path: "/reports",
    },
]
