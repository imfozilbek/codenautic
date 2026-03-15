import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-webhooks")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-integrations" })
    },
})
