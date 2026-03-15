import type {
    ICodeCityTreemapFileDescriptor,
    ICodeCityTreemapTemporalCouplingDescriptor,
} from "@/components/codecity/codecity-treemap"
import type {
    ICodeCity3DCausalCouplingDescriptor,
    TCodeCityCausalCouplingType,
} from "@/components/codecity/codecity-3d-scene"
import type { IRootCauseIssueDescriptor } from "@/components/codecity/root-cause-chain-viewer"

/**
 * Формирует root-cause issues для causal viewer из текущего file-среза.
 *
 * @param files Файлы активного профиля.
 * @returns Набор issue-цепочек.
 */
export function buildRootCauseIssues(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IRootCauseIssueDescriptor> {
    const primaryFile = files[0]
    const secondaryFile = files[1] ?? files[0]
    if (primaryFile === undefined || secondaryFile === undefined) {
        return []
    }

    return [
        {
            chain: [
                {
                    description: `${primaryFile.path} shows rising issue density after recent CCR.`,
                    fileId: primaryFile.id,
                    id: `${primaryFile.id}-event`,
                    label: "Issue spike detected",
                    type: "event",
                },
                {
                    description: `${secondaryFile.path} is temporally coupled and amplifies blast radius.`,
                    fileId: secondaryFile.id,
                    id: `${secondaryFile.id}-module`,
                    label: "Coupled dependency node",
                    type: "module",
                },
                {
                    description: "Health trend indicates persistent degradation in this district.",
                    fileId: secondaryFile.id,
                    id: `${primaryFile.id}-metric`,
                    label: "Health degradation signal",
                    type: "metric",
                },
            ],
            id: `issue-${primaryFile.id}`,
            severity: "high",
            title: `Root cause: ${primaryFile.path}`,
        },
        {
            chain: [
                {
                    description: `${secondaryFile.path} has increased churn and contributes to instability.`,
                    fileId: secondaryFile.id,
                    id: `${secondaryFile.id}-event`,
                    label: "Churn volatility",
                    type: "event",
                },
                {
                    description: `Coverage gaps near ${secondaryFile.path} increase regression likelihood.`,
                    fileId: primaryFile.id,
                    id: `${secondaryFile.id}-metric`,
                    label: "Coverage regression pressure",
                    type: "metric",
                },
            ],
            id: `issue-${secondaryFile.id}`,
            severity: "medium",
            title: `Root cause: ${secondaryFile.path}`,
        },
    ]
}

/**
 * Определяет тип causal coupling по силе связи.
 *
 * @param strength Сила связи (0-1).
 * @returns Тип coupling.
 */
export function resolveCausalCouplingType(strength: number): TCodeCityCausalCouplingType {
    if (strength >= 0.75) {
        return "dependency"
    }
    if (strength >= 0.5) {
        return "temporal"
    }
    return "ownership"
}

/**
 * Формирует causal couplings из temporal coupling дескрипторов.
 *
 * @param temporalCouplings Temporal coupling связи.
 * @returns Causal coupling дескрипторы для 3D scene.
 */
export function buildCausalCouplings(
    temporalCouplings: ReadonlyArray<ICodeCityTreemapTemporalCouplingDescriptor>,
): ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> {
    return temporalCouplings.map((coupling): ICodeCity3DCausalCouplingDescriptor => {
        return {
            couplingType: resolveCausalCouplingType(coupling.strength),
            sourceFileId: coupling.sourceFileId,
            strength: coupling.strength,
            targetFileId: coupling.targetFileId,
        }
    })
}
