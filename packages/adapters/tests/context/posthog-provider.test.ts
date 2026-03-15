import {describe, expect, test} from "bun:test"

import {
    type IPostHogProviderErrorDetails,
    PostHogProviderError,
} from "../../src/context/posthog-provider.error"
import {
    type IPostHogApiClient,
    type IPostHogApiResponse,
    type IPostHogGetFeatureFlagRequest,
    PostHogProvider,
} from "../../src/context/posthog-provider"

type PostHogFeatureFlagPayload = Readonly<Record<string, unknown>>
type FeatureFlagResponseQueueItem = IPostHogApiResponse<PostHogFeatureFlagPayload> | Error

class StubPostHogApiClient implements IPostHogApiClient {
    public featureFlagResponses: FeatureFlagResponseQueueItem[] = []
    public featureFlagCalls: IPostHogGetFeatureFlagRequest[] = []

    public getFeatureFlag(
        request: IPostHogGetFeatureFlagRequest,
    ): Promise<IPostHogApiResponse<PostHogFeatureFlagPayload>> {
        this.featureFlagCalls.push(request)
        const response = this.featureFlagResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed feature-flag response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }
}

/**
 * Creates PostHog feature-flag payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns PostHog feature-flag payload.
 */
function createFeatureFlagPayload(
    overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
    return {
        key: "review_temporal_coupling_overlay",
        name: "Review temporal coupling overlay",
        active: true,
        filters: {
            groups: [
                {
                    rollout_percentage: 55,
                },
            ],
            payloads: [
                {
                    key: "treatment",
                },
            ],
        },
        tags: [
            "review",
            "experiments",
        ],
        updated_at: "2026-03-15T10:00:00.000Z",
        ...overrides,
    }
}

/**
 * Reads plain headers record from RequestInit.
 *
 * @param init Fetch init payload.
 * @returns Lower-cased headers record.
 */
function readRequestHeaders(init: RequestInit | undefined): Readonly<Record<string, string>> {
    const source = init?.headers
    if (source === undefined || source instanceof Headers) {
        return {}
    }

    if (Array.isArray(source)) {
        return Object.fromEntries(
            source.map(([key, value]) => {
                return [key.toLowerCase(), value]
            }),
        )
    }

    return Object.fromEntries(
        Object.entries(source).map(([key, value]) => {
            return [key.toLowerCase(), String(value)]
        }),
    )
}

/**
 * Casts async fetch stub to Bun-compatible fetch type.
 *
 * @param implementation Fetch stub implementation.
 * @returns Typed fetch implementation.
 */
function asFetchImplementation(
    implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): typeof fetch {
    return implementation as typeof fetch
}

/**
 * Normalizes fetch target into stable string URL.
 *
 * @param input Fetch target.
 * @returns Stable request URL.
 */
function normalizeRequestTarget(input: RequestInfo | URL): string {
    if (typeof input === "string") {
        return input
    }

    if (input instanceof URL) {
        return input.toString()
    }

    return input.url
}

describe("PostHogProvider", () => {
    test("loads PostHog feature flag and maps status rollout variant and tags", async () => {
        const client = new StubPostHogApiClient()
        client.featureFlagResponses = [
            {
                status: 200,
                headers: {},
                data: createFeatureFlagPayload(),
            },
        ]
        const provider = new PostHogProvider({
            projectId: "42",
            client,
        })

        const featureFlag = await provider.getFeatureFlag("review_temporal_coupling_overlay")

        expect(featureFlag).toEqual({
            key: "review_temporal_coupling_overlay",
            name: "Review temporal coupling overlay",
            status: "active",
            rolloutPercentage: 55,
            variant: "treatment",
            tags: [
                "review",
                "experiments",
            ],
        })
        expect(client.featureFlagCalls).toEqual([
            {
                projectId: "42",
                featureFlagKey: "review_temporal_coupling_overlay",
            },
        ])
    })

    test("loads shared external context for PostHog feature flag", async () => {
        const client = new StubPostHogApiClient()
        client.featureFlagResponses = [
            {
                status: 200,
                headers: {},
                data: createFeatureFlagPayload(),
            },
        ]
        const provider = new PostHogProvider({
            projectId: "42",
            client,
        })

        const context = await provider.loadContext("review_temporal_coupling_overlay")

        expect(context).toEqual({
            source: "POSTHOG",
            data: {
                featureFlag: {
                    key: "review_temporal_coupling_overlay",
                    name: "Review temporal coupling overlay",
                    status: "active",
                    rolloutPercentage: 55,
                    variant: "treatment",
                    tags: [
                        "review",
                        "experiments",
                    ],
                },
                status: "active",
                rolloutPercentage: 55,
                variant: "treatment",
            },
            fetchedAt: new Date("2026-03-15T10:00:00.000Z"),
        })
    })

    test("returns null when PostHog feature flag is not found", async () => {
        const client = new StubPostHogApiClient()
        client.featureFlagResponses = [
            {
                status: 404,
                headers: {},
                data: {
                    detail: "Not found",
                },
            },
        ]
        const provider = new PostHogProvider({
            projectId: "42",
            client,
        })

        const featureFlag = await provider.getFeatureFlag("missing-flag")

        expect(featureFlag).toBeNull()
    })

    test("retries once on rate limit and respects retry-after header", async () => {
        const client = new StubPostHogApiClient()
        const sleepDelays: number[] = []
        client.featureFlagResponses = [
            {
                status: 429,
                headers: {
                    "retry-after": "2",
                },
                data: {
                    detail: "Rate limited",
                },
            },
            {
                status: 200,
                headers: {},
                data: createFeatureFlagPayload(),
            },
        ]
        const provider = new PostHogProvider({
            projectId: "42",
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const featureFlag = await provider.getFeatureFlag("review_temporal_coupling_overlay")

        expect(featureFlag?.key).toBe("review_temporal_coupling_overlay")
        expect(client.featureFlagCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([2000])
    })

    test("throws non-retryable error for permission denied response", async () => {
        const client = new StubPostHogApiClient()
        const sleepDelays: number[] = []
        client.featureFlagResponses = [
            {
                status: 403,
                headers: {},
                data: {
                    detail: "Forbidden",
                    code: "FORBIDDEN",
                },
            },
        ]
        const provider = new PostHogProvider({
            projectId: "42",
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        try {
            await provider.getFeatureFlag("review_temporal_coupling_overlay")
            throw new Error("Expected PostHogProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "PostHogProviderError",
                message: "Forbidden",
                code: "FORBIDDEN",
                statusCode: 403,
                isRetryable: false,
            } satisfies Partial<PostHogProviderError & IPostHogProviderErrorDetails>)
        }
        expect(sleepDelays).toEqual([])
    })

    test("uses internal fetch-backed PostHog client with bearer authorization", async () => {
        const requests: Array<{
            readonly url: string
            readonly init: RequestInit | undefined
        }> = []
        const provider = new PostHogProvider({
            baseUrl: "https://app.posthog.com",
            projectId: "42",
            apiToken: "posthog-secret-token",
            fetchImplementation: asFetchImplementation((input, init) => {
                requests.push({
                    url: normalizeRequestTarget(input),
                    init,
                })

                return Promise.resolve(new Response(JSON.stringify(createFeatureFlagPayload()), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }),
        })

        const context = await provider.loadContext("review_temporal_coupling_overlay")

        expect(context?.source).toBe("POSTHOG")
        expect(requests).toHaveLength(1)
        expect(requests[0]?.url)
            .toBe("https://app.posthog.com/api/projects/42/feature_flags/review_temporal_coupling_overlay/")
        expect(readRequestHeaders(requests[0]?.init)).toEqual({
            accept: "application/json",
            authorization: "Bearer posthog-secret-token",
        })
    })

    test("throws configuration errors when projectId or auth token are missing", () => {
        expect(() => {
            return new PostHogProvider({
                baseUrl: "https://app.posthog.com",
                apiToken: "posthog-secret-token",
            })
        }).toThrow("PostHog projectId is required when no client is provided")

        expect(() => {
            return new PostHogProvider({
                baseUrl: "https://app.posthog.com",
                projectId: "42",
            })
        }).toThrow("PostHog apiToken or accessToken is required when no client is provided")
    })
})
