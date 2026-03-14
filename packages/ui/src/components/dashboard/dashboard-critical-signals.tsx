import type { ReactElement } from "react"
import { AlertTriangle } from "@/components/icons/app-icons"

import { Alert } from "@heroui/react"
import {
    DataFreshnessPanel,
    type IProvenanceContext,
} from "@/components/infrastructure/data-freshness-panel"
import {
    ExplainabilityPanel,
    type IExplainabilityFactor,
} from "@/components/infrastructure/explainability-panel"
import { AnimatedAlert } from "@/lib/motion"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
 * Glass morphism card с accent border и severity-aware styling.
 *
 * @param props Critical signals configuration.
 * @returns Critical signals section with visual hierarchy.
 */
export function DashboardCriticalSignals(props: IDashboardCriticalSignalsProps): ReactElement {
    return (
        <div className="space-y-3 rounded-xl border border-border/40 bg-surface/40 p-4 backdrop-blur-sm">
            <AnimatedAlert isVisible={props.isDegraded === true}>
                <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/8 p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15">
                        <AlertTriangle aria-hidden="true" className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                        <p className={`${TYPOGRAPHY.cardTitle} text-warning`}>Ops notice</p>
                        <p className="mt-0.5 text-sm text-foreground/80">
                            Provider health degraded in this window. Check settings and review queue
                            for mitigation.
                        </p>
                    </div>
                </div>
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
                <Alert status="accent">
                    <Alert.Title>Freshness action</Alert.Title>
                    <Alert.Description>{props.freshnessActionMessage}</Alert.Description>
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
