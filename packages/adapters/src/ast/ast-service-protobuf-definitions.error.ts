/**
 * Typed error codes for AST service protobuf definitions.
 */
export const AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE = {
    DUPLICATE_METHOD_NAME: "DUPLICATE_METHOD_NAME",
    EMPTY_MESSAGE_TYPE_NAMES: "EMPTY_MESSAGE_TYPE_NAMES",
    INVALID_IDEMPOTENCY_KEY_FIELD: "INVALID_IDEMPOTENCY_KEY_FIELD",
    INVALID_METHOD_NAME: "INVALID_METHOD_NAME",
    INVALID_PACKAGE_NAME: "INVALID_PACKAGE_NAME",
    INVALID_PROTO_FILE_PATH: "INVALID_PROTO_FILE_PATH",
    INVALID_REQUEST_TYPE: "INVALID_REQUEST_TYPE",
    INVALID_RESPONSE_TYPE: "INVALID_RESPONSE_TYPE",
    INVALID_SERVICE_NAME: "INVALID_SERVICE_NAME",
} as const

/**
 * AST service protobuf definitions error code literal.
 */
export type AstServiceProtobufDefinitionsErrorCode =
    (typeof AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE)[keyof typeof AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_CODE]

/**
 * Structured metadata for AST service protobuf definitions failures.
 */
export interface IAstServiceProtobufDefinitionsErrorDetails {
    /**
     * Invalid proto file path when available.
     */
    readonly protoFilePath?: string

    /**
     * Invalid package name when available.
     */
    readonly packageName?: string

    /**
     * Invalid service name when available.
     */
    readonly serviceName?: string

    /**
     * Invalid method name when available.
     */
    readonly methodName?: string

    /**
     * Invalid request or response type when available.
     */
    readonly typeName?: string

    /**
     * Invalid idempotency key field when available.
     */
    readonly idempotencyKeyField?: string
}

/**
 * Typed AST service protobuf definitions error with stable metadata.
 */
export class AstServiceProtobufDefinitionsError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstServiceProtobufDefinitionsErrorCode

    /**
     * Invalid proto file path when available.
     */
    public readonly protoFilePath?: string

    /**
     * Invalid package name when available.
     */
    public readonly packageName?: string

    /**
     * Invalid service name when available.
     */
    public readonly serviceName?: string

    /**
     * Invalid method name when available.
     */
    public readonly methodName?: string

    /**
     * Invalid request or response type when available.
     */
    public readonly typeName?: string

    /**
     * Invalid idempotency key field when available.
     */
    public readonly idempotencyKeyField?: string

    /**
     * Creates typed AST service protobuf definitions error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstServiceProtobufDefinitionsErrorCode,
        details: IAstServiceProtobufDefinitionsErrorDetails = {},
    ) {
        super(createAstServiceProtobufDefinitionsErrorMessage(code, details))

        this.name = "AstServiceProtobufDefinitionsError"
        this.code = code
        this.protoFilePath = details.protoFilePath
        this.packageName = details.packageName
        this.serviceName = details.serviceName
        this.methodName = details.methodName
        this.typeName = details.typeName
        this.idempotencyKeyField = details.idempotencyKeyField
    }
}

/**
 * Builds stable public message for AST service protobuf definitions failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstServiceProtobufDefinitionsErrorMessage(
    code: AstServiceProtobufDefinitionsErrorCode,
    details: IAstServiceProtobufDefinitionsErrorDetails,
): string {
    return AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_MESSAGES[code](details)
}

const AST_SERVICE_PROTOBUF_DEFINITIONS_ERROR_MESSAGES: Readonly<
    Record<
        AstServiceProtobufDefinitionsErrorCode,
        (details: IAstServiceProtobufDefinitionsErrorDetails) => string
    >
> = {
    DUPLICATE_METHOD_NAME: (details) =>
        `Duplicate gRPC method name in ast service protobuf definitions: ${
            details.methodName ?? "<empty>"
        }`,
    EMPTY_MESSAGE_TYPE_NAMES: () => "Ast service protobuf definitions message type list cannot be empty",
    INVALID_IDEMPOTENCY_KEY_FIELD: (details) =>
        `Invalid idempotency key field in ast service protobuf definitions: ${
            details.idempotencyKeyField ?? "<empty>"
        }`,
    INVALID_METHOD_NAME: (details) =>
        `Invalid gRPC method name in ast service protobuf definitions: ${
            details.methodName ?? "<empty>"
        }`,
    INVALID_PACKAGE_NAME: (details) =>
        `Invalid protobuf package name in ast service protobuf definitions: ${
            details.packageName ?? "<empty>"
        }`,
    INVALID_PROTO_FILE_PATH: (details) =>
        `Invalid protobuf file path in ast service protobuf definitions: ${
            details.protoFilePath ?? "<empty>"
        }`,
    INVALID_REQUEST_TYPE: (details) =>
        `Invalid protobuf request type in ast service protobuf definitions: ${
            details.typeName ?? "<empty>"
        }`,
    INVALID_RESPONSE_TYPE: (details) =>
        `Invalid protobuf response type in ast service protobuf definitions: ${
            details.typeName ?? "<empty>"
        }`,
    INVALID_SERVICE_NAME: (details) =>
        `Invalid protobuf service name in ast service protobuf definitions: ${
            details.serviceName ?? "<empty>"
        }`,
}
