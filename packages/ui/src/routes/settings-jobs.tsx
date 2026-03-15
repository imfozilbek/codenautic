import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-jobs")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-operations" })
    },
})
