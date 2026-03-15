import {describe, expect, test} from "bun:test"

import {
    mapExternalPostHogFeatureFlag,
    mapPostHogContext,
    PostHogContextAcl,
    PostHogFeatureFlagAcl,
} from "../../src/context"

describe("PostHog context ACL contract", () => {
    test("maps PostHog feature flag payload into deterministic DTO", () => {
        const featureFlag = mapExternalPostHogFeatureFlag({
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
                {
                    name: "experiments",
                },
            ],
        })

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
    })

    test("maps PostHog context payload with status and rollout metadata", () => {
        const context = mapPostHogContext({
            featureFlag: {
                key: "review_temporal_coupling_overlay",
                name: "Review temporal coupling overlay",
                status: "active",
                filters: {
                    groups: [
                        {
                            rollout_percentage: 55,
                        },
                    ],
                },
                variant: "treatment",
                tags: [
                    "review",
                    "experiments",
                ],
                updated_at: "2026-03-15T10:00:00.000Z",
            },
        })

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

    test("exposes PostHog ACL adapters as thin wrappers over mapping functions", () => {
        const featureFlagAcl = new PostHogFeatureFlagAcl()
        const contextAcl = new PostHogContextAcl()

        const featureFlag = featureFlagAcl.toDomain({
            key: "review_temporal_coupling_overlay",
            name: "Review temporal coupling overlay",
            active: true,
        })
        const context = contextAcl.toDomain({
            key: "review_temporal_coupling_overlay",
            name: "Review temporal coupling overlay",
            active: true,
        })

        expect(featureFlag.key).toBe("review_temporal_coupling_overlay")
        expect(context.source).toBe("POSTHOG")
    })
})
