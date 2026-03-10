import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { useGitProviders, type IUseGitProvidersResult } from "@/lib/hooks/queries/use-git-providers"
import type { IGitProviderConnection } from "@/lib/api/endpoints/git-providers.endpoint"
import { renderWithProviders } from "../../../utils/render"
import { server } from "../../../mocks/server"

const MOCK_PROVIDERS: ReadonlyArray<IGitProviderConnection> = [
    {
        id: "gh-1",
        provider: "GitHub",
        account: "codenautic-org",
        connected: true,
        status: "CONNECTED",
        isKeySet: true,
        lastSyncAt: "2026-03-01T10:00:00.000Z",
    },
    {
        id: "gl-2",
        provider: "GitLab",
        account: "codenautic-lab",
        connected: false,
        status: "DISCONNECTED",
        isKeySet: false,
    },
]

function GitProvidersProbe(props: { readonly enabled?: boolean }): ReactElement {
    const hook = useGitProviders({ enabled: props.enabled })
    const [actionLog, setActionLog] = useState<string>("idle")

    return (
        <div>
            <GitProvidersState {...hook} />
            <p data-testid="action-log">{actionLog}</p>
            <button
                data-testid="connect-gl"
                type="button"
                onClick={(): void => {
                    void connectProvider(hook, "gl-2", true, setActionLog)
                }}
            >
                Connect GitLab
            </button>
            <button
                data-testid="disconnect-gh"
                type="button"
                onClick={(): void => {
                    void connectProvider(hook, "gh-1", false, setActionLog)
                }}
            >
                Disconnect GitHub
            </button>
            <button
                data-testid="test-gh"
                type="button"
                onClick={(): void => {
                    void testProvider(hook, "gh-1", setActionLog)
                }}
            >
                Test GitHub
            </button>
        </div>
    )
}

function GitProvidersState(hook: IUseGitProvidersResult): ReactElement {
    if (hook.providersQuery.isPending) {
        return <p data-testid="state">pending</p>
    }

    if (hook.providersQuery.error !== null) {
        return <p data-testid="state">error</p>
    }

    const providers = hook.providersQuery.data?.providers ?? []
    return (
        <div>
            <p data-testid="state">loaded</p>
            <p data-testid="count">{providers.length}</p>
            {providers.map(
                (p): ReactElement => (
                    <p
                        data-testid={`provider-${p.id}`}
                        key={p.id}
                    >{`${p.provider}:${p.connected}:${p.status}`}</p>
                ),
            )}
        </div>
    )
}

async function connectProvider(
    hook: IUseGitProvidersResult,
    providerId: string,
    connected: boolean,
    setLog: (next: string) => void,
): Promise<void> {
    setLog("mutating")
    try {
        const response = await hook.updateConnection.mutateAsync({ providerId, connected })
        setLog(`done:${response.provider.id}:${String(response.provider.connected)}`)
    } catch {
        setLog("error")
    }
}

async function testProvider(
    hook: IUseGitProvidersResult,
    providerId: string,
    setLog: (next: string) => void,
): Promise<void> {
    setLog("testing")
    try {
        const response = await hook.testConnection.mutateAsync(providerId)
        setLog(`tested:${response.providerId}:${String(response.ok)}`)
    } catch {
        setLog("test-error")
    }
}

describe("useGitProviders", (): void => {
    it("загружает список git провайдеров", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:7120/api/v1/git/providers", () => {
                return HttpResponse.json({ providers: MOCK_PROVIDERS })
            }),
        )

        renderWithProviders(<GitProvidersProbe />)

        await waitFor((): void => {
            expect(screen.getByTestId("state")).toHaveTextContent("loaded")
        })
        expect(screen.getByTestId("count")).toHaveTextContent("2")
        expect(screen.getByTestId("provider-gh-1")).toHaveTextContent("GitHub:true:CONNECTED")
        expect(screen.getByTestId("provider-gl-2")).toHaveTextContent("GitLab:false:DISCONNECTED")
    })

    it("когда enabled=false, тогда не загружает список", async (): Promise<void> => {
        let fetchCount = 0
        server.use(
            http.get("http://localhost:7120/api/v1/git/providers", () => {
                fetchCount += 1
                return HttpResponse.json({ providers: MOCK_PROVIDERS })
            }),
        )

        renderWithProviders(<GitProvidersProbe enabled={false} />)

        expect(screen.getByTestId("state")).toHaveTextContent("pending")
        await new Promise((resolve): void => {
            setTimeout(resolve, 50)
        })
        expect(fetchCount).toBe(0)
    })

    it("обновляет connection state провайдера с оптимистичным обновлением", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/git/providers", () => {
                return HttpResponse.json({ providers: MOCK_PROVIDERS })
            }),
            http.put(
                "http://localhost:7120/api/v1/git/providers/gl-2/connection",
                async ({ request }) => {
                    const payload = (await request.json()) as { readonly connected: boolean }
                    return HttpResponse.json({
                        provider: {
                            id: "gl-2",
                            provider: "GitLab",
                            account: "codenautic-lab",
                            connected: payload.connected,
                            status: payload.connected ? "CONNECTED" : "DISCONNECTED",
                            isKeySet: true,
                        },
                    })
                },
            ),
        )

        renderWithProviders(<GitProvidersProbe />)
        await waitFor((): void => {
            expect(screen.getByTestId("state")).toHaveTextContent("loaded")
        })

        await user.click(screen.getByTestId("connect-gl"))

        await waitFor((): void => {
            expect(screen.getByTestId("action-log")).toHaveTextContent("done:gl-2:true")
        })
    })

    it("откатывает оптимистичное обновление при ошибке мутации", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/git/providers", () => {
                return HttpResponse.json({ providers: MOCK_PROVIDERS })
            }),
            http.put("http://localhost:7120/api/v1/git/providers/gl-2/connection", () => {
                return HttpResponse.json({ error: "server error" }, { status: 500 })
            }),
        )

        renderWithProviders(<GitProvidersProbe />)
        await waitFor((): void => {
            expect(screen.getByTestId("state")).toHaveTextContent("loaded")
        })

        await user.click(screen.getByTestId("connect-gl"))

        await waitFor((): void => {
            expect(screen.getByTestId("action-log")).toHaveTextContent("error")
        })
        await waitFor((): void => {
            expect(screen.getByTestId("provider-gl-2")).toHaveTextContent(
                "GitLab:false:DISCONNECTED",
            )
        })
    })

    it("обновляет кеш после успешного обновления connection", async (): Promise<void> => {
        const user = userEvent.setup()
        let ghConnected = true
        server.use(
            http.get("http://localhost:7120/api/v1/git/providers", () => {
                const updatedProviders = MOCK_PROVIDERS.map(
                    (p): IGitProviderConnection =>
                        p.id === "gh-1"
                            ? {
                                  ...p,
                                  connected: ghConnected,
                                  status: ghConnected ? "CONNECTED" : "DISCONNECTED",
                              }
                            : p,
                )
                return HttpResponse.json({ providers: updatedProviders })
            }),
            http.put("http://localhost:7120/api/v1/git/providers/gh-1/connection", () => {
                ghConnected = false
                return HttpResponse.json({
                    provider: {
                        id: "gh-1",
                        provider: "GitHub",
                        account: "codenautic-org",
                        connected: false,
                        status: "DISCONNECTED",
                        isKeySet: true,
                        lastSyncAt: "2026-03-01T10:00:00.000Z",
                    },
                })
            }),
        )

        renderWithProviders(<GitProvidersProbe />)
        await waitFor((): void => {
            expect(screen.getByTestId("state")).toHaveTextContent("loaded")
        })

        await user.click(screen.getByTestId("disconnect-gh"))

        await waitFor((): void => {
            expect(screen.getByTestId("action-log")).toHaveTextContent("done:gh-1:false")
        })
        await waitFor((): void => {
            expect(screen.getByTestId("provider-gh-1")).toHaveTextContent(
                "GitHub:false:DISCONNECTED",
            )
        })
    })

    it("тестирует connectivity провайдера", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/git/providers", () => {
                return HttpResponse.json({ providers: MOCK_PROVIDERS })
            }),
            http.post("http://localhost:7120/api/v1/git/providers/gh-1/test", () => {
                return HttpResponse.json({
                    providerId: "gh-1",
                    ok: true,
                    message: "Connection stable.",
                })
            }),
        )

        renderWithProviders(<GitProvidersProbe />)
        await waitFor((): void => {
            expect(screen.getByTestId("state")).toHaveTextContent("loaded")
        })

        await user.click(screen.getByTestId("test-gh"))

        await waitFor((): void => {
            expect(screen.getByTestId("action-log")).toHaveTextContent("tested:gh-1:true")
        })
    })

    it("обрабатывает ошибку при тестировании connectivity", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/git/providers", () => {
                return HttpResponse.json({ providers: MOCK_PROVIDERS })
            }),
            http.post("http://localhost:7120/api/v1/git/providers/gh-1/test", () => {
                return HttpResponse.json({ error: "timeout" }, { status: 502 })
            }),
        )

        renderWithProviders(<GitProvidersProbe />)
        await waitFor((): void => {
            expect(screen.getByTestId("state")).toHaveTextContent("loaded")
        })

        await user.click(screen.getByTestId("test-gh"))

        await waitFor((): void => {
            expect(screen.getByTestId("action-log")).toHaveTextContent("test-error")
        })
    })
})
