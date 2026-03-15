import {describe, expect, test} from "bun:test"

import {
    AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE,
    AstServiceProtobufDefinitionsError,
    AstServiceProtobufDefinitionsService,
} from "../../src/ast"

/**
 * Asserts typed AST service protobuf definitions error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstServiceProtobufDefinitionsError(
    callback: () => unknown,
    code:
        (typeof AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE)[keyof typeof AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstServiceProtobufDefinitionsError)

        if (error instanceof AstServiceProtobufDefinitionsError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstServiceProtobufDefinitionsError to be thrown")
}

describe("AstServiceProtobufDefinitionsService", () => {
    test("returns deterministic default grpc and protobuf definitions", async () => {
        const service = new AstServiceProtobufDefinitionsService()
        const definitions = await service.getDefinitions()

        expect(definitions).toEqual({
            protoFilePath: "packages/adapters/src/ast/proto/ast-service.proto",
            packageName: "codenautic.ast.v1",
            serviceName: "AstService",
            messageTypeNames: [
                "CodeGraphEdge",
                "CodeGraphNode",
                "FileMetricsItem",
                "GetCodeGraphRequest",
                "GetCodeGraphResponse",
                "GetFileMetricsRequest",
                "GetFileMetricsResponse",
                "GetRepositoryScanStatusRequest",
                "GetRepositoryScanStatusResponse",
                "HealthCheckRequest",
                "HealthCheckResponse",
                "IdempotencyContext",
                "RetryPolicy",
                "StartRepositoryScanRequest",
                "StartRepositoryScanResponse",
            ],
            methods: [
                {
                    name: "GetCodeGraph",
                    requestType: "GetCodeGraphRequest",
                    responseType: "GetCodeGraphResponse",
                    retryable: true,
                    idempotencyKeyField: "repositoryId",
                },
                {
                    name: "GetFileMetrics",
                    requestType: "GetFileMetricsRequest",
                    responseType: "GetFileMetricsResponse",
                    retryable: true,
                    idempotencyKeyField: "repositoryId",
                },
                {
                    name: "GetRepositoryScanStatus",
                    requestType: "GetRepositoryScanStatusRequest",
                    responseType: "GetRepositoryScanStatusResponse",
                    retryable: true,
                    idempotencyKeyField: "requestId",
                },
                {
                    name: "HealthCheck",
                    requestType: "HealthCheckRequest",
                    responseType: "HealthCheckResponse",
                    retryable: true,
                    idempotencyKeyField: "serviceName",
                },
                {
                    name: "StartRepositoryScan",
                    requestType: "StartRepositoryScanRequest",
                    responseType: "StartRepositoryScanResponse",
                    retryable: true,
                    idempotencyKeyField: "idempotency.key",
                },
            ],
        })
    })

    test("supports custom package, methods, and message type definitions", async () => {
        const service = new AstServiceProtobufDefinitionsService({
            protoFilePath: "packages/adapters/src/ast/proto/ast-service-v2.proto",
            packageName: "codenautic.ast.v2",
            serviceName: "AstServiceV2",
            messageTypeNames: [
                "HealthCheckRequest",
                "HealthCheckResponse",
                "RepositoryScanRequest",
            ],
            methods: [
                {
                    name: "HealthCheck",
                    requestType: "HealthCheckRequest",
                    responseType: "HealthCheckResponse",
                    idempotencyKeyField: "service",
                },
                {
                    name: "ScanRepository",
                    requestType: "RepositoryScanRequest",
                    responseType: "HealthCheckResponse",
                    idempotencyKeyField: "request.id",
                },
            ],
        })
        const definitions = await service.getDefinitions()

        expect(definitions.protoFilePath).toBe("packages/adapters/src/ast/proto/ast-service-v2.proto")
        expect(definitions.packageName).toBe("codenautic.ast.v2")
        expect(definitions.serviceName).toBe("AstServiceV2")
        expect(definitions.messageTypeNames).toEqual([
            "HealthCheckRequest",
            "HealthCheckResponse",
            "RepositoryScanRequest",
        ])
        expect(definitions.methods.map((method) => method.name)).toEqual([
            "HealthCheck",
            "ScanRepository",
        ])
    })

    test("returns deterministic cloned payload for repeated reads", async () => {
        const service = new AstServiceProtobufDefinitionsService()
        const first = await service.getDefinitions()
        const second = await service.getDefinitions()

        expect(second).toEqual(first)
        expect(second).not.toBe(first)
    })

    test("throws typed errors for invalid protobuf definition values", () => {
        expectAstServiceProtobufDefinitionsError(
            () => {
                void new AstServiceProtobufDefinitionsService({
                    packageName: "codenautic.ast.v1.",
                })
            },
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_PACKAGE_NAME,
        )

        expectAstServiceProtobufDefinitionsError(
            () => {
                void new AstServiceProtobufDefinitionsService({
                    serviceName: "astService",
                })
            },
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_SERVICE_NAME,
        )

        expectAstServiceProtobufDefinitionsError(
            () => {
                void new AstServiceProtobufDefinitionsService({
                    methods: [
                        {
                            name: "HealthCheck",
                            requestType: "HealthCheckRequest",
                            responseType: "HealthCheckResponse",
                            idempotencyKeyField: "service",
                        },
                        {
                            name: "HealthCheck",
                            requestType: "HealthCheckRequest",
                            responseType: "HealthCheckResponse",
                            idempotencyKeyField: "service",
                        },
                    ],
                })
            },
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.DUPLICATE_METHOD_NAME,
        )

        expectAstServiceProtobufDefinitionsError(
            () => {
                void new AstServiceProtobufDefinitionsService({
                    methods: [
                        {
                            name: "health_check",
                            requestType: "HealthCheckRequest",
                            responseType: "HealthCheckResponse",
                            idempotencyKeyField: "service",
                        },
                    ],
                })
            },
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_METHOD_NAME,
        )

        expectAstServiceProtobufDefinitionsError(
            () => {
                void new AstServiceProtobufDefinitionsService({
                    methods: [
                        {
                            name: "HealthCheck",
                            requestType: "HealthCheckRequest",
                            responseType: "HealthCheckResponse",
                            idempotencyKeyField: "  ",
                        },
                    ],
                })
            },
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_IDEMPOTENCY_KEY_FIELD,
        )
    })
})
