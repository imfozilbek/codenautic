import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-provider-degradation")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-operations" })
    },
})
