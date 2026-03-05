import {describe, expect, test} from "bun:test"

import type {IRuleCategoryRepository} from "../../../../src/application/ports/outbound/rule/rule-category-repository.port"
import type {IRuleCategoryProps} from "../../../../src/domain/entities/rule-category.entity"
import {RuleCategory} from "../../../../src/domain/entities/rule-category.entity"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

/**
 * In-memory implementation for `IRuleCategoryRepository`.
 */
class InMemoryRuleCategoryRepository implements IRuleCategoryRepository {
    private readonly storage: Map<string, RuleCategory>

    public constructor() {
        this.storage = new Map<string, RuleCategory>()
    }

    public findById(id: UniqueId): Promise<RuleCategory | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(category: RuleCategory): Promise<void> {
        this.storage.set(category.id.value, category)

        return Promise.resolve()
    }

    public findBySlug(slug: string): Promise<RuleCategory | null> {
        for (const category of this.storage.values()) {
            if (category.slug === slug) {
                return Promise.resolve(category)
            }
        }

        return Promise.resolve(null)
    }

    public findAll(): Promise<readonly RuleCategory[]> {
        return Promise.resolve([...this.storage.values()])
    }

    public findActive(): Promise<readonly RuleCategory[]> {
        return Promise.resolve(
            [...this.storage.values()].filter((category) => {
                return category.isActive
            }),
        )
    }

    public findAllWithWeights(): Promise<readonly {slug: string; weight: number}[]> {
        return Promise.resolve(
            [...this.storage.values()].map((category) => {
                return {
                    slug: category.slug,
                    weight: category.weight,
                }
            }),
        )
    }

    public saveMany(categories: readonly RuleCategory[]): Promise<void> {
        for (const category of categories) {
            this.storage.set(category.id.value, category)
        }

        return Promise.resolve()
    }
}

function createCategory(
    props: Omit<IRuleCategoryProps, "isActive"> & {isActive?: boolean},
): RuleCategory {
    return new RuleCategory(UniqueId.create(), {
        ...props,
        isActive: props.isActive ?? true,
    })
}

describe("IRuleCategoryRepository contract", () => {
    test("saves and finds rule category by identifier", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const category = createCategory({
            slug: "security",
            name: "Security",
            description: "Security checks and recommendations",
            weight: 1,
            isActive: true,
        })

        await repository.save(category)

        const found = await repository.findById(category.id)

        expect(found).not.toBeNull()
        if (found === null) {
            throw new Error("Saved category should be retrievable by id")
        }

        expect(found.id.equals(category.id)).toBe(true)
        expect(found.slug).toBe("security")
    })

    test("finds category by slug", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const security = createCategory({
            slug: "security",
            name: "Security",
            description: "Security checks",
            weight: 1,
            isActive: true,
        })
        const quality = createCategory({
            slug: "quality",
            name: "Quality",
            description: "Quality rules",
            weight: 2,
            isActive: true,
        })

        await repository.save(security)
        await repository.save(quality)

        const result = await repository.findBySlug("quality")

        expect(result).not.toBeNull()
        if (result === null) {
            throw new Error("Expected security category to exist")
        }
        expect(result.slug).toBe("quality")
    })

    test("finds all categories", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const one = createCategory({
            slug: "security",
            name: "Security",
            description: "Security checks",
            weight: 1,
            isActive: true,
        })
        const two = createCategory({
            slug: "maintainability",
            name: "Maintainability",
            description: "Code health",
            weight: 0,
            isActive: false,
        })

        await repository.saveMany([one, two])

        const all = await repository.findAll()

        expect(all).toHaveLength(2)
    })

    test("finds only active categories", async () => {
        const repository = new InMemoryRuleCategoryRepository()

        const active = createCategory({
            slug: "security",
            name: "Security",
            description: "Security checks",
            weight: 1,
            isActive: true,
        })
        const inactive = createCategory({
            slug: "legacy",
            name: "Legacy",
            description: "Old rules",
            weight: 0,
            isActive: false,
        })

        await repository.saveMany([active, inactive])

        const activeCategories = await repository.findActive()

        expect(activeCategories).toHaveLength(1)
        expect(activeCategories[0]?.slug).toBe("security")
    })

    test("finds category weights", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const security = createCategory({
            slug: "security",
            name: "Security",
            description: "Security checks",
            weight: 3,
            isActive: true,
        })
        const quality = createCategory({
            slug: "quality",
            name: "Quality",
            description: "Quality rules",
            weight: 1.5,
            isActive: true,
        })

        await repository.saveMany([security, quality])

        const weights = await repository.findAllWithWeights()

        expect(weights).toEqual([
            {
                slug: "security",
                weight: 3,
            },
            {
                slug: "quality",
                weight: 1.5,
            },
        ])
    })
})
