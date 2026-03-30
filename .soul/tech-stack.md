## Tech Stack

Подробные версии — в `package.json` каждого пакета. Основное:

| Категория     | Технологии                                                                                     |
|---------------|------------------------------------------------------------------------------------------------|
| Runtime       | Bun 1.2, TypeScript 5.7                                                                        |
| Backend       | NestJS 11, Pino 9/10, PM2                                                                      |
| Validation    | zod 3/4 (env, request), Zod-схемы вместо class-validator                                       |
| Security      | helmet 8, cors                                                                                 |
| Frontend      | Vite 7, React 19, TanStack Router, Tailwind CSS 4, HeroUI 3 (React Aria), Recharts 3          |
| State         | @tanstack/react-query 5, react-hook-form 7, zod 4                                              |
| DB            | MongoDB 8 (mongoose 9), Qdrant 1.13 (@qdrant/js-client-rest 1.16)                              |
| Queue         | Redis 7.4, BullMQ 5, ioredis 5                                                                 |
| LLM           | openai 6, @anthropic-ai/sdk 0.74, @google/genai 1.41, groq-sdk 0.37                            |
| Git           | @octokit/rest 22, @gitbeaker/rest 43                                                           |
| AST           | tree-sitter 0.22                                                                               |
| Observability | Sentry 10, OpenTelemetry (api 1.9, sdk-node 0.212), Prometheus (через OTel)                    |

### Backend (api)

- **NestJS DI** — единственный IoC-контейнер в `api`, TOKENS из core как injection tokens
- **Bun + NestJS:** `verbatimModuleSyntax: false` в `packages/runtime/tsconfig.json` (NestJS требует
  `emitDecoratorMetadata`)
- **Тестирование:** Bun не полностью поддерживает `emitDecoratorMetadata` → unit-тесты через ручную инстанциацию, не
  через `Test.createTestingModule` для сервисов. NestJS Testing Module — только для integration tests с env pre-setup
- **Env validation:** Zod-схема в `env.schema.ts`, fail-fast при старте
- **Logging:** PinoLoggerAdapter реализует `ILogger` из core через `TOKENS.Common.Logger`

### Frontend (ui)

- **Фреймворк:** Vite 7 + TanStack Router (мигрировано с Next.js)
- Компоненты: функциональные, без class components
- Стейт: server state через @tanstack/react-query 5, формы через react-hook-form 7
- Валидация: zod 4
- Стилизация: Tailwind CSS 4 + HeroUI 3 (компоненты используются напрямую из `@heroui/react`)
- Иконки: lucide-react
- Виртуализация: @tanstack/react-virtual 3
- Тестирование: Vitest 4
- Domain-объекты в UI запрещены — только DTO через API
