import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-sso")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-security" })
    },
})
