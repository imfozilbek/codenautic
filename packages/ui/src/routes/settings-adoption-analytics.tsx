import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-adoption-analytics")({
    beforeLoad: (): never => {
        throw redirect({ to: "/adoption-analytics" })
    },
})
