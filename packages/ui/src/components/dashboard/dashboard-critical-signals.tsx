import type { ReactElement } from "react"

import { Alert } from "@/components/ui"
import {
    DataFreshnessPanel,
    type IProvenanceContext,
} from "@/components/infrastructure/data-freshness-panel"
import {
    ExplainabilityPanel,
    type IExplainabilityFactor,
} from "@/components/infrastructure/explainability-panel"
import { AnimatedAlert } from "@/lib/motion"

/**
 * Props for the DashboardCriticalSignals component.
 */
export interface IDashboardCriticalSignalsProps {
    /** Whether the ops banner is degraded. */
    readonly isDegraded: boolean
    /** Whether data is currently refreshing. */
    readonly isRefreshing: boolean
    /** ISO timestamp of last data update. */
    readonly lastUpdatedAt: string
    /** Provenance context for data freshness. */
    readonly provenance: IProvenanceContext
    /** Freshness action feedback message. */
    readonly freshnessActionMessage: string
    /** Callback to refresh dashboard data. */
    readonly onRefresh: () => void
    /** Callback to trigger rescan job. */
    readonly onRescan: () => void
    /** Explainability confidence score. */
    readonly confidence: string
    /** Data window label for explainability. */
    readonly dataWindow: string
    /** Explainability factors. */
    readonly factors: ReadonlyArray<IExplainabilityFactor>
    /** Explainability limitations. */
    readonly limitations: ReadonlyArray<string>
    /** Signal value for explainability panel. */
    readonly signalValue: string
}

/**
 * Zone A: Critical signals — ops banner, data freshness, explainability.
 * Grouped with accent border for visual weight.
 *
 * @param props Critical signals configuration.
 * @returns Critical signals section with accent bar.
 */
export function DashboardCriticalSignals(props: IDashboardCriticalSignalsProps): ReactElement {
    return (
        <div className="space-y-3 rounded-lg border-l-4 border-accent pl-4">
            <AnimatedAlert isVisible={props.isDegraded === true}>
                <Alert color="warning" className="space-y-1">
                    <p className="text-sm font-semibold text-on-warning">Ops notice</p>
                    <p className="text-sm text-on-warning/90">
                        Provider health degraded in this window. Check settings and review queue for
                        mitigation.
                    </p>
                </Alert>
            </AnimatedAlert>

            <DataFreshnessPanel
                isRefreshing={props.isRefreshing}
                lastUpdatedAt={props.lastUpdatedAt}
                provenance={props.provenance}
                staleThresholdMinutes={45}
                title="Dashboard data freshness"
                onRefresh={props.onRefresh}
                onRescan={props.onRescan}
            />
            <AnimatedAlert isVisible={props.freshnessActionMessage.length > 0}>
                <Alert color="primary" title="Freshness action" variant="flat">
                    {props.freshnessActionMessage}
                </Alert>
            </AnimatedAlert>
            <ExplainabilityPanel
                confidence={props.confidence}
                dataWindow={props.dataWindow}
                factors={props.factors}
                limitations={props.limitations}
                signalLabel="Release risk"
                signalValue={props.signalValue}
                threshold=">= 0.70"
                title="Explainability for release risk"
            />
        </div>
    )
}
