import type {
    IArchitectureDifference,
    IArchitectureStructureNode,
    IDriftViolation,
    TArchitectureDiffStatus,
    TDriftSeverity,
    TDriftSortMode,
} from "./contract-validation-types"
import { DRIFT_FILE_ID_BY_PATH } from "./contract-validation-constants"

/**
 * Priority mapping for drift severity levels (higher value = more severe).
 */
export const DRIFT_SEVERITY_PRIORITY: Record<TDriftSeverity, number> = {
    critical: 4,
    high: 3,
    low: 1,
    medium: 2,
}

/**
 * Compares two drift violations based on the selected sort mode.
 *
 * @param left - First violation to compare.
 * @param right - Second violation to compare.
 * @param sortMode - The active sort mode.
 * @returns Negative, zero, or positive number for sort ordering.
 */
export function compareDriftViolations(
    left: IDriftViolation,
    right: IDriftViolation,
    sortMode: TDriftSortMode,
): number {
    if (sortMode === "severity-desc") {
        return DRIFT_SEVERITY_PRIORITY[right.severity] - DRIFT_SEVERITY_PRIORITY[left.severity]
    }

    if (sortMode === "severity-asc") {
        return DRIFT_SEVERITY_PRIORITY[left.severity] - DRIFT_SEVERITY_PRIORITY[right.severity]
    }

    if (sortMode === "files-desc") {
        return right.affectedFiles.length - left.affectedFiles.length
    }

    return left.affectedFiles.length - right.affectedFiles.length
}

/**
 * Resolves file ids for a drift violation by mapping affected file paths.
 *
 * @param violation - The drift violation containing affected file paths.
 * @returns Array of resolved file ids.
 */
export function resolveDriftViolationFileIds(violation: IDriftViolation): ReadonlyArray<string> {
    return violation.affectedFiles
        .map((filePath): string | undefined => {
            return DRIFT_FILE_ID_BY_PATH[filePath]
        })
        .filter((fileId): fileId is string => fileId !== undefined)
}

/**
 * Builds architecture differences by comparing blueprint nodes with reality nodes.
 *
 * @param blueprintNodes - Intended architecture structure nodes.
 * @param realityNodes - Actual runtime architecture structure nodes.
 * @returns Array of architecture differences with status and description.
 */
export function buildArchitectureDifferences(
    blueprintNodes: ReadonlyArray<IArchitectureStructureNode>,
    realityNodes: ReadonlyArray<IArchitectureStructureNode>,
): ReadonlyArray<IArchitectureDifference> {
    const realityByKey = new Map<string, IArchitectureStructureNode>()
    const blueprintByKey = new Map<string, IArchitectureStructureNode>()
    const differences: IArchitectureDifference[] = []

    for (const node of realityNodes) {
        realityByKey.set(`${node.layer}/${node.module}`, node)
    }
    for (const node of blueprintNodes) {
        blueprintByKey.set(`${node.layer}/${node.module}`, node)
    }

    for (const blueprintNode of blueprintNodes) {
        const nodeKey = `${blueprintNode.layer}/${blueprintNode.module}`
        const realityNode = realityByKey.get(nodeKey)
        if (realityNode === undefined) {
            differences.push({
                description: "Module is declared in blueprint but missing in runtime structure.",
                id: `architecture-diff-missing-${nodeKey}`,
                layer: blueprintNode.layer,
                module: blueprintNode.module,
                status: "missing",
            })
            continue
        }

        const blueprintDependsOn = blueprintNode.dependsOn.join(",")
        const realityDependsOn = realityNode.dependsOn.join(",")
        differences.push({
            description:
                blueprintDependsOn === realityDependsOn
                    ? "Module dependency direction matches blueprint."
                    : "Dependency direction mismatch for aggregate access path.",
            id: `architecture-diff-match-${nodeKey}`,
            layer: blueprintNode.layer,
            module: blueprintNode.module,
            status: "match",
        })
    }

    for (const realityNode of realityNodes) {
        const nodeKey = `${realityNode.layer}/${realityNode.module}`
        if (blueprintByKey.has(nodeKey) === true) {
            continue
        }
        differences.push({
            description: "Module exists in runtime structure but not defined in blueprint.",
            id: `architecture-diff-unexpected-${nodeKey}`,
            layer: realityNode.layer,
            module: realityNode.module,
            status: "unexpected",
        })
    }

    return differences
}

/**
 * Resolves CSS class for architecture difference badge based on status.
 *
 * @param status - The architecture difference status.
 * @returns Tailwind CSS class string for the badge.
 */
export function resolveArchitectureDifferenceBadgeClass(status: TArchitectureDiffStatus): string {
    if (status === "match") {
        return "border-success/40 bg-success/10 text-success"
    }
    if (status === "missing") {
        return "border-warning/40 bg-warning/10 text-warning"
    }
    return "border-danger/40 bg-danger/10 text-danger"
}
