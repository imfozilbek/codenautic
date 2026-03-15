import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-concurrency")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-operations" })
    },
})
