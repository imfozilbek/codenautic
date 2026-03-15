import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-llm-providers")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-providers" })
    },
})
