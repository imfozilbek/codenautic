export const OPEN_COMMAND_PALETTE_EVENT = "codenautic:shortcut:open-command-palette"
export const FOCUS_GLOBAL_SEARCH_EVENT = "codenautic:shortcut:focus-global-search"
export const FOCUS_REVIEWS_FILTERS_EVENT = "codenautic:shortcut:focus-reviews-filters"

const SEQUENCE_TIMEOUT_MS = 1200

export type TShortcutScope = "global" | "page"

export interface IShortcutContext {
    readonly routePath: string
}

export interface IShortcutDefinition {
    readonly allowInInput?: boolean
    readonly handler: (event: KeyboardEvent, context: IShortcutContext) => void
    readonly id: string
    readonly keys: string
    readonly label: string
    readonly routePredicate?: (routePath: string) => boolean
    readonly scope: TShortcutScope
}

export interface IShortcutDescriptor {
    readonly id: string
    readonly keys: string
    readonly label: string
    readonly scope: TShortcutScope
}

export interface IShortcutConflict {
    readonly ids: ReadonlyArray<string>
    readonly signature: string
}

interface ICompiledShortcutDefinition extends IShortcutDefinition {
    readonly tokens: ReadonlyArray<string>
}

/**
 * Проверяет, является ли целевой элемент текстовым полем ввода.
 *
 * @param target Event target.
 * @returns true, если target — editable input/textarea/contenteditable.
 */
function isTextInputTarget(target: EventTarget | null): boolean {
    if (target instanceof HTMLTextAreaElement) {
        return true
    }

    if (target instanceof HTMLInputElement) {
        const textInputTypes = new Set([
            "text",
            "search",
            "email",
            "url",
            "tel",
            "password",
            "number",
        ])
        return textInputTypes.has(target.type)
    }

    if (target instanceof HTMLElement) {
        return target.isContentEditable
    }

    return false
}

function normalizeKeyAlias(rawKey: string): string {
    const normalized = rawKey.trim().toLowerCase()
    if (normalized === "/") {
        return "slash"
    }
    if (normalized === "?") {
        return "question"
    }
    if (normalized === "cmd" || normalized === "command") {
        return "meta"
    }
    if (normalized === "option") {
        return "alt"
    }
    if (normalized === "return") {
        return "enter"
    }
    if (normalized === "esc") {
        return "escape"
    }
    if (normalized === "spacebar") {
        return "space"
    }
    return normalized
}

function normalizeCombinationToken(rawToken: string): string {
    const parts = rawToken
        .split("+")
        .map((part): string => normalizeKeyAlias(part))
        .filter((part): boolean => part.length > 0)
    const modifiers = parts.filter((part): boolean => {
        return part === "ctrl" || part === "meta" || part === "alt" || part === "shift"
    })
    const key = parts.find((part): boolean => {
        return part !== "ctrl" && part !== "meta" && part !== "alt" && part !== "shift"
    })
    const orderedModifiers = [ ...new Set(modifiers) ].sort()
    const orderedParts = key === undefined ? orderedModifiers : [ ...orderedModifiers, key ]

    return orderedParts.join("+")
}

function normalizeShortcutKeys(keys: string): ReadonlyArray<string> {
    return keys
        .trim()
        .split(/\s+/)
        .map((token): string => normalizeCombinationToken(token))
        .filter((token): boolean => token.length > 0)
}

function normalizeKeyboardEventKey(event: KeyboardEvent): string {
    const normalized = event.key.toLowerCase()
    if (normalized === "/") {
        return "slash"
    }
    if (normalized === "?") {
        return "question"
    }
    if (normalized === " ") {
        return "space"
    }
    return normalized
}

function toKeyboardEventToken(event: KeyboardEvent): string {
    const modifiers: string[] = []
    if (event.altKey) {
        modifiers.push("alt")
    }
    if (event.ctrlKey) {
        modifiers.push("ctrl")
    }
    if (event.metaKey) {
        modifiers.push("meta")
    }
    if (event.shiftKey && event.key !== "?") {
        modifiers.push("shift")
    }
    const key = normalizeKeyboardEventKey(event)

    return normalizeCombinationToken([ ...modifiers, key ].join("+"))
}

function doesSequenceMatchSuffix(
    sequence: ReadonlyArray<string>,
    suffix: ReadonlyArray<string>,
): boolean {
    if (suffix.length > sequence.length) {
        return false
    }

    const offset = sequence.length - suffix.length
    for (let index = 0; index < suffix.length; index += 1) {
        if (sequence[offset + index] !== suffix[index]) {
            return false
        }
    }

    return true
}

function isSequencePrefix(prefix: ReadonlyArray<string>, sequence: ReadonlyArray<string>): boolean {
    if (sequence.length > prefix.length) {
        return false
    }

    for (let index = 0; index < sequence.length; index += 1) {
        if (prefix[index] !== sequence[index]) {
            return false
        }
    }

    return true
}

/**
 * Детектор конфликтов между объявленными shortcut signatures.
 *
 * @param definitions Набор зарегистрированных шорткатов.
 * @returns Список конфликтующих signatures и их id.
 */
export function detectShortcutConflicts(
    definitions: ReadonlyArray<IShortcutDefinition>,
): ReadonlyArray<IShortcutConflict> {
    const signatures = new Map<string, string[]>()

    definitions.forEach((definition): void => {
        const signature = normalizeShortcutKeys(definition.keys).join(" ")
        const existing = signatures.get(signature)
        if (existing === undefined) {
            signatures.set(signature, [definition.id])
            return
        }

        existing.push(definition.id)
    })

    const conflicts: IShortcutConflict[] = []
    signatures.forEach((ids, signature): void => {
        if (ids.length > 1) {
            conflicts.push({
                ids,
                signature,
            })
        }
    })

    return conflicts
}

/**
 * Runtime-registry шорткатов с поддержкой последовательностей и route-aware enable.
 */
export class KeyboardShortcutRegistry {
    private readonly compiledDefinitions: ReadonlyArray<ICompiledShortcutDefinition>
    private readonly conflicts: ReadonlyArray<IShortcutConflict>
    private readonly sequenceBuffer: string[]
    private lastSequenceAt: number

    public constructor(definitions: ReadonlyArray<IShortcutDefinition>) {
        this.compiledDefinitions = definitions.map((definition): ICompiledShortcutDefinition => {
            return {
                ...definition,
                tokens: normalizeShortcutKeys(definition.keys),
            }
        })
        this.conflicts = detectShortcutConflicts(definitions)
        this.sequenceBuffer = []
        this.lastSequenceAt = 0
    }

    public getConflicts(): ReadonlyArray<IShortcutConflict> {
        return this.conflicts
    }

    public getEnabledShortcuts(context: IShortcutContext): ReadonlyArray<IShortcutDescriptor> {
        return this.compiledDefinitions
            .filter((definition): boolean => this.isDefinitionEnabled(definition, context))
            .map((definition): IShortcutDescriptor => {
                return {
                    id: definition.id,
                    keys: definition.keys,
                    label: definition.label,
                    scope: definition.scope,
                }
            })
    }

    public handleKeydown(event: KeyboardEvent, context: IShortcutContext): boolean {
        const now = Date.now()
        if (now - this.lastSequenceAt > SEQUENCE_TIMEOUT_MS) {
            this.sequenceBuffer.length = 0
        }
        this.lastSequenceAt = now

        const token = toKeyboardEventToken(event)
        const enabledDefinitions = this.compiledDefinitions.filter((definition): boolean => {
            return this.isDefinitionEnabled(definition, context)
        })
        const isInputTarget = isTextInputTarget(event.target)

        const allowedDefinitions = enabledDefinitions.filter((definition): boolean => {
            return isInputTarget !== true || definition.allowInInput === true
        })
        if (allowedDefinitions.length === 0) {
            return false
        }

        this.sequenceBuffer.push(token)
        const matchingPrefix = allowedDefinitions.filter((definition): boolean => {
            return doesSequenceMatchSuffix(this.sequenceBuffer, definition.tokens)
        })
        if (matchingPrefix.length === 0) {
            this.sequenceBuffer.length = 0
            this.sequenceBuffer.push(token)
        }

        const activeCandidates = allowedDefinitions.filter((definition): boolean => {
            return isSequencePrefix(definition.tokens, this.sequenceBuffer)
        })
        const matchedDefinition = activeCandidates.find((definition): boolean => {
            return definition.tokens.length === this.sequenceBuffer.length
        })

        if (matchedDefinition === undefined) {
            if (activeCandidates.length === 0) {
                this.sequenceBuffer.length = 0
            }
            return false
        }

        event.preventDefault()
        matchedDefinition.handler(event, context)
        this.sequenceBuffer.length = 0
        return true
    }

    private isDefinitionEnabled(
        definition: ICompiledShortcutDefinition,
        context: IShortcutContext,
    ): boolean {
        if (definition.routePredicate === undefined) {
            return true
        }

        return definition.routePredicate(context.routePath)
    }
}
