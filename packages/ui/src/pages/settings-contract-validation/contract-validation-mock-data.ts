import type {
    IArchitectureStructureNode,
    IDriftTrendPoint,
    IDriftViolation,
} from "./contract-validation-types"

/**
 * Default YAML content for the architecture blueprint editor.
 */
export const DEFAULT_BLUEPRINT_YAML = [
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
export const DEFAULT_GUARDRAILS_YAML = [
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
        rationale: "Rule requires explicit domain events but several state transitions are silent.",
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
        architectureChange: "ADR-021: Introduced anti-corruption layer for provider boundaries.",
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
