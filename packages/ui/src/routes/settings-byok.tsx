import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-byok")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-providers" })
    },
})
