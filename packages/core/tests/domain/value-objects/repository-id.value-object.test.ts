import {describe, expect, test} from "bun:test"

import {
    REPOSITORY_PLATFORM,
    RepositoryId,
} from "../../../src/domain/value-objects/repository-id.value-object"

describe("RepositoryId", () => {
    test("parses repository id and exposes platform and id getters", () => {
        const repositoryId = RepositoryId.parse("gh:123")

        expect(repositoryId.platform).toBe(REPOSITORY_PLATFORM.GITHUB)
        expect(repositoryId.id).toBe("123")
        expect(repositoryId.toString()).toBe("gh:123")
    })

    test("normalizes platform case and trims input", () => {
        const repositoryId = RepositoryId.parse("  GL:repo-main  ")

        expect(repositoryId.platform).toBe(REPOSITORY_PLATFORM.GITLAB)
        expect(repositoryId.id).toBe("repo-main")
        expect(repositoryId.toString()).toBe("gl:repo-main")
    })

    test("accepts all supported platform prefixes", () => {
        const github = RepositoryId.parse("gh:1")
        const gitlab = RepositoryId.parse("gl:2")
        const azure = RepositoryId.parse("az:3")
        const bitbucket = RepositoryId.parse("bb:4")

        expect(github.platform).toBe(REPOSITORY_PLATFORM.GITHUB)
        expect(gitlab.platform).toBe(REPOSITORY_PLATFORM.GITLAB)
        expect(azure.platform).toBe(REPOSITORY_PLATFORM.AZURE_DEVOPS)
        expect(bitbucket.platform).toBe(REPOSITORY_PLATFORM.BITBUCKET)
    })

    test("throws for unsupported platform prefix", () => {
        expect(() => {
            RepositoryId.parse("xx:123")
        }).toThrow("RepositoryId platform must be one of gh, gl, az, bb")
    })

    test("throws for malformed format", () => {
        expect(() => {
            RepositoryId.parse("gh123")
        }).toThrow("RepositoryId must match format <platform>:<id>")

        expect(() => {
            RepositoryId.parse(":123")
        }).toThrow("RepositoryId must match format <platform>:<id>")
    })

    test("throws for empty id part", () => {
        expect(() => {
            RepositoryId.parse("gh:")
        }).toThrow("RepositoryId id cannot be empty")

        expect(() => {
            RepositoryId.parse("gh:   ")
        }).toThrow("RepositoryId id cannot be empty")
    })

    test("throws when id contains colon delimiter", () => {
        expect(() => {
            RepositoryId.parse("gh:foo:bar")
        }).toThrow("RepositoryId id cannot contain ':'")
    })
})
