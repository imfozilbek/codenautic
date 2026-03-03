import { type ReactElement, useState } from "react"

import { Button } from "@/components/ui"

/**
 * Параметры кнопки тестирования провайдера.
 */
export interface ITestConnectionButtonProps {
    /** Название сценария. */
    readonly providerLabel: string
    /** Запрос на проверку подключения. */
    readonly onTest: () => Promise<boolean> | boolean
}

/**
 * Тестовая кнопка для LLM/Git provider.
 *
 * @param props Конфигурация.
 * @returns Кнопка с индикацией результата проверки.
 */
export function TestConnectionButton(props: ITestConnectionButtonProps): ReactElement {
    const [status, setStatus] = useState<"idle" | "checking" | "ok" | "failed">("idle")

    const isChecking = status === "checking"

    const handlePress = async (): Promise<void> => {
        setStatus("checking")

        const result = await props.onTest()
        setStatus(result ? "ok" : "failed")
    }

    return (
        <Button
            isLoading={isChecking}
            isDisabled={isChecking}
            onPress={(): void => {
                void handlePress()
            }}
        >
            {status === "ok"
                ? `${props.providerLabel} connected`
                : status === "failed"
                  ? `${props.providerLabel} check failed`
                  : `Test ${props.providerLabel} connection`}
        </Button>
    )
}
