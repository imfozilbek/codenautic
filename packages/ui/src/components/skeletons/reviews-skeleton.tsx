import type { ReactElement } from "react"

import { Card, CardBody, CardHeader, Skeleton } from "@/components/ui"

/**
 * Skeleton-скелетон для CCR management routes.
 *
 * @returns Placeholder для списка CCR с фильтрами.
 */
export function ReviewsSkeleton(): ReactElement {
    return (
        <section className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-4 w-44" />
                </CardHeader>
                <CardBody className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-4">
                        {Array.from({ length: 4 }).map(
                            (_, index): ReactElement => (
                                <Skeleton
                                    key={`filter-${String(index)}`}
                                    className="h-10 w-full rounded-lg"
                                />
                            ),
                        )}
                    </div>
                    <div className="space-y-2 pt-2">
                        {Array.from({ length: 7 }).map(
                            (_, index): ReactElement => (
                                <Skeleton
                                    key={`row-${String(index)}`}
                                    className="h-14 w-full rounded-lg"
                                />
                            ),
                        )}
                    </div>
                </CardBody>
            </Card>
        </section>
    )
}
