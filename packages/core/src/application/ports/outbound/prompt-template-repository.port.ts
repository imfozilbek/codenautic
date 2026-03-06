import type {OrganizationId} from "../../../domain/value-objects/organization-id.value-object"
import type {UniqueId} from "../../../domain/value-objects/unique-id.value-object"
import type {PromptTemplate, PromptTemplateCategory} from "../../../domain/entities/prompt-template.entity"

/**
 * Outbound persistence contract for prompt templates.
 */
export interface IPromptTemplateRepository {
    /**
     * Finds template by identifier.
     *
     * @param id Template id.
     * @returns Matching template or null.
     */
    findById(id: UniqueId): Promise<PromptTemplate | null>

    /**
     * Finds a prompt template by name with optional organization fallback.
     *
     * @param name Template name.
     * @param organizationId Optional organization scope. Undefined means global fallback.
     * @returns Matching template or null.
     */
    findByName(
        name: string,
        organizationId?: OrganizationId,
    ): Promise<PromptTemplate | null>

    /**
     * Finds all templates for category.
     *
     * @param category Prompt category.
     * @returns Matching templates.
     */
    findByCategory(category: PromptTemplateCategory): Promise<readonly PromptTemplate[]>

    /**
     * Finds global templates.
     *
     * @returns Global templates.
     */
    findGlobal(): Promise<readonly PromptTemplate[]>

    /**
     * Finds all templates.
     *
     * @returns All templates.
     */
    findAll(): Promise<readonly PromptTemplate[]>

    /**
     * Persists template entity.
     *
     * @param template Template entity.
     */
    save(template: PromptTemplate): Promise<void>

    /**
     * Deletes template by identifier.
     *
     * @param id Template id.
     */
    deleteById(id: UniqueId): Promise<void>
}
