import {describe, expect, test} from "bun:test"

import {Container} from "@codenautic/core"

import {
    GIT_TOKENS,
    GitLabMergeRequestAcl,
    registerGitModule,
} from "../../src/git"
import {
    AnthropicCompletionAcl,
    LLM_TOKENS,
    LlmFallbackPolicy,
    OpenAiCompletionAcl,
    registerLlmModule,
} from "../../src/llm"
import {
    CONTEXT_TOKENS,
    JiraIssueAcl,
    registerContextModule,
} from "../../src/context"
import {
    INBOX_DEDUP_STATUS,
    MESSAGING_TOKENS,
    OUTBOX_WRITE_STATUS,
    InboxDeduplicatorAdapter,
    OutboxWriterAdapter,
    registerMessagingModule,
} from "../../src/messaging"
import {
    NOTIFICATION_CHANNEL,
    NOTIFICATION_DELIVERY_STATUS,
    NOTIFICATIONS_TOKENS,
    InMemoryNotificationDispatcherAdapter,
    registerNotificationsModule,
} from "../../src/notifications"
import {
    AST_LANGUAGE,
    AST_NODE_KIND,
    AST_TOKENS,
    RegexAstParserAdapter,
    registerAstModule,
} from "../../src/ast"
import {
    WORKER_ENQUEUE_STATUS,
    WORKER_TOKENS,
    InMemoryWorkerQueueAdapter,
    WorkerProcessorRegistryAdapter,
    registerWorkerModule,
} from "../../src/worker"

describe("Git module registration", () => {
    test("registers default singleton dependencies", () => {
        const container = new Container()

        registerGitModule(container)

        expect(container.has(GIT_TOKENS.GitLabMergeRequestAcl)).toBe(true)
        const first = container.resolve(GIT_TOKENS.GitLabMergeRequestAcl)
        const second = container.resolve(GIT_TOKENS.GitLabMergeRequestAcl)

        expect(first instanceof GitLabMergeRequestAcl).toBe(true)
        expect(first === second).toBe(true)
    })

    test("uses override instances when provided", () => {
        const container = new Container()
        const customAcl = new GitLabMergeRequestAcl()

        registerGitModule(container, {
            gitLabMergeRequestAcl: customAcl,
        })

        const resolved = container.resolve(GIT_TOKENS.GitLabMergeRequestAcl)
        expect(resolved).toBe(customAcl)
    })
})

describe("LLM module registration", () => {
    test("registers default singleton dependencies", () => {
        const container = new Container()

        registerLlmModule(container)

        expect(container.has(LLM_TOKENS.OpenAiCompletionAcl)).toBe(true)
        expect(container.has(LLM_TOKENS.AnthropicCompletionAcl)).toBe(true)
        expect(container.has(LLM_TOKENS.FallbackPolicy)).toBe(true)

        const openAiFirst = container.resolve(LLM_TOKENS.OpenAiCompletionAcl)
        const openAiSecond = container.resolve(LLM_TOKENS.OpenAiCompletionAcl)
        const anthropicFirst = container.resolve(LLM_TOKENS.AnthropicCompletionAcl)
        const anthropicSecond = container.resolve(LLM_TOKENS.AnthropicCompletionAcl)
        const fallbackFirst = container.resolve(LLM_TOKENS.FallbackPolicy)
        const fallbackSecond = container.resolve(LLM_TOKENS.FallbackPolicy)

        expect(openAiFirst instanceof OpenAiCompletionAcl).toBe(true)
        expect(anthropicFirst instanceof AnthropicCompletionAcl).toBe(true)
        expect(fallbackFirst instanceof LlmFallbackPolicy).toBe(true)
        expect(openAiFirst === openAiSecond).toBe(true)
        expect(anthropicFirst === anthropicSecond).toBe(true)
        expect(fallbackFirst === fallbackSecond).toBe(true)
    })

    test("uses override instances when provided", () => {
        const container = new Container()
        const customOpenAiAcl = new OpenAiCompletionAcl()
        const customAnthropicAcl = new AnthropicCompletionAcl()
        const customFallbackPolicy = new LlmFallbackPolicy()

        registerLlmModule(container, {
            openAiCompletionAcl: customOpenAiAcl,
            anthropicCompletionAcl: customAnthropicAcl,
            fallbackPolicy: customFallbackPolicy,
        })

        expect(container.resolve(LLM_TOKENS.OpenAiCompletionAcl)).toBe(customOpenAiAcl)
        expect(container.resolve(LLM_TOKENS.AnthropicCompletionAcl)).toBe(customAnthropicAcl)
        expect(container.resolve(LLM_TOKENS.FallbackPolicy)).toBe(customFallbackPolicy)
    })
})

describe("Context module registration", () => {
    test("registers default singleton dependencies", () => {
        const container = new Container()

        registerContextModule(container)

        expect(container.has(CONTEXT_TOKENS.JiraIssueAcl)).toBe(true)
        const first = container.resolve(CONTEXT_TOKENS.JiraIssueAcl)
        const second = container.resolve(CONTEXT_TOKENS.JiraIssueAcl)

        expect(first instanceof JiraIssueAcl).toBe(true)
        expect(first === second).toBe(true)
    })

    test("uses override instance when provided", () => {
        const container = new Container()
        const customAcl = new JiraIssueAcl()

        registerContextModule(container, {
            jiraIssueAcl: customAcl,
        })

        expect(container.resolve(CONTEXT_TOKENS.JiraIssueAcl)).toBe(customAcl)
    })
})

describe("Messaging module registration", () => {
    test("registers default singleton dependencies", () => {
        const container = new Container()

        registerMessagingModule(container)

        expect(container.has(MESSAGING_TOKENS.OutboxWriter)).toBe(true)
        expect(container.has(MESSAGING_TOKENS.InboxDeduplicator)).toBe(true)

        const outboxFirst = container.resolve(MESSAGING_TOKENS.OutboxWriter)
        const outboxSecond = container.resolve(MESSAGING_TOKENS.OutboxWriter)
        const inboxFirst = container.resolve(MESSAGING_TOKENS.InboxDeduplicator)
        const inboxSecond = container.resolve(MESSAGING_TOKENS.InboxDeduplicator)

        expect(outboxFirst instanceof OutboxWriterAdapter).toBe(true)
        expect(inboxFirst instanceof InboxDeduplicatorAdapter).toBe(true)
        expect(outboxFirst === outboxSecond).toBe(true)
        expect(inboxFirst === inboxSecond).toBe(true)

        const outboxWrite = outboxFirst.write({
            messageKey: "msg-default-module",
            topic: "review.started",
            payload: {
                reviewId: "rev-module",
            },
        })
        const inboxRegister = inboxFirst.register("msg-default-module")

        expect(outboxWrite.isOk).toBe(true)
        expect(inboxRegister.isOk).toBe(true)
        if (outboxWrite.isFail || inboxRegister.isFail) {
            throw new Error("Expected successful messaging operations")
        }

        expect(outboxWrite.value.status).toBe(OUTBOX_WRITE_STATUS.STORED)
        expect(inboxRegister.value.status).toBe(INBOX_DEDUP_STATUS.ACCEPTED)
    })

    test("uses override instances when provided", () => {
        const container = new Container()
        const customOutbox = new OutboxWriterAdapter(() => new Date("2026-03-03T00:00:00.000Z"))
        const customInbox = new InboxDeduplicatorAdapter()

        registerMessagingModule(container, {
            outboxWriter: customOutbox,
            inboxDeduplicator: customInbox,
        })

        expect(container.resolve(MESSAGING_TOKENS.OutboxWriter)).toBe(customOutbox)
        expect(container.resolve(MESSAGING_TOKENS.InboxDeduplicator)).toBe(customInbox)
    })
})

describe("Notifications module registration", () => {
    test("registers default singleton dispatcher", () => {
        const container = new Container()

        registerNotificationsModule(container)

        expect(container.has(NOTIFICATIONS_TOKENS.Dispatcher)).toBe(true)
        const first = container.resolve(NOTIFICATIONS_TOKENS.Dispatcher)
        const second = container.resolve(NOTIFICATIONS_TOKENS.Dispatcher)

        expect(first instanceof InMemoryNotificationDispatcherAdapter).toBe(true)
        expect(first === second).toBe(true)

        const result = first.dispatch({
            channel: NOTIFICATION_CHANNEL.SLACK,
            recipient: "team-review",
            body: "Build is green",
            idempotencyKey: "notif-module-1",
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful notification dispatch")
        }

        expect(result.value.status).toBe(NOTIFICATION_DELIVERY_STATUS.SENT)
    })

    test("uses override instance when provided", () => {
        const container = new Container()
        const dispatcher = new InMemoryNotificationDispatcherAdapter()

        registerNotificationsModule(container, {
            dispatcher,
        })

        expect(container.resolve(NOTIFICATIONS_TOKENS.Dispatcher)).toBe(dispatcher)
    })
})

describe("AST module registration", () => {
    test("registers default singleton parser", () => {
        const container = new Container()

        registerAstModule(container)

        expect(container.has(AST_TOKENS.Parser)).toBe(true)
        const first = container.resolve(AST_TOKENS.Parser)
        const second = container.resolve(AST_TOKENS.Parser)

        expect(first instanceof RegexAstParserAdapter).toBe(true)
        expect(first === second).toBe(true)

        const result = first.parse({
            language: AST_LANGUAGE.TYPESCRIPT,
            filePath: "src/sample.ts",
            sourceCode: `function run() {}\nclass Runner {}\ninterface RunnerPort {}\ntype RunnerId = string`,
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful AST parse")
        }

        expect(result.value.nodes).toEqual([
            {kind: AST_NODE_KIND.FUNCTION, name: "run", startLine: 1, endLine: 1},
            {kind: AST_NODE_KIND.CLASS, name: "Runner", startLine: 2, endLine: 2},
            {kind: AST_NODE_KIND.INTERFACE, name: "RunnerPort", startLine: 3, endLine: 3},
            {kind: AST_NODE_KIND.TYPE_ALIAS, name: "RunnerId", startLine: 4, endLine: 4},
        ])
    })

    test("uses override instance when provided", () => {
        const container = new Container()
        const parser = new RegexAstParserAdapter()

        registerAstModule(container, {
            parser,
        })

        expect(container.resolve(AST_TOKENS.Parser)).toBe(parser)
    })
})

describe("Worker module registration", () => {
    test("registers default singleton queue and processor registry", async () => {
        const container = new Container()

        registerWorkerModule(container)

        expect(container.has(WORKER_TOKENS.Queue)).toBe(true)
        expect(container.has(WORKER_TOKENS.ProcessorRegistry)).toBe(true)

        const queue = container.resolve(WORKER_TOKENS.Queue)
        const registry = container.resolve(WORKER_TOKENS.ProcessorRegistry)

        expect(queue instanceof InMemoryWorkerQueueAdapter).toBe(true)
        expect(registry instanceof WorkerProcessorRegistryAdapter).toBe(true)
        expect(queue === container.resolve(WORKER_TOKENS.Queue)).toBe(true)
        expect(registry === container.resolve(WORKER_TOKENS.ProcessorRegistry)).toBe(true)

        const registerResult = registry.register("scan", (_payload) => {
            return
        })
        expect(registerResult.isOk).toBe(true)

        const enqueueResult = queue.enqueue({
            id: "job-module-1",
            type: "scan",
            payload: {
                repositoryId: "repo-1",
            },
        })
        expect(enqueueResult.isOk).toBe(true)
        if (enqueueResult.isFail) {
            throw new Error("Expected successful enqueue")
        }
        expect(enqueueResult.value.status).toBe(WORKER_ENQUEUE_STATUS.ENQUEUED)

        const dequeued = queue.dequeue("scan")
        if (dequeued === undefined) {
            throw new Error("Expected queued job")
        }

        const processor = registry.resolve("scan")
        if (processor === undefined) {
            throw new Error("Expected registered processor")
        }

        await processor(dequeued.payload)
    })

    test("uses override instances when provided", () => {
        const container = new Container()
        const queue = new InMemoryWorkerQueueAdapter()
        const processorRegistry = new WorkerProcessorRegistryAdapter()

        registerWorkerModule(container, {
            queue,
            processorRegistry,
        })

        expect(container.resolve(WORKER_TOKENS.Queue)).toBe(queue)
        expect(container.resolve(WORKER_TOKENS.ProcessorRegistry)).toBe(processorRegistry)
    })
})
