import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-audit-logs")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-security" })
    },
})
