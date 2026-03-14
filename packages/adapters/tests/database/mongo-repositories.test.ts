import {describe, expect, test} from "bun:test"

import {
    Expert,
    ExpertPanel,
    OrganizationId,
    REVIEW_ISSUE_TICKET_STATUS,
    UniqueId,
    type IOrganizationRepository,
    type IPromptConfigurationRepository,
    type IPromptTemplateRepository,
    type IReviewIssueTicketRepository,
    type IReviewRepository,
    type IRuleCategoryRepository,
    type IRuleRepository,
    type ISystemSettingsRepository,
    type ITaskRepository,
} from "@codenautic/core"

import {
    MongoExpertPanelRepository,
    MongoOrganizationRepository,
    MongoPromptConfigurationRepository,
    MongoPromptTemplateRepository,
    MongoReviewIssueTicketRepository,
    MongoReviewRepository,
    MongoRuleCategoryRepository,
    MongoRuleRepository,
    MongoSystemSettingsRepository,
    MongoTaskRepository,
    type IMongoModel,
    type IMongoRepositoryFactory,
} from "../../src/database/repositories"
import type {
    IExpertPanelSchema,
    IOrganizationSchema,
    IPromptConfigurationSchema,
    IPromptTemplateSchema,
    IReviewIssueTicketSchema,
    IReviewSchema,
    IRuleCategorySchema,
    IRuleSchema,
    ISystemSettingSchema,
    ITaskSchema,
} from "../../src/database/schemas"

type ReviewEntity = Parameters<IReviewRepository["save"]>[0]
type TaskEntity = Parameters<ITaskRepository["save"]>[0]
type RuleEntity = Parameters<IRuleRepository["save"]>[0]
type RuleCategoryEntity = Parameters<IRuleCategoryRepository["save"]>[0]
type PromptTemplateEntity = Parameters<IPromptTemplateRepository["save"]>[0]
type PromptConfigurationEntity = Parameters<IPromptConfigurationRepository["save"]>[0]
type ReviewIssueTicketEntity = Parameters<IReviewIssueTicketRepository["save"]>[0]
type OrganizationEntity = Parameters<IOrganizationRepository["save"]>[0]
type SystemSettingRecord = Parameters<ISystemSettingsRepository["upsert"]>[0]

/**
 * In-memory mongo model test double with captured operations.
 */
class MockMongoModel<TDocument> implements IMongoModel<TDocument> {
    public readonly findOneFilters: Array<Readonly<Record<string, unknown>>> = []
    public readonly findFilters: Array<Readonly<Record<string, unknown>>> = []
    public readonly replaceCalls: Array<{
        readonly filter: Readonly<Record<string, unknown>>
        readonly replacement: TDocument
        readonly options: Readonly<{upsert: boolean}>
    }> = []
    public readonly deleteFilters: Array<Readonly<Record<string, unknown>>> = []

    public findOneQueue: Array<TDocument | null> = []
    public findQueue: Array<readonly TDocument[]> = []

    /**
     * Finds one document.
     *
     * @param filter Mongo-like filter.
     * @returns Queued document or null.
     */
    public findOne(filter: Readonly<Record<string, unknown>>): Promise<TDocument | null> {
        this.findOneFilters.push(filter)
        const next = this.findOneQueue.shift()
        return Promise.resolve(next ?? null)
    }

    /**
     * Finds many documents.
     *
     * @param filter Mongo-like filter.
     * @returns Queued documents.
     */
    public find(filter: Readonly<Record<string, unknown>>): Promise<readonly TDocument[]> {
        this.findFilters.push(filter)
        const next = this.findQueue.shift()
        return Promise.resolve(next ?? [])
    }

    /**
     * Replaces one document.
     *
     * @param filter Mongo-like filter.
     * @param replacement Replacement document.
     * @param options Replace options.
     */
    public replaceOne(
        filter: Readonly<Record<string, unknown>>,
        replacement: TDocument,
        options: Readonly<{upsert: boolean}>,
    ): Promise<void> {
        this.replaceCalls.push({
            filter,
            replacement,
            options,
        })
        return Promise.resolve()
    }

    /**
     * Deletes one document.
     *
     * @param filter Mongo-like filter.
     */
    public deleteOne(filter: Readonly<Record<string, unknown>>): Promise<void> {
        this.deleteFilters.push(filter)
        return Promise.resolve()
    }
}

/**
 * Creates mapper/factory test double.
 *
 * @param entity Entity returned from toEntity.
 * @param document Document returned from toDocument.
 * @returns Repository factory.
 */
function createFactory<TEntity, TDocument>(
    entity: TEntity,
    document: TDocument,
): IMongoRepositoryFactory<TEntity, TDocument> {
    return {
        toEntity(_document: TDocument): TEntity {
            return entity
        },
        toDocument(_entity: TEntity): TDocument {
            return document
        },
    }
}

describe("Mongo repositories", () => {
    test("MongoReviewRepository filters by status", async () => {
        const entity = {
            id: UniqueId.create("review-1"),
        } as unknown as ReviewEntity
        const document: IReviewSchema = {
            _id: "review-1",
            repositoryId: "repo-1",
            mergeRequestId: "mr-1",
            status: "pending",
            issues: [],
            severityBudget: 100,
            consumedSeverity: 0,
            startedAt: null,
            completedAt: null,
            failedAt: null,
            failureReason: null,
        }
        const model = new MockMongoModel<IReviewSchema>()
        model.findQueue.push([document])
        const repository = new MongoReviewRepository({
            model,
            factory: createFactory(entity, document),
        })

        const result = await repository.findByStatus("pending")

        expect(model.findFilters[0]).toEqual({
            status: "pending",
        })
        expect(result).toEqual([entity])
    })

    test("MongoTaskRepository applies stale filter by updatedAt", async () => {
        const entity = {
            id: UniqueId.create("task-1"),
        } as unknown as TaskEntity
        const document: ITaskSchema = {
            _id: "task-1",
            type: "review",
            status: "PENDING",
            progress: 0,
            metadata: {},
        }
        const model = new MockMongoModel<ITaskSchema>()
        model.findQueue.push([document])
        const repository = new MongoTaskRepository({
            model,
            factory: createFactory(entity, document),
        })
        const olderThan = new Date("2026-03-01T00:00:00.000Z")

        const result = await repository.findStale(olderThan)

        expect(model.findFilters[0]).toEqual({
            updatedAt: {
                $lt: olderThan,
            },
        })
        expect(result).toEqual([entity])
    })

    test("MongoRuleRepository filters by lifecycle status", async () => {
        const entity = {
            id: UniqueId.create("rule-1"),
        } as unknown as RuleEntity
        const document: IRuleSchema = {
            _id: "rule-1",
            name: "Rule",
            description: "Description",
            expression: "expression",
            status: "active",
            activatedAt: null,
            deactivatedAt: null,
            archivedAt: null,
        }
        const model = new MockMongoModel<IRuleSchema>()
        model.findQueue.push([document])
        const repository = new MongoRuleRepository({
            model,
            factory: createFactory(entity, document),
        })

        const result = await repository.findByStatus("active")

        expect(model.findFilters[0]).toEqual({
            status: "active",
        })
        expect(result).toEqual([entity])
    })

    test("MongoRuleCategoryRepository saveMany upserts all entities", async () => {
        const entityOne = {
            id: UniqueId.create("category-1"),
        } as unknown as RuleCategoryEntity
        const entityTwo = {
            id: UniqueId.create("category-2"),
        } as unknown as RuleCategoryEntity
        const documentOne: IRuleCategorySchema = {
            _id: "category-1",
            slug: "security",
            name: "Security",
            description: "Security checks",
            weight: 50,
            isActive: true,
        }
        const documentTwo: IRuleCategorySchema = {
            _id: "category-2",
            slug: "maintainability",
            name: "Maintainability",
            description: "Maintainability checks",
            weight: 20,
            isActive: true,
        }
        const model = new MockMongoModel<IRuleCategorySchema>()
        const repository = new MongoRuleCategoryRepository({
            model,
            factory: {
                toEntity(_document: IRuleCategorySchema): RuleCategoryEntity {
                    return entityOne
                },
                toDocument(entity: RuleCategoryEntity): IRuleCategorySchema {
                    if (entity === entityOne) {
                        return documentOne
                    }
                    return documentTwo
                },
            },
        })

        await repository.saveMany([entityOne, entityTwo])

        expect(model.replaceCalls).toHaveLength(2)
        expect(model.replaceCalls[0]?.filter).toEqual({_id: "category-1"})
        expect(model.replaceCalls[1]?.filter).toEqual({_id: "category-2"})
    })

    test("MongoPromptTemplateRepository falls back to global template", async () => {
        const entity = {
            id: UniqueId.create("template-1"),
        } as unknown as PromptTemplateEntity
        const document: IPromptTemplateSchema = {
            _id: "template-1",
            name: "review-main",
            category: "analysis",
            type: "system",
            content: "Prompt",
            variables: [],
            version: 1,
            isGlobal: true,
        }
        const model = new MockMongoModel<IPromptTemplateSchema>()
        model.findOneQueue.push(null, document)
        const repository = new MongoPromptTemplateRepository({
            model,
            factory: createFactory(entity, document),
        })

        const result = await repository.findByName(
            "review-main",
            OrganizationId.create("org-1"),
        )

        expect(model.findOneFilters[0]).toEqual({
            name: "review-main",
            organizationId: "org-1",
        })
        expect(model.findOneFilters[1]).toEqual({
            name: "review-main",
            isGlobal: true,
        })
        expect(result).toBe(entity)
    })

    test("MongoPromptConfigurationRepository falls back to global config", async () => {
        const entity = {
            id: UniqueId.create("configuration-1"),
        } as unknown as PromptConfigurationEntity
        const document: IPromptConfigurationSchema = {
            _id: "configuration-1",
            templateId: "template-1",
            name: "main",
            defaults: {},
            overrides: {},
            isGlobal: true,
        }
        const model = new MockMongoModel<IPromptConfigurationSchema>()
        model.findOneQueue.push(null, document)
        const repository = new MongoPromptConfigurationRepository({
            model,
            factory: createFactory(entity, document),
        })

        const result = await repository.findByName("main", OrganizationId.create("org-1"))

        expect(model.findOneFilters[0]).toEqual({
            name: "main",
            organizationId: "org-1",
        })
        expect(model.findOneFilters[1]).toEqual({
            name: "main",
            isGlobal: true,
        })
        expect(result).toBe(entity)
    })

    test("MongoExpertPanelRepository finds panel by name", async () => {
        const entity = ExpertPanel.create([
            Expert.create({
                name: "Neo",
                role: "VETO Expert",
                responsibilities: ["Validate suggestions"],
                priority: 0,
            }),
        ])
        const document: IExpertPanelSchema = {
            _id: "panel-1",
            name: "safeguard",
            experts: [],
            decisionProcess: "vote",
        }
        const model = new MockMongoModel<IExpertPanelSchema>()
        model.findOneQueue.push(document)
        const repository = new MongoExpertPanelRepository({
            model,
            factory: createFactory(entity, document),
        })

        const result = await repository.findByName("safeguard")

        expect(model.findOneFilters[0]).toEqual({
            name: "safeguard",
        })
        expect(result).toBe(entity)
    })

    test("MongoReviewIssueTicketRepository resolves repository scope through reviews", async () => {
        const entity = {
            id: UniqueId.create("ticket-1"),
        } as unknown as ReviewIssueTicketEntity
        const model = new MockMongoModel<IReviewIssueTicketSchema>()
        model.findQueue.push([
            {
                _id: "ticket-1",
                sourceReviewId: "review-1",
                sourceSuggestionIds: ["suggestion-1"],
                filePath: "src/main.ts",
                category: "bug",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            },
            {
                _id: "ticket-2",
                sourceReviewId: "review-2",
                sourceSuggestionIds: ["suggestion-2"],
                filePath: "src/other.ts",
                category: "bug",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            },
        ])
        const reviewRepository: IReviewRepository = {
            findById(id): ReturnType<IReviewRepository["findById"]> {
                if (id.value === "review-1") {
                    return Promise.resolve({
                        repositoryId: "repo-1",
                    } as Parameters<IReviewRepository["save"]>[0])
                }
                return Promise.resolve({
                    repositoryId: "repo-2",
                } as Parameters<IReviewRepository["save"]>[0])
            },
            save(_review): ReturnType<IReviewRepository["save"]> {
                return Promise.resolve()
            },
            findByMergeRequestId(_mergeRequestId): ReturnType<IReviewRepository["findByMergeRequestId"]> {
                return Promise.resolve(null)
            },
            findByStatus(_status): ReturnType<IReviewRepository["findByStatus"]> {
                return Promise.resolve([])
            },
            findByDateRange(_from, _to): ReturnType<IReviewRepository["findByDateRange"]> {
                return Promise.resolve([])
            },
            findByRepositoryId(_repositoryId): ReturnType<IReviewRepository["findByRepositoryId"]> {
                return Promise.resolve([])
            },
        }
        const repository = new MongoReviewIssueTicketRepository({
            model,
            reviewRepository,
            factory: createFactory(entity, {
                _id: "ticket-1",
                sourceReviewId: "review-1",
                sourceSuggestionIds: ["suggestion-1"],
                filePath: "src/main.ts",
                category: "bug",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            }),
        })

        const result = await repository.findOpenByRepository("repo-1")

        expect(model.findFilters[0]).toEqual({
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })
        expect(result).toEqual([entity])
    })

    test("MongoOrganizationRepository filters by owner id", async () => {
        const entity = {
            id: UniqueId.create("organization-1"),
        } as unknown as OrganizationEntity
        const document: IOrganizationSchema = {
            _id: "organization-1",
            name: "CodeNautic",
            ownerId: "owner-1",
            settings: new Map<string, unknown>(),
            apiKeys: [],
            byokEnabled: false,
            members: [],
        }
        const model = new MockMongoModel<IOrganizationSchema>()
        model.findQueue.push([document])
        const repository = new MongoOrganizationRepository({
            model,
            factory: createFactory(entity, document),
        })

        const result = await repository.findByOwnerId(UniqueId.create("owner-1"))

        expect(model.findFilters[0]).toEqual({
            ownerId: "owner-1",
        })
        expect(result).toEqual([entity])
    })

    test("MongoSystemSettingsRepository upserts by document id", async () => {
        const record: SystemSettingRecord = {
            key: "review.defaults",
            value: {
                severityThreshold: "HIGH",
            },
        }
        const document: ISystemSettingSchema = {
            _id: "setting-review-defaults",
            key: "review.defaults",
            value: {
                severityThreshold: "HIGH",
            },
        }
        const model = new MockMongoModel<ISystemSettingSchema>()
        const repository = new MongoSystemSettingsRepository({
            model,
            factory: createFactory(record, document),
        })

        await repository.upsert(record)
        model.findOneQueue.push(document)
        const found = await repository.findByKey("review.defaults")

        expect(model.replaceCalls[0]?.filter).toEqual({
            _id: "setting-review-defaults",
        })
        expect(model.findOneFilters[0]).toEqual({
            key: "review.defaults",
        })
        expect(found).toEqual(record)
    })
})
