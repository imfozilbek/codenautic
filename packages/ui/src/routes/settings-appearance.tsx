import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-appearance")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-general" })
    },
})
