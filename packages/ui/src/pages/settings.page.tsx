import {type ReactElement} from "react"

import {Link} from "@tanstack/react-router"

import {Card, CardBody, CardHeader} from "@/components/ui"

/**
 * Базовая overview-страница раздела settings.
 *
 * @returns Блок с входными ссылками в поднастройки.
 */
export function SettingsPage(): ReactElement {
    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
            <Card>
                <CardHeader>
                    <p className="text-base font-semibold">Quick setup</p>
                </CardHeader>
                <CardBody className="space-y-2 text-sm text-slate-700">
                    <p>Настройте review-политику, провайдеров и подключения через быстрые страницы ниже.</p>
                    <ul className="space-y-1">
                        <li>
                            <Link className="underline underline-offset-4" to="/settings/code-review">
                                Code Review configuration
                            </Link>
                        </li>
                        <li>
                            <Link className="underline underline-offset-4" to="/settings/llm-providers">
                                LLM providers
                            </Link>
                        </li>
                        <li>
                            <Link className="underline underline-offset-4" to="/settings/git-providers">
                                Git providers
                            </Link>
                        </li>
                    </ul>
                </CardBody>
            </Card>
        </section>
    )
}
