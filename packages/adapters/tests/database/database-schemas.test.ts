import {describe, expect, test} from "bun:test"

import {type Schema} from "mongoose"

import {
    EXPERT_PANEL_COLLECTION_NAME,
    EXPERT_PANEL_MODEL_NAME,
    expertPanelSchema,
    ORGANIZATION_COLLECTION_NAME,
    ORGANIZATION_MODEL_NAME,
    organizationSchema,
    PROMPT_CONFIGURATION_COLLECTION_NAME,
    PROMPT_CONFIGURATION_MODEL_NAME,
    promptConfigurationSchema,
    PROMPT_TEMPLATE_COLLECTION_NAME,
    PROMPT_TEMPLATE_MODEL_NAME,
    promptTemplateSchema,
    REVIEW_ISSUE_TICKET_COLLECTION_NAME,
    REVIEW_ISSUE_TICKET_MODEL_NAME,
    reviewIssueTicketSchema,
    REVIEW_COLLECTION_NAME,
    REVIEW_MODEL_NAME,
    reviewSchema,
    RULE_CATEGORY_COLLECTION_NAME,
    RULE_CATEGORY_MODEL_NAME,
    ruleCategorySchema,
    RULE_COLLECTION_NAME,
    RULE_MODEL_NAME,
    ruleSchema,
    SYSTEM_SETTINGS_COLLECTION_NAME,
    SYSTEM_SETTINGS_MODEL_NAME,
    systemSettingSchema,
    TASK_COLLECTION_NAME,
    TASK_MODEL_NAME,
    TASK_STATUS_VALUES,
    taskSchema,
} from "../../src/database/schemas"

/**
 * Schema registry item.
 */
interface ISchemaRegistryEntry {
    readonly modelName: string
    readonly collectionName: string
    readonly schema: Schema
}

/**
 * Supported index specification shape used in tests.
 */
type IndexSpecification = Readonly<Record<string, 1 | -1>>

/**
 * Minimal path shape with options field.
 */
interface IPathWithOptions {
    readonly options?: {
        readonly enum?: readonly string[]
    }
}

/**
 * Returns true when schema contains exact index specification.
 *
 * @param schema Schema under test.
 * @param expected Expected index spec.
 * @returns True when index exists.
 */
function hasIndex(schema: Schema, expected: IndexSpecification): boolean {
    const indexes = schema.indexes() as Array<readonly [Record<string, number>, Record<string, unknown>]>
    for (const [specification] of indexes) {
        if (matchesIndexSpecification(specification, expected)) {
            return true
        }
    }
    return false
}

/**
 * Returns true when schema contains exact unique index specification.
 *
 * @param schema Schema under test.
 * @param expected Expected index spec.
 * @returns True when unique index exists.
 */
function hasUniqueIndex(schema: Schema, expected: IndexSpecification): boolean {
    const indexes = schema.indexes() as Array<readonly [Record<string, number>, Record<string, unknown>]>
    for (const [specification, options] of indexes) {
        if (!matchesIndexSpecification(specification, expected)) {
            continue
        }
        if (options["unique"] === true) {
            return true
        }
    }
    return false
}

/**
 * Compares index specification with expected field directions.
 *
 * @param specification Existing index specification.
 * @param expected Expected specification.
 * @returns True when specs are equal.
 */
function matchesIndexSpecification(
    specification: Record<string, number>,
    expected: IndexSpecification,
): boolean {
    const expectedEntries = Object.entries(expected)
    const specificationEntries = Object.entries(specification)
    if (expectedEntries.length !== specificationEntries.length) {
        return false
    }

    for (const [field, direction] of expectedEntries) {
        if (specification[field] !== direction) {
            return false
        }
    }

    return true
}

describe("database schemas", () => {
    test("exposes ten schemas with stable model and collection names", () => {
        const registry: readonly ISchemaRegistryEntry[] = [
            {
                modelName: REVIEW_MODEL_NAME,
                collectionName: REVIEW_COLLECTION_NAME,
                schema: reviewSchema,
            },
            {
                modelName: TASK_MODEL_NAME,
                collectionName: TASK_COLLECTION_NAME,
                schema: taskSchema,
            },
            {
                modelName: RULE_MODEL_NAME,
                collectionName: RULE_COLLECTION_NAME,
                schema: ruleSchema,
            },
            {
                modelName: RULE_CATEGORY_MODEL_NAME,
                collectionName: RULE_CATEGORY_COLLECTION_NAME,
                schema: ruleCategorySchema,
            },
            {
                modelName: PROMPT_TEMPLATE_MODEL_NAME,
                collectionName: PROMPT_TEMPLATE_COLLECTION_NAME,
                schema: promptTemplateSchema,
            },
            {
                modelName: PROMPT_CONFIGURATION_MODEL_NAME,
                collectionName: PROMPT_CONFIGURATION_COLLECTION_NAME,
                schema: promptConfigurationSchema,
            },
            {
                modelName: EXPERT_PANEL_MODEL_NAME,
                collectionName: EXPERT_PANEL_COLLECTION_NAME,
                schema: expertPanelSchema,
            },
            {
                modelName: REVIEW_ISSUE_TICKET_MODEL_NAME,
                collectionName: REVIEW_ISSUE_TICKET_COLLECTION_NAME,
                schema: reviewIssueTicketSchema,
            },
            {
                modelName: SYSTEM_SETTINGS_MODEL_NAME,
                collectionName: SYSTEM_SETTINGS_COLLECTION_NAME,
                schema: systemSettingSchema,
            },
            {
                modelName: ORGANIZATION_MODEL_NAME,
                collectionName: ORGANIZATION_COLLECTION_NAME,
                schema: organizationSchema,
            },
        ]

        expect(registry).toHaveLength(10)

        for (const entry of registry) {
            expect(entry.modelName.trim().length > 0).toBe(true)
            expect(entry.schema.get("collection")).toBe(entry.collectionName)
            expect(entry.schema.options.strict).toBe("throw")
            expect(entry.schema.options.timestamps).toBe(true)
            expect(entry.schema.options.versionKey).toBe(false)
        }
    })

    test("review schema declares lifecycle and query indexes", () => {
        expect(reviewSchema.path("repositoryId")).toBeDefined()
        expect(reviewSchema.path("mergeRequestId")).toBeDefined()
        expect(reviewSchema.path("status")).toBeDefined()
        expect(reviewSchema.path("issues")).toBeDefined()

        expect(hasUniqueIndex(reviewSchema, {mergeRequestId: 1})).toBe(true)
        expect(hasIndex(reviewSchema, {status: 1})).toBe(true)
        expect(hasIndex(reviewSchema, {repositoryId: 1})).toBe(true)
        expect(hasIndex(reviewSchema, {completedAt: 1})).toBe(true)
    })

    test("task schema keeps status enum and stale lookup index", () => {
        expect(taskSchema.path("type")).toBeDefined()
        expect(taskSchema.path("status")).toBeDefined()
        expect(taskSchema.path("progress")).toBeDefined()
        expect(taskSchema.path("metadata")).toBeDefined()

        const statusPath = taskSchema.path("status") as unknown as IPathWithOptions

        expect(statusPath.options?.enum).toEqual([...TASK_STATUS_VALUES])
        expect(hasIndex(taskSchema, {status: 1})).toBe(true)
        expect(hasIndex(taskSchema, {type: 1})).toBe(true)
        expect(hasIndex(taskSchema, {updatedAt: 1})).toBe(true)
    })

    test("prompt schemas provide scoped and global lookup indexes", () => {
        expect(promptTemplateSchema.path("name")).toBeDefined()
        expect(promptTemplateSchema.path("category")).toBeDefined()
        expect(promptTemplateSchema.path("isGlobal")).toBeDefined()
        expect(promptConfigurationSchema.path("templateId")).toBeDefined()
        expect(promptConfigurationSchema.path("name")).toBeDefined()

        expect(hasIndex(promptTemplateSchema, {name: 1, organizationId: 1})).toBe(true)
        expect(hasIndex(promptTemplateSchema, {category: 1})).toBe(true)
        expect(hasIndex(promptTemplateSchema, {isGlobal: 1})).toBe(true)
        expect(hasUniqueIndex(promptConfigurationSchema, {templateId: 1})).toBe(true)
        expect(hasIndex(promptConfigurationSchema, {name: 1, organizationId: 1})).toBe(true)
        expect(hasIndex(promptConfigurationSchema, {isGlobal: 1})).toBe(true)
    })

    test("ticket, settings and organization schemas provide repository indexes", () => {
        expect(reviewIssueTicketSchema.path("sourceSuggestionIds")).toBeDefined()
        expect(reviewIssueTicketSchema.path("status")).toBeDefined()
        expect(systemSettingSchema.path("key")).toBeDefined()
        expect(organizationSchema.path("ownerId")).toBeDefined()
        expect(organizationSchema.path("members")).toBeDefined()
        expect(expertPanelSchema.path("name")).toBeDefined()

        expect(hasIndex(reviewIssueTicketSchema, {sourceReviewId: 1})).toBe(true)
        expect(hasIndex(reviewIssueTicketSchema, {sourceSuggestionIds: 1})).toBe(true)
        expect(hasUniqueIndex(systemSettingSchema, {key: 1})).toBe(true)
        expect(hasIndex(organizationSchema, {ownerId: 1})).toBe(true)
        expect(hasIndex(organizationSchema, {"members.userId": 1})).toBe(true)
        expect(hasUniqueIndex(expertPanelSchema, {name: 1})).toBe(true)
    })
})
