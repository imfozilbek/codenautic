import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/settings-privacy-redaction")({
    beforeLoad: (): never => {
        throw redirect({ to: "/settings-security" })
    },
})
