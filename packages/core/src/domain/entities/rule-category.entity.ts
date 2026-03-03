import {Entity} from "./entity"
import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Rule category aggregate state.
 */
export interface IRuleCategoryProps {
    /**
     * Kebab-case slug identifier.
     */
    readonly slug: string

    /**
     * Human readable category name.
     */
    readonly name: string

    /**
     * Category description.
     */
    readonly description: string

    /**
     * Activity flag.
     */
    isActive: boolean
}

/**
 * Rule category entity for built-in and custom rule grouping.
 */
export class RuleCategory extends Entity<IRuleCategoryProps> {
    /**
     * Creates rule category entity.
     *
     * @param id Entity identifier.
     * @param props Category state.
     */
    public constructor(id: UniqueId | undefined, props: IRuleCategoryProps) {
        super(id, normalizeRuleCategoryProps(props))
    }

    /**
     * Slug value.
     *
     * @returns Kebab-case slug.
     */
    public get slug(): string {
        return this.props.slug
    }

    /**
     * Category name.
     *
     * @returns Human readable name.
     */
    public get name(): string {
        return this.props.name
    }

    /**
     * Category description.
     *
     * @returns Description text.
     */
    public get description(): string {
        return this.props.description
    }

    /**
     * Activity state.
     *
     * @returns True when active.
     */
    public get isActive(): boolean {
        return this.props.isActive
    }

    /**
     * Sets category as active.
     */
    public activate(): void {
        this.props.isActive = true
    }

    /**
     * Sets category as inactive.
     */
    public deactivate(): void {
        this.props.isActive = false
    }
}

/**
 * Valid kebab-case rule slug.
 */
const RULE_CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Normalizes and validates category props.
 *
 * @param props Raw props.
 * @returns Normalized props.
 */
function normalizeRuleCategoryProps(props: IRuleCategoryProps): IRuleCategoryProps {
    const slug = normalizeSlug(props.slug)
    const name = normalizeNonEmptyText(props.name, "Category name")
    const description = normalizeNonEmptyText(props.description, "Category description")

    return {
        slug,
        name,
        description,
        isActive: props.isActive,
    }
}

/**
 * Normalizes slug and validates kebab-case format.
 *
 * @param slug Raw slug.
 * @returns Normalized slug.
 */
function normalizeSlug(slug: string): string {
    if (typeof slug !== "string") {
        throw new Error("Category slug cannot be empty")
    }

    const normalized = slug.trim()
    if (normalized.length === 0) {
        throw new Error("Category slug cannot be empty")
    }

    if (RULE_CATEGORY_SLUG_PATTERN.test(normalized) === false) {
        throw new Error("Category slug must be kebab-case")
    }

    return normalized
}

/**
 * Normalizes required non-empty text field.
 *
 * @param value Raw text.
 * @param fieldName Field name for error message.
 * @returns Trimmed text.
 */
function normalizeNonEmptyText(value: string, fieldName: string): string {
    if (typeof value !== "string") {
        throw new Error(`${fieldName} cannot be empty`)
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(`${fieldName} cannot be empty`)
    }

    return normalized
}
