import {describe, expect, test} from "bun:test"

import {
    AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE,
    AstServiceArchitectureDesignError,
    AstServiceArchitectureDesignService,
} from "../../src/ast"

/**
 * Asserts typed AST service architecture design error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstServiceArchitectureDesignError(
    callback: () => unknown,
    code:
        (typeof AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE)[keyof typeof AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstServiceArchitectureDesignError)

        if (error instanceof AstServiceArchitectureDesignError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstServiceArchitectureDesignError to be thrown")
}

describe("AstServiceArchitectureDesignService", () => {
    test("creates deterministic scalable architecture blueprint with defaults", async () => {
        const service = new AstServiceArchitectureDesignService()
        const result = await service.design()

        expect(result.serviceName).toBe("ast-service")
        expect(result.grpc).toEqual({
            port: 50051,
            requestTimeoutMs: 15000,
        })
        expect(result.scaling).toEqual({
            minReplicas: 2,
            maxReplicas: 12,
            workerPoolSize: 24,
        })
        expect(result.runtimePolicies).toEqual({
            ingestBatchSize: 64,
            idempotencyTtlMs: 86400000,
            retryPolicy: {
                maxAttempts: 5,
                initialBackoffMs: 250,
                maxBackoffMs: 5000,
            },
        })
        expect(result.queueNames).toEqual({
            ingest: "ast.ingest",
            parse: "ast.parse",
            graph: "ast.graph",
            metrics: "ast.metrics",
            deadLetter: "ast.dlq",
        })
        expect(result.components.map((component) => component.id)).toEqual([
            "api-gateway",
            "grpc-service",
            "job-orchestrator",
            "worker-pool",
            "idempotency-store",
            "queue-system",
            "parsed-ast-cache",
            "graph-store",
            "metrics-pipeline",
        ])
        expect(result.flow).toEqual([
            {
                source: "api-gateway",
                target: "grpc-service",
                channel: "grpc",
            },
            {
                source: "grpc-service",
                target: "job-orchestrator",
                channel: "ast.ingest",
            },
            {
                source: "job-orchestrator",
                target: "worker-pool",
                channel: "ast.parse",
            },
            {
                source: "worker-pool",
                target: "graph-store",
                channel: "ast.graph",
            },
            {
                source: "worker-pool",
                target: "metrics-pipeline",
                channel: "ast.metrics",
            },
            {
                source: "queue-system",
                target: "worker-pool",
                channel: "ast.dlq",
            },
        ])
        expect(result.summary).toEqual({
            componentCount: 9,
            flowCount: 6,
            maxParallelWorkers: 288,
        })
    })

    test("applies custom topology and runtime overrides", async () => {
        const service = new AstServiceArchitectureDesignService()
        const result = await service.design({
            serviceName: "ast-service-multi-repo",
            grpcPort: 60061,
            minReplicas: 3,
            maxReplicas: 20,
            workerPoolSize: 16,
            ingestBatchSize: 128,
            requestTimeoutMs: 30000,
            idempotencyTtlMs: 172800000,
            retryPolicy: {
                maxAttempts: 7,
                initialBackoffMs: 400,
                maxBackoffMs: 12000,
            },
            queueNames: {
                ingest: "astv2.ingest",
                parse: "astv2.parse",
                graph: "astv2.graph",
                metrics: "astv2.metrics",
                deadLetter: "astv2.dlq",
            },
        })

        expect(result.serviceName).toBe("ast-service-multi-repo")
        expect(result.grpc).toEqual({
            port: 60061,
            requestTimeoutMs: 30000,
        })
        expect(result.scaling).toEqual({
            minReplicas: 3,
            maxReplicas: 20,
            workerPoolSize: 16,
        })
        expect(result.runtimePolicies.retryPolicy).toEqual({
            maxAttempts: 7,
            initialBackoffMs: 400,
            maxBackoffMs: 12000,
        })
        expect(result.queueNames).toEqual({
            ingest: "astv2.ingest",
            parse: "astv2.parse",
            graph: "astv2.graph",
            metrics: "astv2.metrics",
            deadLetter: "astv2.dlq",
        })
        expect(result.summary.maxParallelWorkers).toBe(320)
    })

    test("returns deterministic blueprint for repeated runs", async () => {
        const service = new AstServiceArchitectureDesignService()
        const input = {
            serviceName: "deterministic-ast",
            minReplicas: 4,
            maxReplicas: 10,
            workerPoolSize: 10,
        }

        const first = await service.design(input)
        const second = await service.design(input)

        expect(second).toEqual(first)
    })

    test("throws typed errors for invalid design input", () => {
        const service = new AstServiceArchitectureDesignService()

        expectAstServiceArchitectureDesignError(
            () => {
                void service.design({
                    serviceName: "   ",
                })
            },
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_SERVICE_NAME,
        )

        expectAstServiceArchitectureDesignError(
            () => {
                void service.design({
                    minReplicas: 6,
                    maxReplicas: 3,
                })
            },
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_REPLICA_RANGE,
        )

        expectAstServiceArchitectureDesignError(
            () => {
                void service.design({
                    retryPolicy: {
                        initialBackoffMs: 5000,
                        maxBackoffMs: 1000,
                    },
                })
            },
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_RETRY_MAX_BACKOFF_MS,
        )

        expectAstServiceArchitectureDesignError(
            () => {
                void service.design({
                    queueNames: {
                        ingest: "ast ingest",
                    },
                })
            },
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_QUEUE_NAME,
        )
    })
})
