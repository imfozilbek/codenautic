import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Card, CardBody, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { renderWithProviders } from "../../utils/render"

describe("Card", (): void => {
    it("when rendered with children, then displays card content", (): void => {
        renderWithProviders(
            <Card>
                <CardHeader>Header</CardHeader>
                <CardContent>Body</CardContent>
                <CardFooter>Footer</CardFooter>
            </Card>,
        )

        expect(screen.getByText("Header")).not.toBeNull()
        expect(screen.getByText("Body")).not.toBeNull()
        expect(screen.getByText("Footer")).not.toBeNull()
    })

    it("when CardBody alias is used, then renders same as CardContent", (): void => {
        renderWithProviders(
            <Card>
                <CardBody>Aliased body</CardBody>
            </Card>,
        )

        expect(screen.getByText("Aliased body")).not.toBeNull()
    })

    it("when rendered without sub-components, then renders wrapper", (): void => {
        renderWithProviders(<Card>Simple card</Card>)

        expect(screen.getByText("Simple card")).not.toBeNull()
    })
})
