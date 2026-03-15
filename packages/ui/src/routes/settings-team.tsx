import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-team")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-organization" })
    },
})
