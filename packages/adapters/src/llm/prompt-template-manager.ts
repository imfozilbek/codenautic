import {
    PROMPT_TEMPLATE_MANAGER_ERROR_CODE,
    PromptTemplateManagerError,
} from "./prompt-template-manager.error"

const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g

/**
 * Prompt template descriptor.
 */
export interface IPromptTemplateDefinition {
    /**
     * Template name.
     */
    readonly name: string

    /**
     * Raw template body.
     */
    readonly content: string

    /**
     * Declared variable names extracted from template content.
     */
    readonly variables: readonly string[]
}

/**
 * Runtime variable map for prompt rendering.
 */
export type PromptTemplateVariables = Readonly<Record<string, unknown>>

/**
 * Prompt template manager contract.
 */
export interface IPromptTemplateManager {
    /**
     * Registers new template.
     *
     * @param name Template name.
     * @param content Template content.
     */
    registerTemplate(name: string, content: string): void

    /**
     * Removes template by name.
     *
     * @param name Template name.
     * @returns True when template existed and was removed.
     */
    removeTemplate(name: string): boolean

    /**
     * Returns whether template exists.
     *
     * @param name Template name.
     * @returns True when template exists.
     */
    hasTemplate(name: string): boolean

    /**
     * Lists registered templates in stable alphabetical order.
     *
     * @returns Registered template definitions.
     */
    listTemplates(): readonly IPromptTemplateDefinition[]

    /**
     * Renders template with variable substitution.
     *
     * @param name Template name.
     * @param variables Runtime variable values.
     * @returns Rendered prompt.
     */
    renderTemplate(name: string, variables: PromptTemplateVariables): string
}

/**
 * In-memory prompt template manager.
 */
export class PromptTemplateManager implements IPromptTemplateManager {
    private readonly templates = new Map<string, IPromptTemplateDefinition>()

    /**
     * Registers new template.
     *
     * @param name Template name.
     * @param content Template content.
     */
    public registerTemplate(name: string, content: string): void {
        const normalizedName = validateTemplateName(name)
        const normalizedContent = validateTemplateContent(content, normalizedName)

        if (this.templates.has(normalizedName)) {
            throw new PromptTemplateManagerError(
                PROMPT_TEMPLATE_MANAGER_ERROR_CODE.TEMPLATE_ALREADY_EXISTS,
                {
                    templateName: normalizedName,
                },
            )
        }

        this.templates.set(normalizedName, {
            name: normalizedName,
            content: normalizedContent,
            variables: extractTemplateVariables(normalizedContent),
        })
    }

    /**
     * Removes template by name.
     *
     * @param name Template name.
     * @returns True when template existed and was removed.
     */
    public removeTemplate(name: string): boolean {
        const normalizedName = validateTemplateName(name)
        return this.templates.delete(normalizedName)
    }

    /**
     * Returns whether template exists.
     *
     * @param name Template name.
     * @returns True when template exists.
     */
    public hasTemplate(name: string): boolean {
        const normalizedName = validateTemplateName(name)
        return this.templates.has(normalizedName)
    }

    /**
     * Lists registered templates in stable alphabetical order.
     *
     * @returns Registered template definitions.
     */
    public listTemplates(): readonly IPromptTemplateDefinition[] {
        return [...this.templates.values()].sort((left, right): number => {
            return left.name.localeCompare(right.name)
        })
    }

    /**
     * Renders template with variable substitution.
     *
     * @param name Template name.
     * @param variables Runtime variable values.
     * @returns Rendered prompt.
     */
    public renderTemplate(name: string, variables: PromptTemplateVariables): string {
        const normalizedName = validateTemplateName(name)
        const template = this.templates.get(normalizedName)

        if (template === undefined) {
            throw new PromptTemplateManagerError(
                PROMPT_TEMPLATE_MANAGER_ERROR_CODE.TEMPLATE_NOT_FOUND,
                {
                    templateName: normalizedName,
                },
            )
        }

        return renderTemplateContent(template, variables)
    }
}

/**
 * Validates template name.
 *
 * @param name Template name.
 * @returns Normalized template name.
 */
function validateTemplateName(name: string): string {
    const normalized = name.trim()
    if (normalized.length === 0) {
        throw new PromptTemplateManagerError(
            PROMPT_TEMPLATE_MANAGER_ERROR_CODE.INVALID_TEMPLATE_NAME,
            {
                templateName: name,
            },
        )
    }

    return normalized
}

/**
 * Validates template content.
 *
 * @param content Template content.
 * @param templateName Template name.
 * @returns Normalized template content.
 */
function validateTemplateContent(content: string, templateName: string): string {
    const normalized = content.trim()
    if (normalized.length === 0) {
        throw new PromptTemplateManagerError(
            PROMPT_TEMPLATE_MANAGER_ERROR_CODE.INVALID_TEMPLATE_CONTENT,
            {
                templateName,
            },
        )
    }

    return normalized
}

/**
 * Extracts template variable names in stable order.
 *
 * @param content Template content.
 * @returns Unique variable names.
 */
function extractTemplateVariables(content: string): readonly string[] {
    const variables = new Set<string>()
    const matches = content.matchAll(TEMPLATE_VARIABLE_PATTERN)
    for (const match of matches) {
        const variableName = match[1]
        if (variableName !== undefined) {
            variables.add(variableName)
        }
    }

    return [...variables].sort((left, right): number => left.localeCompare(right))
}

/**
 * Renders one template with runtime variable values.
 *
 * @param template Template descriptor.
 * @param variables Runtime variables.
 * @returns Rendered string.
 */
function renderTemplateContent(
    template: IPromptTemplateDefinition,
    variables: PromptTemplateVariables,
): string {
    let rendered = template.content

    for (const variableName of template.variables) {
        const value = variables[variableName]
        if (value === undefined) {
            throw new PromptTemplateManagerError(
                PROMPT_TEMPLATE_MANAGER_ERROR_CODE.MISSING_VARIABLE,
                {
                    variableName,
                    templateName: template.name,
                },
            )
        }

        rendered = replaceTemplateVariable(
            rendered,
            variableName,
            normalizeTemplateValue(value),
        )
    }

    return rendered
}

/**
 * Replaces one variable placeholder in template content.
 *
 * @param content Template content.
 * @param variableName Variable name.
 * @param value Normalized variable value.
 * @returns Updated template content.
 */
function replaceTemplateVariable(content: string, variableName: string, value: string): string {
    const escapedVariableName = escapeForRegularExpression(variableName)
    const pattern = new RegExp(`\\{\\{\\s*${escapedVariableName}\\s*\\}\\}`, "g")
    return content.replace(pattern, value)
}

/**
 * Normalizes runtime variable value into renderable string.
 *
 * @param value Runtime variable value.
 * @returns Renderable string.
 */
function normalizeTemplateValue(value: unknown): string {
    if (value === null) {
        return "null"
    }

    if (Array.isArray(value)) {
        return JSON.stringify(value)
    }
    if (typeof value === "object") {
        return JSON.stringify(value)
    }

    if (isPrimitiveTemplateValue(value)) {
        return serializePrimitiveTemplateValue(value)
    }

    return ""
}

type PrimitiveTemplateValue =
    | string
    | number
    | boolean
    | bigint
    | symbol
    | undefined
    | ((...args: readonly unknown[]) => unknown)

/**
 * Type guard for primitive template values.
 *
 * @param value Runtime value.
 * @returns True when value is primitive or function.
 */
function isPrimitiveTemplateValue(value: unknown): value is PrimitiveTemplateValue {
    return typeof value !== "object"
}

/**
 * Serializes primitive runtime values into template-safe string representation.
 *
 * @param value Primitive runtime value.
 * @returns Primitive string representation.
 */
function serializePrimitiveTemplateValue(value: PrimitiveTemplateValue): string {
    if (typeof value === "string") {
        return value
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value)
    }
    if (typeof value === "bigint" || typeof value === "symbol") {
        return value.toString()
    }
    if (typeof value === "undefined") {
        return "undefined"
    }
    if (typeof value === "function") {
        return "[function]"
    }

    return ""
}

/**
 * Escapes string for safe regular-expression interpolation.
 *
 * @param value Raw value.
 * @returns Escaped value.
 */
function escapeForRegularExpression(value: string): string {
    return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
