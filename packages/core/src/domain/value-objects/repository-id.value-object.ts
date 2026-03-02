/**
 * Supported repository platform prefixes.
 */
export const REPOSITORY_PLATFORM = {
    GITHUB: "gh",
    GITLAB: "gl",
    AZURE_DEVOPS: "az",
    BITBUCKET: "bb",
} as const

/**
 * Literal type for repository platform prefixes.
 */
export type RepositoryPlatform = (typeof REPOSITORY_PLATFORM)[keyof typeof REPOSITORY_PLATFORM]

const SUPPORTED_PLATFORM_VALUES: ReadonlyArray<RepositoryPlatform> = Object.values(REPOSITORY_PLATFORM)
const REPOSITORY_ID_FORMAT = /^([a-z]{2}):(.*)$/i

/**
 * Immutable repository identifier in `<platform>:<id>` format.
 */
export class RepositoryId {
    private readonly repositoryPlatform: RepositoryPlatform
    private readonly repositoryIdentifier: string

    /**
     * Creates immutable repository id.
     *
     * @param repositoryPlatform Supported platform prefix.
     * @param repositoryIdentifier Repository identifier part.
     */
    private constructor(repositoryPlatform: RepositoryPlatform, repositoryIdentifier: string) {
        this.repositoryPlatform = repositoryPlatform
        this.repositoryIdentifier = repositoryIdentifier
        Object.freeze(this)
    }

    /**
     * Creates validated repository id from explicit components.
     *
     * @param platform Supported platform prefix.
     * @param id Repository identifier part.
     * @returns Immutable repository id.
     * @throws Error When id is empty.
     * @throws Error When id contains `:` separator.
     */
    public static create(platform: RepositoryPlatform, id: string): RepositoryId {
        const normalizedId = id.trim()
        if (normalizedId.length === 0) {
            throw new Error("RepositoryId id cannot be empty")
        }

        if (normalizedId.includes(":")) {
            throw new Error("RepositoryId id cannot contain ':'")
        }

        return new RepositoryId(platform, normalizedId)
    }

    /**
     * Parses repository id from `<platform>:<id>` string.
     *
     * @param value Raw repository id string.
     * @returns Parsed immutable repository id.
     * @throws Error When format is invalid.
     * @throws Error When platform prefix is unsupported.
     * @throws Error When id part is invalid.
     */
    public static parse(value: string): RepositoryId {
        const normalizedValue = value.trim()
        const match = REPOSITORY_ID_FORMAT.exec(normalizedValue)

        if (match === null) {
            throw new Error("RepositoryId must match format <platform>:<id>")
        }

        const platformSegment = match[1]
        const idSegment = match[2]

        if (platformSegment === undefined || idSegment === undefined) {
            throw new Error("RepositoryId must match format <platform>:<id>")
        }

        const rawPlatform = platformSegment.toLowerCase()
        if (!isRepositoryPlatform(rawPlatform)) {
            throw new Error("RepositoryId platform must be one of gh, gl, az, bb")
        }

        return RepositoryId.create(rawPlatform, idSegment)
    }

    /**
     * Repository platform prefix.
     *
     * @returns Platform prefix.
     */
    public get platform(): RepositoryPlatform {
        return this.repositoryPlatform
    }

    /**
     * Repository identifier part without platform prefix.
     *
     * @returns Repository id part.
     */
    public get id(): string {
        return this.repositoryIdentifier
    }

    /**
     * Stable canonical string representation.
     *
     * @returns String in `<platform>:<id>` format.
     */
    public toString(): string {
        return `${this.repositoryPlatform}:${this.repositoryIdentifier}`
    }
}

/**
 * Type guard for repository platform prefix.
 *
 * @param value Candidate platform prefix.
 * @returns True when value is one of supported prefixes.
 */
function isRepositoryPlatform(value: string): value is RepositoryPlatform {
    return SUPPORTED_PLATFORM_VALUES.includes(value as RepositoryPlatform)
}
