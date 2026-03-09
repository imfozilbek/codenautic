/**
 * Keyboard shortcut registry with sequence support, route-aware scoping,
 * and conflict detection.
 */
export {
    OPEN_COMMAND_PALETTE_EVENT,
    FOCUS_GLOBAL_SEARCH_EVENT,
    FOCUS_REVIEWS_FILTERS_EVENT,
    type TShortcutScope,
    type IShortcutContext,
    type IShortcutDefinition,
    type IShortcutDescriptor,
    type IShortcutConflict,
    detectShortcutConflicts,
    KeyboardShortcutRegistry,
} from "./shortcut-registry"
