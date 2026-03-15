import type { ICodeCityTreemapFileDescriptor } from "@/components/codecity/codecity-treemap"

import type {
    IArchitectureStructureNode,
    IDriftAlertChannelOption,
    IDriftTrendPoint,
    IDriftViolation,
} from "./contract-validation-types"

/**
 * Available notification channel options for drift alert configuration UI.
 */
export const DRIFT_ALERT_CHANNEL_OPTIONS: ReadonlyArray<IDriftAlertChannelOption> = [
    {
        id: "slack",
        label: "Slack",
    },
    {
        id: "email",
        label: "Email",
    },
    {
        id: "teams",
        label: "Teams",
    },
    {
        id: "webhook",
        label: "Webhook",
    },
]

/**
 * Mapping from file path to a stable file id for drift overlay treemap.
 */
export const DRIFT_FILE_ID_BY_PATH: Readonly<Record<string, string>> = {
    "src/infrastructure/http/review.controller.ts": "drift-file-review-controller",
    "src/domain/review.aggregate.ts": "drift-file-review-aggregate",
    "src/application/use-cases/review-merge-request.use-case.ts": "drift-file-review-usecase",
    "src/infrastructure/repository/review.repository.ts": "drift-file-review-repository",
    "src/infrastructure/messaging/review.events.ts": "drift-file-review-events",
    "src/domain/entities/review.ts": "drift-file-review-entity",
    "src/domain/value-objects/risk-score.ts": "drift-file-risk-score",
    "src/adapters/git/gitlab-client.ts": "drift-file-gitlab-client",
}

/**
 * File descriptors for the drift overlay CodeCity treemap.
 */
export const DRIFT_CODE_CITY_FILES: ReadonlyArray<ICodeCityTreemapFileDescriptor> = [
    {
        complexity: 28,
        coverage: 62,
        id: "drift-file-review-controller",
        issueCount: 5,
        loc: 240,
        path: "src/infrastructure/http/review.controller.ts",
    },
    {
        complexity: 31,
        coverage: 71,
        id: "drift-file-review-aggregate",
        issueCount: 4,
        loc: 212,
        path: "src/domain/review.aggregate.ts",
    },
    {
        complexity: 37,
        coverage: 58,
        id: "drift-file-review-usecase",
        issueCount: 6,
        loc: 298,
        path: "src/application/use-cases/review-merge-request.use-case.ts",
    },
    {
        complexity: 29,
        coverage: 64,
        id: "drift-file-review-repository",
        issueCount: 5,
        loc: 250,
        path: "src/infrastructure/repository/review.repository.ts",
    },
    {
        complexity: 24,
        coverage: 66,
        id: "drift-file-review-events",
        issueCount: 4,
        loc: 172,
        path: "src/infrastructure/messaging/review.events.ts",
    },
    {
        complexity: 22,
        coverage: 78,
        id: "drift-file-review-entity",
        issueCount: 3,
        loc: 166,
        path: "src/domain/entities/review.ts",
    },
    {
        complexity: 16,
        coverage: 84,
        id: "drift-file-risk-score",
        issueCount: 2,
        loc: 118,
        path: "src/domain/value-objects/risk-score.ts",
    },
    {
        complexity: 18,
        coverage: 74,
        id: "drift-file-gitlab-client",
        issueCount: 1,
        loc: 186,
        path: "src/adapters/git/gitlab-client.ts",
    },
]

/**
 * Default YAML content for the architecture blueprint editor.
 */
export const DEFAULT_BLUEPRINT_YAML: string = [
    "version: 1",
    "layers:",
    "  - name: domain",
    "    allow:",
    "      - domain",
    "  - name: application",
    "    allow:",
    "      - domain",
    "      - application",
    "rules:",
    "  - source: infrastructure",
    "    target: domain",
    "    mode: forbid",
].join("\n")

/**
 * Default YAML content for the architecture guardrails editor.
 */
export const DEFAULT_GUARDRAILS_YAML: string = [
    "rules:",
    "  - source: domain",
    "    target: infrastructure",
    "    mode: forbid",
    "  - source: application",
    "    target: infrastructure",
    "    mode: allow",
    "  - source: infrastructure",
    "    target: domain",
    "    mode: forbid",
].join("\n")

/**
 * Demo drift violations for the drift analysis report.
 */
export const DEFAULT_DRIFT_VIOLATIONS: ReadonlyArray<IDriftViolation> = [
    {
        affectedFiles: [
            "src/infrastructure/http/review.controller.ts",
            "src/domain/review.aggregate.ts",
        ],
        id: "drift-001",
        rationale: "Controller layer imports aggregate directly, bypassing application use case.",
        rule: "Layer violation: infrastructure imports domain directly",
        severity: "high",
    },
    {
        affectedFiles: [
            "src/application/use-cases/review-merge-request.use-case.ts",
            "src/infrastructure/repository/review.repository.ts",
            "src/infrastructure/messaging/review.events.ts",
        ],
        id: "drift-002",
        rationale: "Mutual dependency chain creates cycle between application and infrastructure.",
        rule: "Dependency cycle between application and infrastructure",
        severity: "critical",
    },
    {
        affectedFiles: ["src/domain/entities/review.ts", "src/domain/value-objects/risk-score.ts"],
        id: "drift-003",
        rationale:
            "Rule requires explicit domain events but several state transitions are silent.",
        rule: "Domain events missing in aggregate state transitions",
        severity: "medium",
    },
    {
        affectedFiles: ["src/adapters/git/gitlab-client.ts"],
        id: "drift-004",
        rationale: "Adapter naming is inconsistent with anti-corruption layer naming convention.",
        rule: "Naming drift in adapter boundary",
        severity: "low",
    },
]

/**
 * Demo blueprint architecture structure nodes.
 */
export const BLUEPRINT_STRUCTURE_NODES: ReadonlyArray<IArchitectureStructureNode> = [
    {
        dependsOn: [],
        id: "blueprint-domain-review-aggregate",
        layer: "domain",
        module: "review.aggregate",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "blueprint-application-review-usecase",
        layer: "application",
        module: "review-merge-request.use-case",
    },
    {
        dependsOn: ["application/review-merge-request.use-case"],
        id: "blueprint-infrastructure-review-controller",
        layer: "infrastructure",
        module: "review.controller",
    },
]

/**
 * Demo runtime reality architecture structure nodes.
 */
export const REALITY_STRUCTURE_NODES: ReadonlyArray<IArchitectureStructureNode> = [
    {
        dependsOn: ["infrastructure/review.events"],
        id: "reality-domain-review-aggregate",
        layer: "domain",
        module: "review.aggregate",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "reality-application-review-usecase",
        layer: "application",
        module: "review-merge-request.use-case",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "reality-infrastructure-review-controller",
        layer: "infrastructure",
        module: "review.controller",
    },
    {
        dependsOn: ["domain/review.aggregate"],
        id: "reality-infrastructure-review-events",
        layer: "infrastructure",
        module: "review.events",
    },
]

/**
 * Demo drift score trend data points for the drift trend chart.
 */
export const DRIFT_TREND_POINTS: ReadonlyArray<IDriftTrendPoint> = [
    {
        driftScore: 78,
        period: "Jan",
    },
    {
        architectureChange: "ADR-018: Introduced import boundaries for application layer.",
        driftScore: 69,
        period: "Feb",
    },
    {
        driftScore: 64,
        period: "Mar",
    },
    {
        architectureChange:
            "ADR-021: Introduced anti-corruption layer for provider boundaries.",
        driftScore: 55,
        period: "Apr",
    },
    {
        driftScore: 48,
        period: "May",
    },
    {
        architectureChange: "ADR-024: Isolated domain events from infrastructure handlers.",
        driftScore: 41,
        period: "Jun",
    },
]
