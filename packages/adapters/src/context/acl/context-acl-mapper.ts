import type {
    IAsanaProjectHierarchy,
    IAsanaTask,
    IBugsnagBreadcrumb,
    IBugsnagError,
    IClickUpCustomField,
    IClickUpTask,
    IExternalContext,
    IJiraTicket,
    ILinearIssue,
    ILinearProjectContext,
    ILinearSubIssue,
    ISentryError,
} from "@codenautic/core"
import type {IDatadogAlert, IDatadogContextData, IDatadogLogEntry} from "../datadog.types"

const DEFAULT_FETCHED_AT = new Date(0)
const EMPTY_RECORD: Readonly<Record<string, unknown>> = {}

/**
 * Normalizes external Jira payload to shared ticket DTO.
 *
 * @param payload External Jira payload.
 * @returns Normalized Jira ticket DTO.
 */
export function mapExternalJiraTicket(payload: unknown): IJiraTicket {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const fields = toRecord(root["fields"])
    const statusField = toRecord(fields?.["status"])
    const statusRoot = toRecord(root["status"])
    const sprint = resolveJiraSprint(root)
    const description = resolveJiraDescription(root)
    const acceptanceCriteria = resolveJiraAcceptanceCriteria(root, description)

    return {
        key: readIdentifier(root, ["key", "issueKey", "id"], "UNKNOWN"),
        summary: readText(fields, ["summary"], readText(root, ["summary", "title"], "(no summary)")),
        status: readText(
            statusField,
            ["name", "statusCategory"],
            readText(statusRoot, ["name"], readText(root, ["status"], "unknown")),
        ),
        ...(description !== undefined ? {description} : {}),
        ...(acceptanceCriteria !== undefined ? {acceptanceCriteria} : {}),
        ...(sprint !== undefined ? {sprint} : {}),
    }
}

/**
 * Normalizes external Linear payload to shared issue DTO.
 *
 * @param payload External Linear payload.
 * @returns Normalized Linear issue DTO.
 */
export function mapExternalLinearIssue(payload: unknown): ILinearIssue {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const description = resolveLinearDescription(root)
    const priority = resolveLinearPriority(root)
    const cycle = resolveLinearCycle(root)
    const project = resolveLinearProject(root)
    const subIssues = resolveLinearSubIssues(root)

    return {
        id: readIdentifier(root, ["identifier", "id", "issueId"], "UNKNOWN"),
        title: readText(root, ["title", "name"], "(no title)"),
        state: resolveRequiredLinearState(root),
        ...(description !== undefined ? {description} : {}),
        ...(priority !== undefined ? {priority} : {}),
        ...(cycle !== undefined ? {cycle} : {}),
        ...(project !== undefined ? {project} : {}),
        ...(subIssues !== undefined ? {subIssues} : {}),
    }
}

/**
 * Normalizes external Asana payload to shared task DTO.
 *
 * @param payload External Asana payload.
 * @returns Normalized Asana task DTO.
 */
export function mapExternalAsanaTask(payload: unknown): IAsanaTask {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const description = resolveAsanaDescription(root)
    const assignee = resolveAsanaAssignee(root)
    const dueDate = resolveAsanaDueDate(root)
    const projectHierarchy = resolveAsanaProjectHierarchy(root)
    const tags = resolveAsanaTags(root)

    return {
        id: readIdentifier(root, ["gid", "id", "taskId"], "UNKNOWN"),
        title: readText(root, ["name", "title"], "(no title)"),
        status: resolveAsanaStatus(root),
        ...(description !== undefined ? {description} : {}),
        ...(assignee !== undefined ? {assignee} : {}),
        ...(dueDate !== undefined ? {dueDate} : {}),
        ...(projectHierarchy !== undefined ? {projectHierarchy} : {}),
        ...(tags !== undefined ? {tags} : {}),
    }
}

/**
 * Normalizes external ClickUp payload to shared task DTO.
 *
 * @param payload External ClickUp payload.
 * @returns Normalized ClickUp task DTO.
 */
export function mapExternalClickUpTask(payload: unknown): IClickUpTask {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const description = resolveClickUpDescription(root)
    const assignee = resolveClickUpAssignee(root)
    const dueDate = resolveClickUpDueDate(root)
    const listName = resolveClickUpListName(root)
    const tags = resolveClickUpTags(root)
    const customFields = resolveClickUpCustomFields(root)

    return {
        id: readIdentifier(root, ["id", "taskId"], "UNKNOWN"),
        title: readText(root, ["name", "title"], "(no title)"),
        status: resolveClickUpStatus(root),
        ...(description !== undefined ? {description} : {}),
        ...(assignee !== undefined ? {assignee} : {}),
        ...(dueDate !== undefined ? {dueDate} : {}),
        ...(listName !== undefined ? {listName} : {}),
        ...(tags !== undefined ? {tags} : {}),
        ...(customFields !== undefined ? {customFields} : {}),
    }
}

/**
 * Normalizes external Sentry payload to shared error DTO.
 *
 * @param payload External Sentry payload.
 * @returns Normalized Sentry error DTO.
 */
export function mapExternalSentryError(payload: unknown): ISentryError {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const stackTrace = resolveSentryStackTrace(root)
    const frequency = resolveOptionalSentryMetric(root, ["frequency", "count", "eventCount"])
    const affectedUsers = resolveOptionalSentryMetric(root, [
        "affectedUsers",
        "userCount",
        "users",
    ])

    return {
        id: readIdentifier(root, ["id", "issueId", "shortId"], "UNKNOWN"),
        title: resolveSentryTitle(root),
        stackTrace,
        ...(frequency !== undefined ? {frequency} : {}),
        ...(affectedUsers !== undefined ? {affectedUsers} : {}),
    }
}

/**
 * Normalizes external Jira context payload.
 *
 * @param payload External Jira payload.
 * @returns Shared external context.
 */
export function mapJiraContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const ticket = mapExternalJiraTicket(payload)

    return {
        source: "JIRA",
        data: {
            ticket,
            ...(ticket.sprint !== undefined ? {sprint: ticket.sprint} : {}),
            ...(ticket.acceptanceCriteria !== undefined
                ? {acceptanceCriteria: ticket.acceptanceCriteria}
                : {}),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Normalizes external Linear context payload.
 *
 * @param payload External Linear payload.
 * @returns Shared external context.
 */
export function mapLinearContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const issue = mapExternalLinearIssue(payload)
    const cycle = issue.cycle ?? resolveLinearCycle(root)

    return {
        source: "LINEAR",
        data: {
            issue,
            ...(cycle !== undefined ? {cycle} : {}),
            ...(issue.project !== undefined ? {project: issue.project} : {}),
            ...(issue.subIssues !== undefined ? {subIssues: issue.subIssues} : {}),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Normalizes external Asana context payload.
 *
 * @param payload External Asana payload.
 * @returns Shared external context.
 */
export function mapAsanaContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const task = mapExternalAsanaTask(payload)

    return {
        source: "ASANA",
        data: {
            task,
            ...(task.assignee !== undefined ? {assignee: task.assignee} : {}),
            ...(task.dueDate !== undefined ? {dueDate: task.dueDate} : {}),
            ...(task.projectHierarchy !== undefined ? {projectHierarchy: task.projectHierarchy} : {}),
            ...(task.tags !== undefined ? {tags: task.tags} : {}),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Normalizes external ClickUp context payload.
 *
 * @param payload External ClickUp payload.
 * @returns Shared external context.
 */
export function mapClickUpContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const task = mapExternalClickUpTask(payload)

    return {
        source: "CLICKUP",
        data: {
            task,
            ...(task.assignee !== undefined ? {assignee: task.assignee} : {}),
            ...(task.dueDate !== undefined ? {dueDate: task.dueDate} : {}),
            ...(task.listName !== undefined ? {listName: task.listName} : {}),
            ...(task.tags !== undefined ? {tags: task.tags} : {}),
            ...(task.customFields !== undefined ? {customFields: task.customFields} : {}),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Normalizes external Sentry context payload.
 *
 * @param payload External Sentry payload.
 * @returns Shared external context.
 */
export function mapSentryContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const error = mapExternalSentryError(payload)

    return {
        source: "SENTRY",
        data: {
            error,
            ...(error.frequency !== undefined ? {frequency: error.frequency} : {}),
            ...(error.affectedUsers !== undefined ? {affectedUsers: error.affectedUsers} : {}),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Normalizes external Bugsnag payload to shared error DTO.
 *
 * @param payload External Bugsnag payload.
 * @returns Normalized Bugsnag error DTO.
 */
export function mapExternalBugsnagError(payload: unknown): IBugsnagError {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const stackTrace = resolveBugsnagStackTrace(root)
    const breadcrumbs = resolveBugsnagBreadcrumbs(root)
    const severity = resolveBugsnagSeverity(root)
    const eventCount = resolveOptionalSentryMetric(root, ["eventCount", "events", "events_count"])
    const affectedUsers = resolveOptionalSentryMetric(root, [
        "affectedUsers",
        "users",
        "users_affected",
    ])

    return {
        id: readIdentifier(root, ["id", "errorId"], "UNKNOWN"),
        title: resolveBugsnagTitle(root),
        stackTrace,
        ...(severity !== undefined ? {severity} : {}),
        ...(breadcrumbs.length > 0 ? {breadcrumbs} : {}),
        ...(eventCount !== undefined ? {eventCount} : {}),
        ...(affectedUsers !== undefined ? {affectedUsers} : {}),
    }
}

/**
 * Normalizes external Bugsnag context payload.
 *
 * @param payload External Bugsnag payload.
 * @returns Shared external context.
 */
export function mapBugsnagContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const error = mapExternalBugsnagError(payload)

    return {
        source: "BUGSNAG",
        data: {
            error,
            ...(error.breadcrumbs !== undefined ? {breadcrumbs: error.breadcrumbs} : {}),
            ...(error.severity !== undefined ? {severity: error.severity} : {}),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Normalizes external Datadog payload to shared alert DTO.
 *
 * @param payload External Datadog payload.
 * @returns Normalized Datadog alert DTO.
 */
export function mapExternalDatadogAlert(payload: unknown): IDatadogAlert {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const monitor = toRecord(root["monitor"]) ?? root
    const query = readText(monitor, ["query"])
    const tags = resolveDatadogTags(monitor)
    const severity = resolveDatadogSeverity(monitor)
    const triggeredAt = resolveDatadogTriggeredAt(monitor)

    return {
        id: readIdentifier(monitor, ["id", "monitor_id", "monitorId"], "UNKNOWN"),
        title: readText(monitor, ["name", "title"], "(no title)"),
        status: readText(monitor, ["overall_state", "overallState", "status"], "unknown"),
        ...(query.length > 0 ? {query} : {}),
        ...(tags.length > 0 ? {tags} : {}),
        ...(severity !== undefined ? {severity} : {}),
        ...(triggeredAt !== undefined ? {triggeredAt} : {}),
    }
}

/**
 * Normalizes external Datadog payload to shared log-entry DTO list.
 *
 * @param payload External Datadog logs payload.
 * @returns Normalized Datadog log entries.
 */
export function mapExternalDatadogLogs(payload: unknown): readonly IDatadogLogEntry[] {
    const root = toRecord(payload)
    const rawLogs = root !== null ? toArray(root["data"]) : toArray(payload)
    const logs: IDatadogLogEntry[] = []

    for (const [index, rawLog] of rawLogs.entries()) {
        const logRoot = toRecord(rawLog) ?? EMPTY_RECORD
        const attributes = toRecord(logRoot["attributes"]) ?? logRoot
        const message = readText(attributes, ["message", "title"], "(no message)")
        const timestamp = resolveDatadogLogTimestamp(attributes)
        const service = readText(attributes, ["service", "service_name"])
        const status = readText(attributes, ["status", "level"])
        const filePath = resolveDatadogLogFilePath(attributes, message)

        logs.push({
            id: readIdentifier(logRoot, ["id", "log_id"], `log-${String(index + 1)}`),
            timestamp,
            message,
            ...(service.length > 0 ? {service} : {}),
            ...(status.length > 0 ? {status} : {}),
            ...(filePath !== undefined ? {filePath} : {}),
        })
    }

    return logs
}

/**
 * Normalizes external Datadog context payload.
 *
 * @param payload External Datadog payload.
 * @returns Shared external context.
 */
export function mapDatadogContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const monitorPayload = toRecord(root["monitor"]) ?? root
    const logsPayload = root["logs"] ?? root["logEvents"] ?? EMPTY_RECORD
    const alert = mapExternalDatadogAlert(monitorPayload)
    const logs = mapExternalDatadogLogs(logsPayload)
    const affectedCodePaths = resolveAffectedCodePaths(logs)
    const contextData: IDatadogContextData = {
        alert,
        logs,
        ...(affectedCodePaths !== undefined ? {affectedCodePaths} : {}),
    }

    return {
        source: "DATADOG",
        data: contextData,
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Resolves Jira sprint from common payload locations.
 *
 * @param root Jira root payload.
 * @returns Sprint name when available.
 */
function resolveJiraSprint(root: Readonly<Record<string, unknown>>): string | undefined {
    const fields = toRecord(root["fields"])
    const sprint = toRecord(fields?.["sprint"])
    const sprintName = readText(sprint, ["name"])

    if (sprintName.length > 0) {
        return sprintName
    }

    const boardSprint = toArray(fields?.["customfield_10020"])
    const firstBoardSprint = toRecord(boardSprint[0])
    const boardSprintName = readText(firstBoardSprint, ["name"])

    if (boardSprintName.length > 0) {
        return boardSprintName
    }

    return undefined
}

/**
 * Resolves normalized Jira description from common field locations.
 *
 * @param root Jira root payload.
 * @returns Plain-text description when available.
 */
function resolveJiraDescription(root: Readonly<Record<string, unknown>>): string | undefined {
    const fields = toRecord(root["fields"])
    const renderedFields = toRecord(root["renderedFields"])

    const description = extractRichText(
        fields?.["description"] ??
            renderedFields?.["description"] ??
            root["description"] ??
            root["renderedDescription"],
    )

    if (description === undefined || description.length === 0) {
        return undefined
    }

    return description
}

/**
 * Resolves Jira acceptance criteria from explicit fields or description headings.
 *
 * @param root Jira root payload.
 * @param description Normalized description text.
 * @returns Acceptance-criteria checklist.
 */
function resolveJiraAcceptanceCriteria(
    root: Readonly<Record<string, unknown>>,
    description: string | undefined,
): readonly string[] | undefined {
    const fields = toRecord(root["fields"])
    const explicitCandidates: readonly unknown[] = [
        fields?.["acceptanceCriteria"],
        fields?.["acceptance_criteria"],
        root["acceptanceCriteria"],
        root["acceptance_criteria"],
    ]

    for (const candidate of explicitCandidates) {
        const explicitItems = extractChecklistItems(candidate)
        if (explicitItems.length > 0) {
            return explicitItems
        }
    }

    if (description === undefined) {
        return undefined
    }

    const parsedFromDescription = parseAcceptanceCriteriaFromDescription(description)
    if (parsedFromDescription.length > 0) {
        return parsedFromDescription
    }

    return undefined
}

/**
 * Resolves Linear cycle from common payload locations.
 *
 * @param root Linear root payload.
 * @returns Cycle name when available.
 */
function resolveLinearCycle(root: Readonly<Record<string, unknown>>): string | undefined {
    const cycle = toRecord(root["cycle"])
    const cycleName = readText(cycle, ["name"])

    if (cycleName.length > 0) {
        return cycleName
    }

    const fallbackCycleName = readText(root, ["cycleName"])
    return fallbackCycleName.length > 0 ? fallbackCycleName : undefined
}

/**
 * Resolves normalized Linear description from common payload locations.
 *
 * @param root Linear root payload.
 * @returns Plain-text description when available.
 */
function resolveLinearDescription(root: Readonly<Record<string, unknown>>): string | undefined {
    return extractRichText(root["description"] ?? root["body"] ?? root["content"])
}

/**
 * Resolves normalized Linear state label.
 *
 * @param root Linear root payload.
 * @returns State label or undefined.
 */
function resolveOptionalLinearState(root: Readonly<Record<string, unknown>>): string | undefined {
    const state = toRecord(root["state"])
    const status = toRecord(root["status"])
    const resolvedState = readText(
        state,
        ["name", "type"],
        readText(status, ["name", "type"], readText(root, ["state"], "")),
    )

    return resolvedState.length > 0 ? resolvedState : undefined
}

/**
 * Resolves required Linear state label with deterministic fallback.
 *
 * @param root Linear root payload.
 * @returns State label.
 */
function resolveRequiredLinearState(root: Readonly<Record<string, unknown>>): string {
    return resolveOptionalLinearState(root) ?? "unknown"
}

/**
 * Resolves normalized Linear priority label from label or numeric representation.
 *
 * @param root Linear root payload.
 * @returns Priority label when available.
 */
function resolveLinearPriority(root: Readonly<Record<string, unknown>>): string | undefined {
    const priorityLabel = readText(root, ["priorityLabel"])
    if (priorityLabel.length > 0) {
        return priorityLabel
    }

    return normalizeLinearPriority(root["priority"])
}

/**
 * Resolves normalized Asana task status.
 *
 * @param root Asana root payload.
 * @returns Status label.
 */
function resolveAsanaStatus(root: Readonly<Record<string, unknown>>): string {
    if (root["completed"] === true) {
        return "Completed"
    }

    const completedAt = readText(root, ["completed_at", "completedAt"])
    if (completedAt.length > 0) {
        return "Completed"
    }

    const customStatus = resolveAsanaStatusFromCustomFields(root)
    if (customStatus !== undefined) {
        return customStatus
    }

    const status = readText(root, ["status", "resource_subtype", "approval_status"], "unknown")
    return status
}

/**
 * Resolves normalized Asana task description.
 *
 * @param root Asana root payload.
 * @returns Description when available.
 */
function resolveAsanaDescription(root: Readonly<Record<string, unknown>>): string | undefined {
    return extractRichText(root["notes"] ?? root["description"] ?? root["html_notes"])
}

/**
 * Resolves normalized Asana task assignee.
 *
 * @param root Asana root payload.
 * @returns Assignee name when available.
 */
function resolveAsanaAssignee(root: Readonly<Record<string, unknown>>): string | undefined {
    const assignee = toRecord(root["assignee"])
    const assigneeName = readText(assignee, ["name"], readText(root, ["assigneeName"]))

    return assigneeName.length > 0 ? assigneeName : undefined
}

/**
 * Resolves normalized Asana due date in ISO format.
 *
 * @param root Asana root payload.
 * @returns ISO due date when available.
 */
function resolveAsanaDueDate(root: Readonly<Record<string, unknown>>): string | undefined {
    const dueDateValue = readText(root, ["due_at", "due_on", "dueAt", "dueDate"])
    if (dueDateValue.length === 0) {
        return undefined
    }

    const parsedDueDate = new Date(dueDateValue)
    if (Number.isNaN(parsedDueDate.valueOf())) {
        return undefined
    }

    return parsedDueDate.toISOString()
}

/**
 * Resolves Asana project hierarchy with optional section context.
 *
 * @param root Asana root payload.
 * @returns Project hierarchy list when available.
 */
function resolveAsanaProjectHierarchy(
    root: Readonly<Record<string, unknown>>,
): readonly IAsanaProjectHierarchy[] | undefined {
    const hierarchy: IAsanaProjectHierarchy[] = []
    const seen = new Set<string>()

    const memberships = toArray(root["memberships"])
    for (const membershipCandidate of memberships) {
        const membership = toRecord(membershipCandidate)
        if (membership === null) {
            continue
        }

        const projectHierarchy = mapAsanaProjectHierarchy(
            membership["project"],
            membership["section"],
        )

        if (projectHierarchy === undefined) {
            continue
        }

        const key = buildAsanaProjectHierarchyKey(projectHierarchy)
        if (seen.has(key)) {
            continue
        }

        seen.add(key)
        hierarchy.push(projectHierarchy)
    }

    const projects = toArray(root["projects"])
    for (const projectCandidate of projects) {
        const projectHierarchy = mapAsanaProjectHierarchy(projectCandidate, undefined)
        if (projectHierarchy === undefined) {
            continue
        }

        const key = buildAsanaProjectHierarchyKey(projectHierarchy)
        if (seen.has(key)) {
            continue
        }

        seen.add(key)
        hierarchy.push(projectHierarchy)
    }

    return hierarchy.length > 0 ? hierarchy : undefined
}

/**
 * Resolves normalized Asana tag labels.
 *
 * @param root Asana root payload.
 * @returns Tag labels when available.
 */
function resolveAsanaTags(root: Readonly<Record<string, unknown>>): readonly string[] | undefined {
    const tags: string[] = []

    for (const tagCandidate of toArray(root["tags"])) {
        if (typeof tagCandidate === "string") {
            const normalizedTag = normalizeSingleLineText(tagCandidate)
            if (normalizedTag.length > 0) {
                tags.push(normalizedTag)
            }

            continue
        }

        const tag = toRecord(tagCandidate)
        const tagName = readText(tag, ["name"])
        if (tagName.length > 0) {
            tags.push(tagName)
        }
    }

    if (tags.length === 0) {
        return undefined
    }

    return deduplicateTextList(tags)
}

/**
 * Resolves Asana task status from supported custom field shapes.
 *
 * @param root Asana root payload.
 * @returns Status label when custom status exists.
 */
function resolveAsanaStatusFromCustomFields(
    root: Readonly<Record<string, unknown>>,
): string | undefined {
    for (const fieldCandidate of toArray(root["custom_fields"])) {
        const field = toRecord(fieldCandidate)
        if (field === null) {
            continue
        }

        const fieldName = readText(field, ["name"]).toLowerCase()
        if (fieldName !== "status" && fieldName !== "state") {
            continue
        }

        const enumValue = toRecord(field["enum_value"])
        const displayValue = readText(
            enumValue,
            ["name"],
            readText(field, ["display_value", "text_value"]),
        )

        if (displayValue.length > 0) {
            return displayValue
        }
    }

    return undefined
}

/**
 * Maps Asana project and section payload into hierarchy DTO.
 *
 * @param projectCandidate External project payload.
 * @param sectionCandidate External section payload.
 * @returns Normalized hierarchy item when project data is valid.
 */
function mapAsanaProjectHierarchy(
    projectCandidate: unknown,
    sectionCandidate: unknown,
): IAsanaProjectHierarchy | undefined {
    const project = toRecord(projectCandidate)
    const section = toRecord(sectionCandidate)

    const projectId = readIdentifier(project, ["gid", "id", "projectId"])
    const projectName = readText(project, ["name", "projectName"])
    if (projectId.length === 0 || projectName.length === 0) {
        return undefined
    }

    const sectionId = readIdentifier(section, ["gid", "id", "sectionId"])
    const sectionName = readText(section, ["name", "sectionName"])

    return {
        projectId,
        projectName,
        ...(sectionId.length > 0 ? {sectionId} : {}),
        ...(sectionName.length > 0 ? {sectionName} : {}),
    }
}

/**
 * Builds deterministic deduplication key for Asana project hierarchy.
 *
 * @param hierarchy Normalized hierarchy item.
 * @returns Stable deduplication key.
 */
function buildAsanaProjectHierarchyKey(hierarchy: IAsanaProjectHierarchy): string {
    return `${hierarchy.projectId}::${hierarchy.sectionId ?? ""}`
}

/**
 * Resolves normalized ClickUp task status.
 *
 * @param root ClickUp root payload.
 * @returns Status label.
 */
function resolveClickUpStatus(root: Readonly<Record<string, unknown>>): string {
    const status = toRecord(root["status"])
    const resolvedStatus = readText(status, ["status", "name", "type"], readText(root, ["status"]))

    return resolvedStatus.length > 0 ? resolvedStatus : "unknown"
}

/**
 * Resolves normalized ClickUp task description.
 *
 * @param root ClickUp root payload.
 * @returns Description when available.
 */
function resolveClickUpDescription(root: Readonly<Record<string, unknown>>): string | undefined {
    return extractRichText(root["description"] ?? root["text_content"] ?? root["markdown_description"])
}

/**
 * Resolves normalized ClickUp assignee.
 *
 * @param root ClickUp root payload.
 * @returns Assignee name when available.
 */
function resolveClickUpAssignee(root: Readonly<Record<string, unknown>>): string | undefined {
    const assignees = toArray(root["assignees"])
    for (const assigneeCandidate of assignees) {
        const assignee = toRecord(assigneeCandidate)
        if (assignee === null) {
            continue
        }

        const assigneeName = readText(assignee, ["username", "name", "email"])
        if (assigneeName.length > 0) {
            return assigneeName
        }
    }

    const assignee = toRecord(root["assignee"])
    const fallbackAssigneeName = readText(
        assignee,
        ["username", "name", "email"],
        readText(root, ["assigneeName"]),
    )

    return fallbackAssigneeName.length > 0 ? fallbackAssigneeName : undefined
}

/**
 * Resolves ClickUp due date in ISO format.
 *
 * @param root ClickUp root payload.
 * @returns ISO due date when available.
 */
function resolveClickUpDueDate(root: Readonly<Record<string, unknown>>): string | undefined {
    const dueDateCandidates: readonly unknown[] = [
        root["due_date"],
        root["dueDate"],
        root["due_at"],
        root["dueOn"],
    ]

    for (const dueDateCandidate of dueDateCandidates) {
        const dueDate = normalizeClickUpDate(dueDateCandidate)
        if (dueDate !== undefined) {
            return dueDate
        }
    }

    return undefined
}

/**
 * Resolves ClickUp parent list name.
 *
 * @param root ClickUp root payload.
 * @returns List name when available.
 */
function resolveClickUpListName(root: Readonly<Record<string, unknown>>): string | undefined {
    const list = toRecord(root["list"])
    const listName = readText(list, ["name"], readText(root, ["listName"]))

    return listName.length > 0 ? listName : undefined
}

/**
 * Resolves normalized ClickUp task tags.
 *
 * @param root ClickUp root payload.
 * @returns Tag labels when available.
 */
function resolveClickUpTags(root: Readonly<Record<string, unknown>>): readonly string[] | undefined {
    const tags: string[] = []

    for (const tagCandidate of toArray(root["tags"])) {
        if (typeof tagCandidate === "string") {
            const normalizedTag = normalizeSingleLineText(tagCandidate)
            if (normalizedTag.length > 0) {
                tags.push(normalizedTag)
            }

            continue
        }

        const tag = toRecord(tagCandidate)
        const tagName = readText(tag, ["name", "tag"])
        if (tagName.length > 0) {
            tags.push(tagName)
        }
    }

    if (tags.length === 0) {
        return undefined
    }

    return deduplicateTextList(tags)
}

/**
 * Resolves normalized ClickUp custom fields.
 *
 * @param root ClickUp root payload.
 * @returns Custom fields when available.
 */
function resolveClickUpCustomFields(
    root: Readonly<Record<string, unknown>>,
): readonly IClickUpCustomField[] | undefined {
    const customFields: IClickUpCustomField[] = []
    const seen = new Set<string>()

    for (const customFieldCandidate of toArray(root["custom_fields"])) {
        const customField = toRecord(customFieldCandidate)
        if (customField === null) {
            continue
        }

        const id = readIdentifier(customField, ["id", "custom_field_id"])
        const name = readText(customField, ["name", "label"])
        const value = normalizeClickUpCustomFieldValue(customField)

        if (id.length === 0 || name.length === 0 || value === undefined || seen.has(id)) {
            continue
        }

        seen.add(id)
        customFields.push({
            id,
            name,
            value,
        })
    }

    return customFields.length > 0 ? customFields : undefined
}

/**
 * Resolves normalized ClickUp custom-field value.
 *
 * @param customField ClickUp custom-field payload.
 * @returns String value when available.
 */
function normalizeClickUpCustomFieldValue(
    customField: Readonly<Record<string, unknown>>,
): string | undefined {
    const rawValue = customField["value"]
    if (rawValue === undefined || rawValue === null) {
        return undefined
    }

    if (Array.isArray(rawValue)) {
        const values = rawValue
            .map((entry) => {
                return normalizeClickUpCustomFieldOption(customField, entry)
                    ?? normalizeClickUpValueFragment(entry)
            })
            .filter((entry): entry is string => {
                return entry !== undefined
            })

        if (values.length === 0) {
            return undefined
        }

        return values.join(", ")
    }

    return normalizeClickUpCustomFieldOption(customField, rawValue)
        ?? normalizeClickUpValueFragment(rawValue)
}

/**
 * Resolves ClickUp dropdown-like custom-field values using option metadata.
 *
 * @param customField ClickUp custom-field payload.
 * @param rawValue Raw field value.
 * @returns Option label when available.
 */
function normalizeClickUpCustomFieldOption(
    customField: Readonly<Record<string, unknown>>,
    rawValue: unknown,
): string | undefined {
    const rawIdentifier = normalizeOptionalTextValue(rawValue)
    if (rawIdentifier === undefined) {
        return undefined
    }

    const typeConfig = toRecord(customField["type_config"])
    for (const optionCandidate of toArray(typeConfig?.["options"])) {
        const option = toRecord(optionCandidate)
        if (option === null) {
            continue
        }

        const optionId = readIdentifier(option, ["id"])
        const optionName = readText(option, ["name", "label"])
        if (optionId === rawIdentifier && optionName.length > 0) {
            return optionName
        }
    }

    return undefined
}

/**
 * Normalizes generic ClickUp custom-field value fragment.
 *
 * @param value Raw value fragment.
 * @returns Normalized value string.
 */
function normalizeClickUpValueFragment(value: unknown): string | undefined {
    if (typeof value === "string") {
        const normalized = normalizeSingleLineText(value)
        return normalized.length > 0 ? normalized : undefined
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value)
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false"
    }

    const richTextValue = extractRichText(value)
    if (richTextValue !== undefined && richTextValue.length > 0) {
        return richTextValue
    }

    return undefined
}

/**
 * Normalizes ClickUp date candidates into ISO format.
 *
 * @param value Raw date candidate.
 * @returns ISO date string when valid.
 */
function normalizeClickUpDate(value: unknown): string | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
        const parsedFromNumber = new Date(value)
        return Number.isNaN(parsedFromNumber.valueOf()) ? undefined : parsedFromNumber.toISOString()
    }

    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return undefined
    }

    if (/^\d+$/.test(normalized)) {
        const parsedTimestamp = Number(normalized)
        if (Number.isFinite(parsedTimestamp)) {
            const parsedFromTimestamp = new Date(parsedTimestamp)
            if (Number.isNaN(parsedFromTimestamp.valueOf()) === false) {
                return parsedFromTimestamp.toISOString()
            }
        }
    }

    const parsedDate = new Date(normalized)
    return Number.isNaN(parsedDate.valueOf()) ? undefined : parsedDate.toISOString()
}

/**
 * Normalizes raw value to text for option matching.
 *
 * @param value Raw value.
 * @returns Trimmed text.
 */
function normalizeOptionalTextValue(value: unknown): string | undefined {
    if (typeof value === "string") {
        const normalizedText = value.trim()
        return normalizedText.length > 0 ? normalizedText : undefined
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value)
    }

    return undefined
}

/**
 * Resolves Linear project context from payload.
 *
 * @param root Linear root payload.
 * @returns Normalized project context when available.
 */
function resolveLinearProject(
    root: Readonly<Record<string, unknown>>,
): ILinearProjectContext | undefined {
    const project = toRecord(root["project"])
    if (project === null) {
        return undefined
    }

    const id = readIdentifier(project, ["id", "projectId", "slugId"], readText(project, ["name"]))
    const name = readText(project, ["name", "title"], id)

    if (id.length === 0 || name.length === 0) {
        return undefined
    }

    const description = resolveLinearDescription(project)
    const state = resolveOptionalLinearState(project) ?? readText(project, ["state"])
    const priority = resolveLinearPriority(project)

    return {
        id,
        name,
        ...(description !== undefined ? {description} : {}),
        ...(state.length > 0 ? {state} : {}),
        ...(priority !== undefined ? {priority} : {}),
    }
}

/**
 * Resolves normalized Linear child issues from connection or array payloads.
 *
 * @param root Linear root payload.
 * @returns Normalized child issues when available.
 */
function resolveLinearSubIssues(
    root: Readonly<Record<string, unknown>>,
): readonly ILinearSubIssue[] | undefined {
    const children = toRecord(root["children"])
    const candidates: readonly unknown[] = [
        ...toArray(children?.["nodes"]),
        ...toArray(root["subIssues"]),
    ]

    const subIssues = candidates.flatMap((candidate) => {
        const subIssue = mapLinearSubIssue(candidate)
        return subIssue === undefined ? [] : [subIssue]
    })

    return subIssues.length > 0 ? deduplicateLinearSubIssues(subIssues) : undefined
}

/**
 * Maps a single child issue payload to normalized summary DTO.
 *
 * @param payload Child issue payload.
 * @returns Normalized sub-issue summary.
 */
function mapLinearSubIssue(payload: unknown): ILinearSubIssue | undefined {
    const root = toRecord(payload)
    if (root === null) {
        return undefined
    }

    const id = readIdentifier(root, ["identifier", "id", "issueId"], "UNKNOWN")
    const title = readText(root, ["title", "name"], "(no title)")

    if (id === "UNKNOWN" && title === "(no title)") {
        return undefined
    }

    const priority = resolveLinearPriority(root)

    return {
        id,
        title,
        state: resolveRequiredLinearState(root),
        ...(priority !== undefined ? {priority} : {}),
    }
}

/**
 * Deduplicates child issues by identifier while preserving original order.
 *
 * @param subIssues Normalized child issues.
 * @returns Deduplicated child issues.
 */
function deduplicateLinearSubIssues(
    subIssues: readonly ILinearSubIssue[],
): readonly ILinearSubIssue[] {
    const seen = new Set<string>()

    return subIssues.filter((subIssue) => {
        if (seen.has(subIssue.id)) {
            return false
        }

        seen.add(subIssue.id)
        return true
    })
}

/**
 * Maps Linear numeric priority to deterministic text label.
 *
 * @param value Numeric or textual priority candidate.
 * @returns Priority label when available.
 */
function normalizeLinearPriority(value: unknown): string | undefined {
    if (typeof value === "string") {
        const normalized = value.trim()
        return normalized.length > 0 ? normalized : undefined
    }

    if (typeof value !== "number" || Number.isFinite(value) === false) {
        return undefined
    }

    switch (value) {
        case 1:
            return "Urgent"
        case 2:
            return "High"
        case 3:
            return "Normal"
        case 4:
            return "Low"
        default:
            return undefined
    }
}

/**
 * Resolves human-readable Sentry error title.
 *
 * @param root Sentry root payload.
 * @returns Title with deterministic fallback.
 */
function resolveSentryTitle(root: Readonly<Record<string, unknown>>): string {
    const exceptionTitle = resolveSentryExceptionTitle(root)
    if (exceptionTitle !== undefined) {
        return exceptionTitle
    }

    const metadata = toRecord(root["metadata"])

    return readText(metadata, ["title"], readText(root, ["title", "culprit", "message"], "(no title)"))
}

/**
 * Resolves exception-based title from nested Sentry payloads.
 *
 * @param root Sentry root payload.
 * @returns Title when exception payload is present.
 */
function resolveSentryExceptionTitle(
    root: Readonly<Record<string, unknown>>,
): string | undefined {
    const events = resolveSentryEventCandidates(root)

    for (const event of events) {
        const exception = resolveSentryEventException(event)
        if (exception === null) {
            continue
        }

        const type = readText(exception, ["type"])
        const value = readText(exception, ["value"])

        if (type.length > 0 && value.length > 0) {
            return `${type}: ${value}`
        }

        if (value.length > 0) {
            return value
        }

        if (type.length > 0) {
            return type
        }
    }

    return undefined
}

/**
 * Resolves normalized stack trace lines from common Sentry payload shapes.
 *
 * @param root Sentry root payload.
 * @returns Stack trace lines.
 */
function resolveSentryStackTrace(root: Readonly<Record<string, unknown>>): readonly string[] {
    const directCandidates: readonly unknown[] = [
        root["stackTrace"],
        root["stacktrace"],
        root["stack"],
    ]

    for (const candidate of directCandidates) {
        const directLines = extractNormalizedStackTraceLines(candidate)
        if (directLines.length > 0) {
            return directLines
        }
    }

    for (const event of resolveSentryEventCandidates(root)) {
        const eventStackTrace = extractSentryEventStackTrace(event)
        if (eventStackTrace.length > 0) {
            return eventStackTrace
        }
    }

    return []
}

/**
 * Resolves optional Sentry metric from common payload keys.
 *
 * @param root Sentry root payload.
 * @param keys Candidate metric keys.
 * @returns Positive integer metric when available.
 */
function resolveOptionalSentryMetric(
    root: Readonly<Record<string, unknown>>,
    keys: readonly string[],
): number | undefined {
    for (const key of keys) {
        const metric = readPositiveInteger(root[key])
        if (metric !== undefined) {
            return metric
        }
    }

    return undefined
}

/**
 * Collects Sentry event candidates from direct and nested payloads.
 *
 * @param root Sentry root payload.
 * @returns Event candidate list.
 */
function resolveSentryEventCandidates(
    root: Readonly<Record<string, unknown>>,
): readonly Readonly<Record<string, unknown>>[] {
    const candidates: readonly unknown[] = [
        root["event"],
        root["latestEvent"],
        ...toArray(root["events"]),
    ]

    return candidates.flatMap((candidate) => {
        const event = toRecord(candidate)
        return event === null ? [] : [event]
    })
}

/**
 * Extracts stack trace from a single Sentry event payload.
 *
 * @param event Sentry event payload.
 * @returns Normalized stack trace lines.
 */
function extractSentryEventStackTrace(
    event: Readonly<Record<string, unknown>>,
): readonly string[] {
    const primaryException = resolveSentryEventException(event)
    if (primaryException !== null) {
        const exceptionStackTrace = extractNormalizedStackTraceLines(
            primaryException["stacktrace"] ?? primaryException["rawStacktrace"] ?? primaryException["stack"],
        )
        if (exceptionStackTrace.length > 0) {
            return exceptionStackTrace
        }
    }

    const entryStackTrace = extractStackTraceFromEntries(event)
    if (entryStackTrace.length > 0) {
        return entryStackTrace
    }

    return extractNormalizedStackTraceLines(event["stacktrace"] ?? event["stack"])
}

/**
 * Resolves primary exception record from direct or entry-based Sentry event payload.
 *
 * @param event Sentry event payload.
 * @returns Primary exception record or null.
 */
function resolveSentryEventException(
    event: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
    return resolveSentryPrimaryException(event) ?? resolveSentryExceptionFromEntries(event)
}

/**
 * Resolves primary exception record from direct Sentry event payload.
 *
 * @param event Sentry event payload.
 * @returns Primary exception record or null.
 */
function resolveSentryPrimaryException(
    event: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
    const exception = toRecord(event["exception"])
    const values = toArray(exception?.["values"])

    for (const value of values) {
        const record = toRecord(value)
        if (record !== null) {
            return record
        }
    }

    return null
}

/**
 * Resolves primary exception record from Sentry entry payloads.
 *
 * @param event Sentry event payload.
 * @returns Primary exception record or null.
 */
function resolveSentryExceptionFromEntries(
    event: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
    for (const entryCandidate of toArray(event["entries"])) {
        const entry = toRecord(entryCandidate)
        if (entry === null) {
            continue
        }

        const data = toRecord(entry["data"])
        const exception = resolveSentryPrimaryException({
            exception: {
                values: toArray(data?.["values"]),
            },
        })

        if (exception !== null) {
            return exception
        }
    }

    return null
}

/**
 * Extracts stack trace from Sentry entry payloads.
 *
 * @param event Sentry event payload.
 * @returns Normalized stack trace lines.
 */
function extractStackTraceFromEntries(
    event: Readonly<Record<string, unknown>>,
): readonly string[] {
    for (const entryCandidate of toArray(event["entries"])) {
        const entry = toRecord(entryCandidate)
        if (entry === null) {
            continue
        }

        const data = toRecord(entry["data"])
        if (data === null) {
            continue
        }

        const fromExceptionValues = extractStackTraceFromExceptionValues(data["values"])
        if (fromExceptionValues.length > 0) {
            return fromExceptionValues
        }

        const directStackTrace = extractNormalizedStackTraceLines(
            data["stacktrace"] ?? data["rawStacktrace"] ?? data["stack"],
        )
        if (directStackTrace.length > 0) {
            return directStackTrace
        }
    }

    return []
}

/**
 * Extracts stack trace from exception values array.
 *
 * @param values Exception values candidate.
 * @returns Normalized stack trace lines.
 */
function extractStackTraceFromExceptionValues(values: unknown): readonly string[] {
    for (const valueCandidate of toArray(values)) {
        const value = toRecord(valueCandidate)
        if (value === null) {
            continue
        }

        const stackTrace = extractNormalizedStackTraceLines(
            value["stacktrace"] ?? value["rawStacktrace"] ?? value["stack"],
        )
        if (stackTrace.length > 0) {
            return stackTrace
        }
    }

    return []
}

/**
 * Extracts normalized stack trace lines from strings, arrays, or frame payloads.
 *
 * @param value Stack trace candidate.
 * @returns Normalized stack trace lines.
 */
function extractNormalizedStackTraceLines(value: unknown): readonly string[] {
    if (typeof value === "string") {
        return splitStackTraceText(value)
    }

    if (Array.isArray(value)) {
        const lines = value.flatMap((item) => {
            return [...extractNormalizedStackTraceLines(item)]
        })

        return deduplicateSequentialLines(lines)
    }

    const record = toRecord(value)
    if (record === null) {
        return []
    }

    const directStack = splitStackTraceText(
        readText(record, ["stack", "value", "message"]),
    )
    if (directStack.length > 0) {
        return directStack
    }

    const valuesStack = extractStackTraceFromExceptionValues(record["values"])
    if (valuesStack.length > 0) {
        return valuesStack
    }

    const frames = toArray(record["frames"])
    if (frames.length > 0) {
        return mapSentryFramesToLines(frames)
    }

    return extractNormalizedStackTraceLines(record["stacktrace"] ?? record["rawStacktrace"])
}

/**
 * Maps Sentry stack-trace frames to deterministic text lines.
 *
 * @param frames Stack frame payloads.
 * @returns Normalized stack trace lines.
 */
function mapSentryFramesToLines(frames: readonly unknown[]): readonly string[] {
    const lines = frames
        .flatMap((frameCandidate) => {
            const frame = toRecord(frameCandidate)
            if (frame === null) {
                return []
            }

            const line = formatSentryFrame(frame)
            return line === undefined ? [] : [line]
        })

    return deduplicateSequentialLines(lines)
}

/**
 * Formats a single Sentry frame into readable stack line.
 *
 * @param frame Frame payload.
 * @returns Stack line when frame contains enough data.
 */
function formatSentryFrame(
    frame: Readonly<Record<string, unknown>>,
): string | undefined {
    const functionName = readText(frame, ["function"])
    const fileName = readText(frame, ["filename", "absPath", "module"])
    const lineNumber = readPositiveInteger(frame["lineNo"] ?? frame["lineno"])
    const columnNumber = readPositiveInteger(frame["colNo"] ?? frame["colno"])

    if (functionName.length === 0 && fileName.length === 0) {
        return undefined
    }

    const location = formatSentryFrameLocation(fileName, lineNumber, columnNumber)
    if (location !== undefined && functionName.length > 0) {
        return `at ${functionName} (${location})`
    }

    if (location !== undefined) {
        return `at ${location}`
    }

    return `at ${functionName}`
}

/**
 * Formats frame location tuple into stable `file:line:column` text.
 *
 * @param fileName Frame file name.
 * @param lineNumber Optional line number.
 * @param columnNumber Optional column number.
 * @returns Formatted location or undefined.
 */
function formatSentryFrameLocation(
    fileName: string,
    lineNumber: number | undefined,
    columnNumber: number | undefined,
): string | undefined {
    const segments: string[] = []

    if (fileName.length > 0) {
        segments.push(fileName)
    }

    if (lineNumber !== undefined) {
        segments.push(String(lineNumber))
    }

    if (columnNumber !== undefined) {
        segments.push(String(columnNumber))
    }

    if (segments.length === 0) {
        return undefined
    }

    return segments.join(":")
}

/**
 * Resolves human-readable Bugsnag error title.
 *
 * @param root Bugsnag root payload.
 * @returns Title with deterministic fallback.
 */
function resolveBugsnagTitle(root: Readonly<Record<string, unknown>>): string {
    const eventCandidates = resolveBugsnagEventCandidates(root)

    for (const event of eventCandidates) {
        const exception = resolveBugsnagEventException(event)
        if (exception === null) {
            continue
        }

        const errorClass = readText(exception, ["errorClass", "error_class", "type"])
        const message = readText(exception, ["message", "value"])
        if (errorClass.length > 0 && message.length > 0) {
            return `${errorClass}: ${message}`
        }

        if (message.length > 0) {
            return message
        }

        if (errorClass.length > 0) {
            return errorClass
        }
    }

    const rootErrorClass = readText(root, ["errorClass", "error_class"])
    const rootMessage = readText(root, ["message", "errorMessage", "error_message"])
    if (rootErrorClass.length > 0 && rootMessage.length > 0) {
        return `${rootErrorClass}: ${rootMessage}`
    }

    return readText(root, ["title", "name"], "(no title)")
}

/**
 * Resolves optional Bugsnag severity from root and event payloads.
 *
 * @param root Bugsnag root payload.
 * @returns Normalized severity when available.
 */
function resolveBugsnagSeverity(
    root: Readonly<Record<string, unknown>>,
): string | undefined {
    const rootSeverity = readText(root, ["severity"])
    if (rootSeverity.length > 0) {
        return rootSeverity.toLowerCase()
    }

    for (const event of resolveBugsnagEventCandidates(root)) {
        const eventSeverity = readText(event, ["severity"])
        if (eventSeverity.length > 0) {
            return eventSeverity.toLowerCase()
        }
    }

    return undefined
}

/**
 * Resolves normalized stack trace lines from common Bugsnag payload shapes.
 *
 * @param root Bugsnag root payload.
 * @returns Stack trace lines.
 */
function resolveBugsnagStackTrace(
    root: Readonly<Record<string, unknown>>,
): readonly string[] {
    const directCandidates: readonly unknown[] = [
        root["stackTrace"],
        root["stacktrace"],
        root["stack"],
    ]

    for (const candidate of directCandidates) {
        const directLines = extractBugsnagStackTraceLines(candidate)
        if (directLines.length > 0) {
            return directLines
        }
    }

    for (const event of resolveBugsnagEventCandidates(root)) {
        const exception = resolveBugsnagEventException(event)
        if (exception !== null) {
            const exceptionStack = extractBugsnagStackTraceLines(
                exception["stacktrace"] ?? exception["stackTrace"] ?? exception["stack"],
            )
            if (exceptionStack.length > 0) {
                return exceptionStack
            }
        }

        const eventStack = extractBugsnagStackTraceLines(event["stacktrace"] ?? event["stack"])
        if (eventStack.length > 0) {
            return eventStack
        }
    }

    return []
}

/**
 * Collects Bugsnag event candidates from direct and nested payloads.
 *
 * @param root Bugsnag root payload.
 * @returns Event candidate list.
 */
function resolveBugsnagEventCandidates(
    root: Readonly<Record<string, unknown>>,
): readonly Readonly<Record<string, unknown>>[] {
    const candidates: readonly unknown[] = [
        root["event"],
        root["latestEvent"],
        ...toArray(root["events"]),
    ]

    return candidates.flatMap((candidate) => {
        const event = toRecord(candidate)
        return event === null ? [] : [event]
    })
}

/**
 * Resolves primary exception record from Bugsnag event payload.
 *
 * @param event Bugsnag event payload.
 * @returns Primary exception record or null.
 */
function resolveBugsnagEventException(
    event: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
    for (const exceptionCandidate of toArray(event["exceptions"])) {
        const exception = toRecord(exceptionCandidate)
        if (exception !== null) {
            return exception
        }
    }

    const directException = toRecord(event["exception"])
    if (directException !== null) {
        return directException
    }

    return null
}

/**
 * Extracts normalized stack trace lines from Bugsnag frame payloads or textual traces.
 *
 * @param value Stack trace candidate.
 * @returns Stack trace lines.
 */
function extractBugsnagStackTraceLines(value: unknown): readonly string[] {
    if (Array.isArray(value) === false) {
        return extractNormalizedStackTraceLines(value)
    }

    const lines = value.flatMap((frameCandidate) => {
        const frame = toRecord(frameCandidate)
        if (frame === null) {
            return []
        }

        const formatted = formatBugsnagFrame(frame)
        return formatted === undefined ? [] : [formatted]
    })

    if (lines.length > 0) {
        return deduplicateSequentialLines(lines)
    }

    return extractNormalizedStackTraceLines(value)
}

/**
 * Formats one Bugsnag frame into readable stack line.
 *
 * @param frame Bugsnag frame payload.
 * @returns Stack line when frame contains enough data.
 */
function formatBugsnagFrame(
    frame: Readonly<Record<string, unknown>>,
): string | undefined {
    const functionName = readText(frame, ["method", "function"])
    const fileName = readText(frame, ["file", "filename"])
    const lineNumber = readPositiveInteger(frame["lineNumber"] ?? frame["lineNo"] ?? frame["lineno"])
    const columnNumber = readPositiveInteger(frame["columnNumber"] ?? frame["colNo"] ?? frame["colno"])

    if (functionName.length === 0 && fileName.length === 0) {
        return undefined
    }

    const location = formatSentryFrameLocation(fileName, lineNumber, columnNumber)
    if (location !== undefined && functionName.length > 0) {
        return `at ${functionName} (${location})`
    }

    if (location !== undefined) {
        return `at ${location}`
    }

    return `at ${functionName}`
}

/**
 * Resolves normalized Bugsnag breadcrumbs.
 *
 * @param root Bugsnag root payload.
 * @returns Breadcrumb list.
 */
function resolveBugsnagBreadcrumbs(
    root: Readonly<Record<string, unknown>>,
): readonly IBugsnagBreadcrumb[] {
    for (const event of resolveBugsnagEventCandidates(root)) {
        const breadcrumbs = mapBugsnagBreadcrumbs(event["breadcrumbs"])
        if (breadcrumbs.length > 0) {
            return breadcrumbs
        }
    }

    return mapBugsnagBreadcrumbs(root["breadcrumbs"])
}

/**
 * Maps unknown breadcrumbs payload into normalized breadcrumb list.
 *
 * @param value Breadcrumb payload.
 * @returns Normalized breadcrumb list.
 */
function mapBugsnagBreadcrumbs(value: unknown): readonly IBugsnagBreadcrumb[] {
    const breadcrumbs = toArray(value).flatMap((breadcrumbCandidate) => {
        const breadcrumb = toRecord(breadcrumbCandidate)
        if (breadcrumb === null) {
            return []
        }

        const mapped = mapBugsnagBreadcrumb(breadcrumb)
        return mapped === undefined ? [] : [mapped]
    })

    return breadcrumbs
}

/**
 * Maps Bugsnag breadcrumb payload to normalized breadcrumb DTO.
 *
 * @param breadcrumb Bugsnag breadcrumb payload.
 * @returns Normalized breadcrumb when payload is valid.
 */
function mapBugsnagBreadcrumb(
    breadcrumb: Readonly<Record<string, unknown>>,
): IBugsnagBreadcrumb | undefined {
    const message = readText(breadcrumb, ["name", "message", "title"], "")
    if (message.length === 0) {
        return undefined
    }

    const type = readText(breadcrumb, ["type"])
    const timestamp = normalizeIsoTimestamp(breadcrumb["timestamp"] ?? breadcrumb["ts"])

    return {
        message,
        ...(type.length > 0 ? {type} : {}),
        ...(timestamp !== undefined ? {timestamp} : {}),
    }
}

/**
 * Splits stack trace text into normalized lines.
 *
 * @param value Raw stack text.
 * @returns Non-empty normalized lines.
 */
function splitStackTraceText(value: string): readonly string[] {
    return value
        .split("\n")
        .map((line) => {
            return normalizeSingleLineText(line)
        })
        .filter((line) => {
            return line.length > 0
        })
}

/**
 * Extracts plain text from strings, HTML, or Atlassian document payloads.
 *
 * @param value Rich-text candidate.
 * @returns Normalized plain text or undefined.
 */
function extractRichText(value: unknown): string | undefined {
    if (typeof value === "string") {
        return normalizeMultilineText(stripHtmlTags(value))
    }

    const lines = extractRichTextLines(value)
    if (lines.length === 0) {
        return undefined
    }

    return lines.join("\n")
}

/**
 * Extracts checklist items from common Jira field shapes.
 *
 * @param value Checklist candidate.
 * @returns Normalized checklist entries.
 */
function extractChecklistItems(value: unknown): readonly string[] {
    if (Array.isArray(value)) {
        return extractChecklistItemsFromArray(value)
    }

    if (typeof value === "string") {
        return splitChecklistText(normalizeMultilineText(stripHtmlTags(value)) ?? "")
    }

    const record = toRecord(value)
    if (record === null) {
        return []
    }

    return extractChecklistItemsFromRecord(record)
}

/**
 * Parses acceptance-criteria section from normalized description text.
 *
 * @param description Normalized Jira description.
 * @returns Checklist items from matching section.
 */
function parseAcceptanceCriteriaFromDescription(description: string): readonly string[] {
    const lines = normalizeDescriptionLines(description)
    const headingIndex = findAcceptanceCriteriaHeadingIndex(lines)
    if (headingIndex < 0) {
        return []
    }

    const inlineItems = resolveInlineAcceptanceCriteria(lines[headingIndex] ?? "")
    if (inlineItems.length > 0) {
        return deduplicateTextList([
            ...inlineItems,
            ...collectAcceptanceCriteriaLines(lines, headingIndex),
        ])
    }

    return collectAcceptanceCriteriaLines(lines, headingIndex)
}

/**
 * Extracts normalized text lines from nested rich-text nodes.
 *
 * @param value Rich-text node.
 * @returns Plain-text lines.
 */
function extractRichTextLines(value: unknown): readonly string[] {
    const fragments: string[] = []
    collectRichTextLines(value, fragments)

    const normalizedLines = fragments
        .join("\n")
        .split("\n")
        .map((line) => {
            return normalizeSingleLineText(stripHtmlTags(line))
        })
        .filter((line) => {
            return line.length > 0
        })

    return deduplicateSequentialLines(normalizedLines)
}

/**
 * Traverses nested rich-text nodes and emits line fragments.
 *
 * @param value Rich-text node.
 * @param output Mutable fragment accumulator.
 */
function collectRichTextLines(value: unknown, output: string[]): void {
    if (typeof value === "string") {
        output.push(value)
        return
    }

    if (Array.isArray(value)) {
        collectRichTextLinesFromArray(value, output)
        return
    }

    const record = toRecord(value)
    if (record === null) {
        return
    }

    appendRichTextValue(record, output)
    appendRichTextLineBreak(record, output)

    const content = toArray(record["content"])
    collectRichTextLinesFromArray(content, output)
    appendRichTextBlockBreak(record, output)
}

/**
 * Extracts checklist items from array-based Jira field values.
 *
 * @param value Checklist candidate array.
 * @returns Normalized checklist entries.
 */
function extractChecklistItemsFromArray(value: readonly unknown[]): readonly string[] {
    const items = value.flatMap((item) => {
        return [...extractChecklistItems(item)]
    })

    return deduplicateTextList(items)
}

/**
 * Extracts checklist items from record-based Jira field values.
 *
 * @param record Checklist candidate record.
 * @returns Normalized checklist entries.
 */
function extractChecklistItemsFromRecord(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    if (isChecklistNode(record)) {
        return extractChecklistItemsFromListNode(record)
    }

    const nestedItems = extractChecklistItemsFromNestedContent(record)
    if (nestedItems.length > 0) {
        return nestedItems
    }

    return extractChecklistItemsFromTextValue(record)
}

/**
 * Determines whether record represents a checklist item node.
 *
 * @param record Candidate rich-text record.
 * @returns True when record is a checklist node.
 */
function isChecklistNode(record: Readonly<Record<string, unknown>>): boolean {
    const type = readText(record, ["type"])
    return type === "listItem" || type === "taskItem"
}

/**
 * Extracts checklist items from nested list node content.
 *
 * @param record Checklist node.
 * @returns Checklist entries.
 */
function extractChecklistItemsFromListNode(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    const line = extractRichText({
        type: "doc",
        content: toArray(record["content"]),
    })

    return line === undefined ? [] : [line]
}

/**
 * Extracts checklist items from nested content arrays.
 *
 * @param record Rich-text record.
 * @returns Nested checklist entries.
 */
function extractChecklistItemsFromNestedContent(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    const content = toArray(record["content"])
    if (content.length === 0) {
        return []
    }

    const nestedItems = content.flatMap((item) => {
        return [...extractChecklistItems(item)]
    })

    return deduplicateTextList(nestedItems)
}

/**
 * Extracts checklist items from plain text-like record properties.
 *
 * @param record Candidate rich-text record.
 * @returns Checklist entries.
 */
function extractChecklistItemsFromTextValue(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    const text = extractRichText(record["text"] ?? record["value"])
    return text === undefined ? [] : splitChecklistText(text)
}

/**
 * Normalizes multi-line description into non-empty lines.
 *
 * @param description Jira description text.
 * @returns Normalized lines.
 */
function normalizeDescriptionLines(description: string): readonly string[] {
    return description
        .split("\n")
        .map((line) => {
            return normalizeSingleLineText(line)
        })
        .filter((line) => {
            return line.length > 0
        })
}

/**
 * Finds acceptance-criteria heading line index.
 *
 * @param lines Normalized description lines.
 * @returns Heading index or -1.
 */
function findAcceptanceCriteriaHeadingIndex(lines: readonly string[]): number {
    return lines.findIndex((line) => {
        return /^acceptance criteria:?$/i.test(line)
            || /^acceptance criteria:\s+.+$/i.test(line)
    })
}

/**
 * Extracts inline acceptance-criteria items from heading line when present.
 *
 * @param line Heading line candidate.
 * @returns Inline checklist items.
 */
function resolveInlineAcceptanceCriteria(line: string): readonly string[] {
    const inlineMatch = /^acceptance criteria:\s+(.+)$/i.exec(line)
    if (inlineMatch?.[1] === undefined) {
        return []
    }

    return splitChecklistText(inlineMatch[1])
}

/**
 * Collects checklist items after acceptance-criteria heading.
 *
 * @param lines Normalized description lines.
 * @param headingIndex Acceptance-criteria heading index.
 * @returns Checklist entries.
 */
function collectAcceptanceCriteriaLines(
    lines: readonly string[],
    headingIndex: number,
): readonly string[] {
    const items: string[] = []

    for (const line of lines.slice(headingIndex + 1)) {
        if (shouldStopAcceptanceCriteriaCollection(line, items.length > 0)) {
            break
        }

        const normalizedItem = normalizeChecklistItem(line)
        if (shouldStopAfterEmptyChecklistItem(normalizedItem, items.length > 0)) {
            return deduplicateTextList(items)
        }

        if (normalizedItem.length === 0) {
            continue
        }

        items.push(normalizedItem)
    }

    return deduplicateTextList(items)
}

/**
 * Determines whether acceptance-criteria collection should stop.
 *
 * @param line Candidate line.
 * @param hasCollectedItems Whether at least one item is already collected.
 * @returns True when section parsing should stop.
 */
function shouldStopAcceptanceCriteriaCollection(
    line: string,
    hasCollectedItems: boolean,
): boolean {
    return hasCollectedItems && isSectionHeading(line)
}

/**
 * Determines whether checklist parsing should stop after an empty normalized item.
 *
 * @param normalizedItem Normalized checklist item.
 * @param hasCollectedItems Whether at least one item is already collected.
 * @returns True when parser should stop.
 */
function shouldStopAfterEmptyChecklistItem(
    normalizedItem: string,
    hasCollectedItems: boolean,
): boolean {
    return normalizedItem.length === 0 && hasCollectedItems
}

/**
 * Traverses nested rich-text arrays and appends line fragments.
 *
 * @param value Rich-text array.
 * @param output Mutable fragment accumulator.
 */
function collectRichTextLinesFromArray(value: readonly unknown[], output: string[]): void {
    for (const item of value) {
        collectRichTextLines(item, output)
    }
}

/**
 * Appends text value from rich-text record.
 *
 * @param record Rich-text record.
 * @param output Mutable fragment accumulator.
 */
function appendRichTextValue(record: Readonly<Record<string, unknown>>, output: string[]): void {
    const text = readText(record, ["text"])
    if (text.length > 0) {
        output.push(text)
    }
}

/**
 * Appends hard-break newline when rich-text record represents one.
 *
 * @param record Rich-text record.
 * @param output Mutable fragment accumulator.
 */
function appendRichTextLineBreak(
    record: Readonly<Record<string, unknown>>,
    output: string[],
): void {
    if (readText(record, ["type"]) === "hardBreak") {
        output.push("\n")
    }
}

/**
 * Appends block-separator newline for paragraph-like nodes.
 *
 * @param record Rich-text record.
 * @param output Mutable fragment accumulator.
 */
function appendRichTextBlockBreak(
    record: Readonly<Record<string, unknown>>,
    output: string[],
): void {
    const type = readText(record, ["type"])
    if (type === "paragraph" || type === "heading" || type === "listItem" || type === "taskItem") {
        output.push("\n")
    }
}

/**
 * Resolves normalized Datadog tags from monitor payload.
 *
 * @param monitor Datadog monitor payload.
 * @returns Normalized tags.
 */
function resolveDatadogTags(monitor: Readonly<Record<string, unknown>>): readonly string[] {
    const tags = toArray(monitor["tags"])
    const normalized = tags
        .map((tag): string => {
            if (typeof tag !== "string") {
                return ""
            }
            return tag.trim()
        })
        .filter((tag) => {
            return tag.length > 0
        })

    return deduplicateTextList(normalized)
}

/**
 * Resolves Datadog alert severity from common payload fields.
 *
 * @param monitor Datadog monitor payload.
 * @returns Normalized severity label when available.
 */
function resolveDatadogSeverity(
    monitor: Readonly<Record<string, unknown>>,
): string | undefined {
    const directSeverity = readText(monitor, ["severity", "priorityLabel"])
    if (directSeverity.length > 0) {
        return directSeverity.toLowerCase()
    }

    const priority = monitor["priority"]
    if (typeof priority === "number" && Number.isFinite(priority)) {
        if (priority <= 1) {
            return "critical"
        }
        if (priority <= 3) {
            return "high"
        }
        if (priority <= 5) {
            return "medium"
        }
        return "low"
    }

    return undefined
}

/**
 * Resolves Datadog trigger timestamp from common monitor payload fields.
 *
 * @param monitor Datadog monitor payload.
 * @returns Triggered-at timestamp in ISO format when available.
 */
function resolveDatadogTriggeredAt(
    monitor: Readonly<Record<string, unknown>>,
): string | undefined {
    const candidates: readonly unknown[] = [
        monitor["overall_state_modified"],
        monitor["overallStateModified"],
        monitor["last_triggered_at"],
        monitor["lastTriggeredAt"],
        monitor["modified_at"],
        monitor["modifiedAt"],
    ]

    for (const candidate of candidates) {
        const resolved = normalizeIsoTimestamp(candidate)
        if (resolved !== undefined) {
            return resolved
        }
    }

    return undefined
}

/**
 * Resolves Datadog log timestamp from common attributes fields.
 *
 * @param attributes Datadog log attributes.
 * @returns Timestamp in ISO format.
 */
function resolveDatadogLogTimestamp(attributes: Readonly<Record<string, unknown>>): string {
    const candidates: readonly unknown[] = [
        attributes["timestamp"],
        attributes["date"],
        attributes["event_time"],
        attributes["eventTime"],
    ]

    for (const candidate of candidates) {
        const resolved = normalizeIsoTimestamp(candidate)
        if (resolved !== undefined) {
            return resolved
        }
    }

    return new Date(DEFAULT_FETCHED_AT.getTime()).toISOString()
}

/**
 * Resolves Datadog file path from log attributes or message text.
 *
 * @param attributes Datadog log attributes.
 * @param message Log message.
 * @returns Normalized file path when available.
 */
function resolveDatadogLogFilePath(
    attributes: Readonly<Record<string, unknown>>,
    message: string,
): string | undefined {
    const nestedAttributes = toRecord(attributes["attributes"])
    const directCandidates: readonly unknown[] = [
        attributes["file_path"],
        attributes["filePath"],
        attributes["source.file.path"],
        nestedAttributes?.["file_path"],
        nestedAttributes?.["filePath"],
        nestedAttributes?.["source.file.path"],
    ]

    for (const candidate of directCandidates) {
        const path = normalizePathLike(candidate)
        if (path !== undefined) {
            return path
        }
    }

    return extractPathFromText(message)
}

/**
 * Resolves affected code paths from Datadog log entries.
 *
 * @param logs Normalized Datadog logs.
 * @returns Deterministic unique list of affected file paths.
 */
function resolveAffectedCodePaths(logs: readonly IDatadogLogEntry[]): readonly string[] | undefined {
    const paths = logs
        .map((logEntry): string | undefined => {
            return logEntry.filePath ?? extractPathFromText(logEntry.message)
        })
        .filter((path): path is string => {
            return path !== undefined
        })

    if (paths.length === 0) {
        return undefined
    }

    return deduplicateTextList(paths)
}

/**
 * Normalizes candidate value to ISO timestamp string.
 *
 * @param value Candidate timestamp value.
 * @returns ISO timestamp when value is valid.
 */
function normalizeIsoTimestamp(value: unknown): string | undefined {
    if (
        typeof value !== "string"
        && typeof value !== "number"
        && (value instanceof Date) === false
    ) {
        return undefined
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.valueOf())) {
        return undefined
    }

    return parsed.toISOString()
}

/**
 * Normalizes path-like value extracted from log payload.
 *
 * @param value Candidate path.
 * @returns Normalized path when candidate looks like source file.
 */
function normalizePathLike(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return undefined
    }

    if (/\.[a-z0-9]+$/i.test(normalized) === false) {
        return undefined
    }

    return normalized
}

/**
 * Extracts probable source file path from free-form text.
 *
 * @param text Candidate text.
 * @returns Extracted path when available.
 */
function extractPathFromText(text: string): string | undefined {
    const match = /(?:^|[\s(])([A-Za-z0-9_\-./]+?\.[A-Za-z0-9]+)(?:$|[\s),])/u.exec(text)
    if (match?.[1] === undefined) {
        return undefined
    }

    const extracted = match[1].trim()
    if (extracted.length === 0) {
        return undefined
    }

    return extracted
}

/**
 * Resolves fetched-at timestamp from payload.
 *
 * @param root Payload root object.
 * @returns Valid timestamp.
 */
function resolveFetchedAt(root: Readonly<Record<string, unknown>>): Date {
    const monitor = toRecord(root["monitor"])
    const candidates: readonly unknown[] = [
        root["fetchedAt"],
        root["overall_state_modified"],
        root["overallStateModified"],
        root["modified_at"],
        root["modifiedAt"],
        root["date_updated"],
        root["dateUpdated"],
        root["updatedAt"],
        root["updated_at"],
        root["lastSeen"],
        root["last_seen"],
        root["dateCreated"],
        root["timestamp"],
        monitor?.["overall_state_modified"],
        monitor?.["overallStateModified"],
        monitor?.["last_triggered_at"],
        monitor?.["lastTriggeredAt"],
        monitor?.["modified_at"],
        monitor?.["modifiedAt"],
        monitor?.["timestamp"],
    ]

    for (const candidate of candidates) {
        const parsedDate = resolveValidDateCandidate(candidate)
        if (parsedDate !== undefined) {
            return parsedDate
        }
    }

    return new Date(DEFAULT_FETCHED_AT.getTime())
}

/**
 * Resolves valid Date instance from unknown date candidate.
 *
 * @param candidate Candidate date value.
 * @returns Valid Date instance when candidate is parseable.
 */
function resolveValidDateCandidate(candidate: unknown): Date | undefined {
    if (candidate instanceof Date) {
        if (Number.isNaN(candidate.valueOf()) === false) {
            return new Date(candidate.getTime())
        }

        return undefined
    }

    if (typeof candidate === "string" || typeof candidate === "number") {
        const parsed = new Date(candidate)
        if (Number.isNaN(parsed.valueOf()) === false) {
            return parsed
        }
    }

    return undefined
}

/**
 * Converts unknown to plain object record.
 *
 * @param value Candidate value.
 * @returns Plain record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Converts unknown value to readonly array.
 *
 * @param value Candidate value.
 * @returns Array or empty list.
 */
function toArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) {
        return value
    }

    return []
}

/**
 * Reads textual value by candidate keys.
 *
 * @param source Source record.
 * @param keys Candidate keys.
 * @param fallback Fallback value.
 * @returns Normalized string.
 */
function readText(
    source: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
    fallback = "",
): string {
    for (const key of keys) {
        const value = source?.[key]
        if (typeof value === "string") {
            const normalized = value.trim()
            if (normalized.length > 0) {
                return normalized
            }
        }
    }

    return fallback
}

/**
 * Reads identifier value by candidate keys.
 *
 * @param source Source record.
 * @param keys Candidate keys.
 * @param fallback Fallback value.
 * @returns Normalized identifier.
 */
function readIdentifier(
    source: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
    fallback = "",
): string {
    for (const key of keys) {
        const value = source?.[key]

        if (typeof value === "string") {
            const normalized = value.trim()
            if (normalized.length > 0) {
                return normalized
            }
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value)
        }
    }

    return fallback
}

/**
 * Reads positive integer metric from unknown value.
 *
 * @param value Candidate metric value.
 * @returns Positive integer when value is finite and greater than zero or zero.
 */
function readPositiveInteger(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
        return value
    }

    if (typeof value === "string") {
        const trimmed = value.trim()
        if (trimmed.length === 0) {
            return undefined
        }

        const parsed = Number(trimmed)
        if (Number.isInteger(parsed) && parsed >= 0) {
            return parsed
        }
    }

    return undefined
}

/**
 * Normalizes multi-line text while preserving logical line breaks.
 *
 * @param value Raw text.
 * @returns Normalized text or undefined.
 */
function normalizeMultilineText(value: string): string | undefined {
    const normalized = value
        .split("\n")
        .map((line) => {
            return normalizeSingleLineText(line)
        })
        .filter((line) => {
            return line.length > 0
        })
        .join("\n")

    return normalized.length > 0 ? normalized : undefined
}

/**
 * Normalizes a single line of text.
 *
 * @param value Raw text.
 * @returns Trimmed single-line text.
 */
function normalizeSingleLineText(value: string): string {
    return value.replace(/\s+/g, " ").trim()
}

/**
 * Removes HTML tags while preserving simple line breaks.
 *
 * @param value Raw HTML or text.
 * @returns Plain text.
 */
function stripHtmlTags(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
}

/**
 * Splits plain text into normalized checklist items.
 *
 * @param value Plain checklist text.
 * @returns Checklist items.
 */
function splitChecklistText(value: string): readonly string[] {
    const normalizedText = normalizeMultilineText(value)
    if (normalizedText === undefined) {
        return []
    }

    const items = normalizedText
        .split("\n")
        .map((line) => {
            return normalizeChecklistItem(line)
        })
        .filter((line) => {
            return line.length > 0
        })

    return deduplicateTextList(items)
}

/**
 * Normalizes a single checklist line by removing common bullet prefixes.
 *
 * @param value Checklist candidate.
 * @returns Plain checklist item.
 */
function normalizeChecklistItem(value: string): string {
    return normalizeSingleLineText(value.replace(/^[-*[\]xX0-9().\s]+/, ""))
}

/**
 * Detects heading-like text that likely starts a new section.
 *
 * @param value Candidate line.
 * @returns True when line looks like a section heading.
 */
function isSectionHeading(value: string): boolean {
    return /^[A-Z][A-Za-z0-9 /_-]{1,50}:$/.test(value)
}

/**
 * Removes duplicate items while keeping original order.
 *
 * @param items Candidate items.
 * @returns Deduplicated items.
 */
function deduplicateTextList(items: readonly string[]): readonly string[] {
    const uniqueItems: string[] = []
    const seen = new Set<string>()

    for (const item of items) {
        if (seen.has(item)) {
            continue
        }

        seen.add(item)
        uniqueItems.push(item)
    }

    return uniqueItems
}

/**
 * Removes only adjacent duplicate lines emitted by the recursive rich-text traversal.
 *
 * @param lines Candidate lines.
 * @returns Sequentially deduplicated lines.
 */
function deduplicateSequentialLines(lines: readonly string[]): readonly string[] {
    const normalized: string[] = []

    for (const line of lines) {
        const previous = normalized[normalized.length - 1]
        if (previous === line) {
            continue
        }

        normalized.push(line)
    }

    return normalized
}
