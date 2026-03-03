import type {ReactElement} from "react"

import {Card, CardBody, CardHeader, Skeleton} from "@/components/ui"

/**
 * Skeleton-скелетон для dashboard route.
 *
 * @returns Placeholder для KPI/Work Queue/Timeline.
 */
export function DashboardSkeleton(): ReactElement {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-40 rounded-lg" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({length: 4}).map((_, index): ReactElement => (
                    <Card key={`metric-${String(index)}`}>
                        <CardHeader>
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardBody>
                            <Skeleton className="mb-2 h-8 w-20" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="mt-4 h-4 w-16" />
                        </CardBody>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-4 w-40" />
                    </CardHeader>
                    <CardBody className="space-y-2">
                        {Array.from({length: 4}).map((_, index): ReactElement => (
                            <Skeleton key={`skeleton-${String(index)}`} className="h-16 w-full rounded-lg" />
                        ))}
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardBody className="space-y-2">
                        {Array.from({length: 3}).map((_, index): ReactElement => (
                            <Skeleton key={`timeline-${String(index)}`} className="h-14 w-full rounded-lg" />
                        ))}
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}
