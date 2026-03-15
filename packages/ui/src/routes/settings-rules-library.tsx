import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-rules-library")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-code-review" })
    },
})
