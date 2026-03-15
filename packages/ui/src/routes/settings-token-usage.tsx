import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-token-usage")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-billing" })
    },
})
