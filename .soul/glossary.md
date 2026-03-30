## Глоссарий

> Единая терминология проекта. Claude Code **обязан** использовать эти термины в коде, документации, комментариях и
> общении.

### CCR (Code Change Request)

**Наша доменная абстракция** для объекта code review. CCR — платформо-независимый термин, объединяющий:

| Платформа    | Их термин     | Наш термин |
|--------------|---------------|------------|
| GitHub       | Pull Request  | CCR        |
| GitLab       | Merge Request | CCR        |
| Azure DevOps | Pull Request  | CCR        |
| Bitbucket    | Pull Request  | CCR        |

**Почему не PR/MR:** CodeNautic работает с 4 Git-платформами. `PR` — термин GitHub/Azure/Bitbucket, `MR` — термин
GitLab. `CodeChangeRequest` (CCR) — наш **единый** домен-термин, который не привязан ни к одной платформе.

**Где используется CCR:**

- Domain: `CodeChangeRequest` entity, `SuggestionScope = "ccr" | "file"`
- Application: `GenerateCCRSummaryUseCase`, `ICCRMetrics`, `ICCRSummaryRepository`
- Stages: `ProcessCcrLevelReviewStage`, `CreateCcrLevelCommentsStage`
- DTOs: `ICodeChangeRequest`, `IGenerateCCRSummaryInput`, `IGetCCRSummaryByIdInput`
- Config: `maxSuggestionsPerCCR`
- Tokens: `TOKENS.Review.CCRSummaryRepository`

**Когда PR/MR допустимы:**

- Git-операции: "создать PR через IGitProvider" — здесь PR это действие на платформе
- Raw data: "PR descriptions" как источник данных для KAG — это сырые данные из Git API
- UI-отображение: конечному пользователю можно показывать PR/MR в зависимости от его платформы

**Правило:** в domain/application слоях — **только CCR**. В infrastructure (ACL, Git API) — PR/MR допустимы как внешние
термины, которые маппятся в CCR через Anti-Corruption Layer.

---

### Review

Процесс анализа CCR через 20-stage pipeline. Результат — `Review` aggregate с `Suggestion[]`.

### Suggestion

Конкретное замечание к коду. Два scope:

- `"ccr"` — кросс-файловое (архитектура, breaking changes, тесты)
- `"file"` — привязано к конкретному файлу и строке

### SafeGuard

5-уровневая система фильтрации AI-галлюцинаций: Deduplication → Hallucination → SeverityThreshold → PrioritySort →
ImplementationCheck.

### Expert Panel

Ensemble verification — несколько LLM-моделей валидируют каждый suggestion для повышения точности.
