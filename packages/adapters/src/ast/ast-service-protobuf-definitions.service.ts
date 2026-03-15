import {FilePath} from "@codenautic/core"

import {
    AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE,
    AstServiceProtobufDefinitionsError,
} from "./ast-service-protobuf-definitions.error"

const DEFAULT_PROTO_FILE_PATH = "packages/adapters/src/ast/proto/ast-service.proto"
const DEFAULT_PACKAGE_NAME = "codenautic.ast.v1"
const DEFAULT_SERVICE_NAME = "AstService"

const DEFAULT_MESSAGE_TYPE_NAMES = [
    "RetryPolicy",
    "IdempotencyContext",
    "HealthCheckRequest",
    "HealthCheckResponse",
    "StartRepositoryScanRequest",
    "StartRepositoryScanResponse",
    "GetRepositoryScanStatusRequest",
    "GetRepositoryScanStatusResponse",
    "GetCodeGraphRequest",
    "CodeGraphNode",
    "CodeGraphEdge",
    "GetCodeGraphResponse",
    "GetFileMetricsRequest",
    "FileMetricsItem",
    "GetFileMetricsResponse",
] as const

const DEFAULT_METHOD_DEFINITIONS = [
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
    {
        name: "GetRepositoryScanStatus",
        requestType: "GetRepositoryScanStatusRequest",
        responseType: "GetRepositoryScanStatusResponse",
        retryable: true,
        idempotencyKeyField: "requestId",
    },
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
] as const

/**
 * Input shape for one gRPC method definition.
 */
export interface IAstServiceGrpcMethodDefinitionInput {
    /**
     * gRPC method name.
     */
    readonly name: string

    /**
     * Protobuf request message type.
     */
    readonly requestType: string

    /**
     * Protobuf response message type.
     */
    readonly responseType: string

    /**
     * Whether method is retryable by transport/client policy.
     */
    readonly retryable?: boolean

    /**
     * Idempotency key field path used by clients.
     */
    readonly idempotencyKeyField?: string
}

/**
 * Resolved gRPC method definition.
 */
export interface IAstServiceGrpcMethodDefinition {
    /**
     * gRPC method name.
     */
    readonly name: string

    /**
     * Protobuf request message type.
     */
    readonly requestType: string

    /**
     * Protobuf response message type.
     */
    readonly responseType: string

    /**
     * Whether method is retryable by transport/client policy.
     */
    readonly retryable: boolean

    /**
     * Idempotency key field path used by clients.
     */
    readonly idempotencyKeyField: string
}

/**
 * Constructor options for protobuf definitions service.
 */
export interface IAstServiceProtobufDefinitionsServiceOptions {
    /**
     * Repository-relative path to proto file.
     */
    readonly protoFilePath?: string

    /**
     * Protobuf package name.
     */
    readonly packageName?: string

    /**
     * gRPC service name.
     */
    readonly serviceName?: string

    /**
     * Message type names declared in proto file.
     */
    readonly messageTypeNames?: readonly string[]

    /**
     * gRPC method definitions.
     */
    readonly methods?: readonly IAstServiceGrpcMethodDefinitionInput[]
}

/**
 * Resolved protobuf definitions payload.
 */
export interface IAstServiceProtobufDefinitions {
    /**
     * Repository-relative path to proto file.
     */
    readonly protoFilePath: string

    /**
     * Protobuf package name.
     */
    readonly packageName: string

    /**
     * gRPC service name.
     */
    readonly serviceName: string

    /**
     * Message type names declared in proto file.
     */
    readonly messageTypeNames: readonly string[]

    /**
     * gRPC method definitions.
     */
    readonly methods: readonly IAstServiceGrpcMethodDefinition[]
}

/**
 * AST service protobuf definitions contract.
 */
export interface IAstServiceProtobufDefinitionsService {
    /**
     * Returns deterministic protobuf definitions for AST service.
     *
     * @returns Protobuf definitions payload.
     */
    getDefinitions(): Promise<IAstServiceProtobufDefinitions>
}

/**
 * Provides stable and validated protobuf definitions for AST service.
 */
export class AstServiceProtobufDefinitionsService implements IAstServiceProtobufDefinitionsService {
    private readonly definitions: IAstServiceProtobufDefinitions

    /**
     * Creates AST service protobuf definitions service.
     *
     * @param options Optional protobuf definition overrides.
     */
    public constructor(options: IAstServiceProtobufDefinitionsServiceOptions = {}) {
        this.definitions = resolveDefinitions(options)
    }

    /**
     * Returns deterministic protobuf definitions for AST service.
     *
     * @returns Protobuf definitions payload.
     */
    public getDefinitions(): Promise<IAstServiceProtobufDefinitions> {
        return Promise.resolve(cloneDefinitions(this.definitions))
    }
}

/**
 * Resolves full protobuf definitions payload with validation.
 *
 * @param options Optional protobuf definition overrides.
 * @returns Resolved protobuf definitions.
 */
function resolveDefinitions(
    options: IAstServiceProtobufDefinitionsServiceOptions,
): IAstServiceProtobufDefinitions {
    const protoFilePath = normalizeProtoFilePath(options.protoFilePath ?? DEFAULT_PROTO_FILE_PATH)
    const packageName = normalizePackageName(options.packageName ?? DEFAULT_PACKAGE_NAME)
    const serviceName = normalizeServiceName(options.serviceName ?? DEFAULT_SERVICE_NAME)
    const messageTypeNames = normalizeMessageTypeNames(
        options.messageTypeNames ?? DEFAULT_MESSAGE_TYPE_NAMES,
    )
    const methods = normalizeMethodDefinitions(options.methods ?? DEFAULT_METHOD_DEFINITIONS)

    return {
        protoFilePath,
        packageName,
        serviceName,
        messageTypeNames,
        methods,
    }
}

/**
 * Creates immutable copy of protobuf definitions payload.
 *
 * @param definitions Resolved protobuf definitions.
 * @returns Cloned protobuf definitions.
 */
function cloneDefinitions(definitions: IAstServiceProtobufDefinitions): IAstServiceProtobufDefinitions {
    return {
        ...definitions,
        messageTypeNames: [...definitions.messageTypeNames],
        methods: definitions.methods.map((method) => {
            return {...method}
        }),
    }
}

/**
 * Normalizes and validates proto file path.
 *
 * @param protoFilePath Raw proto file path.
 * @returns Normalized proto file path.
 */
function normalizeProtoFilePath(protoFilePath: string): string {
    try {
        return FilePath.create(protoFilePath).toString()
    } catch {
        throw new AstServiceProtobufDefinitionsError(
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_PROTO_FILE_PATH,
            {protoFilePath},
        )
    }
}

/**
 * Normalizes and validates protobuf package name.
 *
 * @param packageName Raw package name.
 * @returns Normalized package name.
 */
function normalizePackageName(packageName: string): string {
    const normalizedPackageName = packageName.trim()
    const packageNamePattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/

    if (packageNamePattern.test(normalizedPackageName)) {
        return normalizedPackageName
    }

    throw new AstServiceProtobufDefinitionsError(
        AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_PACKAGE_NAME,
        {packageName},
    )
}

/**
 * Normalizes and validates service name.
 *
 * @param serviceName Raw service name.
 * @returns Normalized service name.
 */
function normalizeServiceName(serviceName: string): string {
    const normalizedServiceName = serviceName.trim()
    const serviceNamePattern = /^[A-Z][A-Za-z0-9]*$/

    if (serviceNamePattern.test(normalizedServiceName)) {
        return normalizedServiceName
    }

    throw new AstServiceProtobufDefinitionsError(
        AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_SERVICE_NAME,
        {serviceName},
    )
}

/**
 * Normalizes and validates protobuf message type names.
 *
 * @param messageTypeNames Raw message type names.
 * @returns Sorted unique message type names.
 */
function normalizeMessageTypeNames(messageTypeNames: readonly string[]): readonly string[] {
    if (messageTypeNames.length === 0) {
        throw new AstServiceProtobufDefinitionsError(
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.EMPTY_MESSAGE_TYPE_NAMES,
        )
    }

    const normalized = new Set<string>()

    for (const typeName of messageTypeNames) {
        normalized.add(normalizeTypeName(typeName, "request"))
    }

    return [...normalized].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes and validates gRPC method definitions.
 *
 * @param methods Raw method definitions.
 * @returns Normalized method definitions.
 */
function normalizeMethodDefinitions(
    methods: readonly IAstServiceGrpcMethodDefinitionInput[],
): readonly IAstServiceGrpcMethodDefinition[] {
    const normalizedMethods: IAstServiceGrpcMethodDefinition[] = []
    const seenNames = new Set<string>()

    for (const method of methods) {
        const methodName = normalizeMethodName(method.name)
        if (seenNames.has(methodName)) {
            throw new AstServiceProtobufDefinitionsError(
                AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.DUPLICATE_METHOD_NAME,
                {methodName},
            )
        }

        seenNames.add(methodName)
        normalizedMethods.push({
            name: methodName,
            requestType: normalizeTypeName(method.requestType, "request"),
            responseType: normalizeTypeName(method.responseType, "response"),
            retryable: method.retryable ?? true,
            idempotencyKeyField: normalizeIdempotencyKeyField(method.idempotencyKeyField),
        })
    }

    return normalizedMethods.sort((left, right) => left.name.localeCompare(right.name))
}

/**
 * Normalizes and validates gRPC method name.
 *
 * @param methodName Raw method name.
 * @returns Normalized method name.
 */
function normalizeMethodName(methodName: string): string {
    const normalizedMethodName = methodName.trim()
    const methodNamePattern = /^[A-Z][A-Za-z0-9]*$/

    if (methodNamePattern.test(normalizedMethodName)) {
        return normalizedMethodName
    }

    throw new AstServiceProtobufDefinitionsError(
        AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_METHOD_NAME,
        {methodName},
    )
}

/**
 * Normalizes and validates protobuf request/response type name.
 *
 * @param typeName Raw type name.
 * @param role Message role.
 * @returns Normalized type name.
 */
function normalizeTypeName(typeName: string, role: "request" | "response"): string {
    const normalizedTypeName = typeName.trim()
    const typeNamePattern = /^[A-Z][A-Za-z0-9]*$/

    if (typeNamePattern.test(normalizedTypeName)) {
        return normalizedTypeName
    }

    if (role === "request") {
        throw new AstServiceProtobufDefinitionsError(
            AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_REQUEST_TYPE,
            {typeName},
        )
    }

    throw new AstServiceProtobufDefinitionsError(
        AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_RESPONSE_TYPE,
        {typeName},
    )
}

/**
 * Normalizes and validates idempotency key field path.
 *
 * @param idempotencyKeyField Raw idempotency key field.
 * @returns Normalized idempotency key field.
 */
function normalizeIdempotencyKeyField(idempotencyKeyField: string | undefined): string {
    const normalizedIdempotencyKeyField = idempotencyKeyField?.trim() ?? ""
    const idempotencyKeyFieldPattern = /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)*$/

    if (idempotencyKeyFieldPattern.test(normalizedIdempotencyKeyField)) {
        return normalizedIdempotencyKeyField
    }

    throw new AstServiceProtobufDefinitionsError(
        AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE.INVALID_IDEMPOTENCY_KEY_FIELD,
        {idempotencyKeyField},
    )
}
