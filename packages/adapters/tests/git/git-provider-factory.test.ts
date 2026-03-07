import {describe, expect, test} from "bun:test"

import {
    GIT_PROVIDER_FACTORY_ERROR_CODE,
    GIT_PROVIDER_TYPE,
    GitProviderFactory,
    GitProviderFactoryError,
    normalizeGitProviderType,
} from "../../src/git"
import {createGitProviderMock} from "../helpers/provider-factories"

/**
 * Asserts typed Git provider factory error payload.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 * @param providerType Expected raw provider input.
 */
function expectGitFactoryError(
    callback: () => unknown,
    code: (typeof GIT_PROVIDER_FACTORY_ERROR_CODE)[keyof typeof GIT_PROVIDER_FACTORY_ERROR_CODE],
    providerType: string,
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(GitProviderFactoryError)

        if (error instanceof GitProviderFactoryError) {
            expect(error.code).toBe(code)
            expect(error.providerType).toBe(providerType)
            return
        }
    }

    throw new Error("Expected GitProviderFactoryError to be thrown")
}

describe("GitProviderFactory", () => {
    test("normalizes provider aliases to canonical types", () => {
        expect(normalizeGitProviderType("github")).toBe(GIT_PROVIDER_TYPE.GITHUB)
        expect(normalizeGitProviderType("gh")).toBe(GIT_PROVIDER_TYPE.GITHUB)
        expect(normalizeGitProviderType(" gitlab ")).toBe(GIT_PROVIDER_TYPE.GITLAB)
        expect(normalizeGitProviderType("GL")).toBe(GIT_PROVIDER_TYPE.GITLAB)
        expect(normalizeGitProviderType("az")).toBe(GIT_PROVIDER_TYPE.AZURE_DEVOPS)
        expect(normalizeGitProviderType("azure-devops")).toBe(
            GIT_PROVIDER_TYPE.AZURE_DEVOPS,
        )
        expect(normalizeGitProviderType("bitbucket")).toBe(GIT_PROVIDER_TYPE.BITBUCKET)
        expect(normalizeGitProviderType("bb")).toBe(GIT_PROVIDER_TYPE.BITBUCKET)
    })

    test("creates configured provider by type and alias", () => {
        const githubProvider = createGitProviderMock()
        const gitlabProvider = createGitProviderMock()
        const azureProvider = createGitProviderMock()
        const bitbucketProvider = createGitProviderMock()
        const factory = new GitProviderFactory({
            github: githubProvider,
            gitlab: gitlabProvider,
            azureDevops: azureProvider,
            bitbucket: bitbucketProvider,
        })

        expect(factory.create("GITHUB")).toBe(githubProvider)
        expect(factory.create("gl")).toBe(gitlabProvider)
        expect(factory.create("azure_devops")).toBe(azureProvider)
        expect(factory.create("bb")).toBe(bitbucketProvider)
    })

    test("throws typed error for unknown provider type", () => {
        const factory = new GitProviderFactory({})

        expectGitFactoryError(
            () => factory.create("custom-git"),
            GIT_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER,
            "custom-git",
        )
        expect(() => factory.create("custom-git")).toThrow(
            "Unknown git provider type: custom-git",
        )
    })

    test("throws typed error for known but not configured provider", () => {
        const factory = new GitProviderFactory({
            github: createGitProviderMock(),
        })

        expectGitFactoryError(
            () => factory.create("gitlab"),
            GIT_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_NOT_CONFIGURED,
            "gitlab",
        )
        expect(() => factory.create("gitlab")).toThrow(
            "Git provider is not configured for type: gitlab",
        )
    })

    test("preserves empty provider input in typed error metadata", () => {
        const factory = new GitProviderFactory({})

        expectGitFactoryError(
            () => factory.create("   "),
            GIT_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER,
            "   ",
        )
        expect(() => factory.create("   ")).toThrow("Unknown git provider type: <empty>")
    })
})
