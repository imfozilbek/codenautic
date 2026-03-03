import type {ReactElement} from "react"

import {Card, CardBody, Skeleton} from "@/components/ui"

/**
 * Skeleton-скелетон для settings routes.
 *
 * @returns Placeholder для settings форм и списков.
 */
export function SettingsSkeleton(): ReactElement {
    return (
        <div className="space-y-4">
            <Card>
                <CardBody className="space-y-3">
                    <Skeleton className="h-7 w-44" />
                    <Skeleton className="h-5 w-72" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardBody>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
                {Array.from({length: 2}).map((_, index): ReactElement => (
                    <Card key={`setting-skeleton-${String(index)}`}>
                        <CardBody className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-56" />
                            <Skeleton className="h-9 w-24" />
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    )
}
