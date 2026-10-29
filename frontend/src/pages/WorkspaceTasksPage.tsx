import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TASK_PRIORITIES,
    TASK_PRIORITY_LABELS,
    TASK_STATUSES,
    TASK_STATUS_LABELS,
    TASK_TYPES,
    TASK_TYPE_LABELS,
    type PlatformTasksListQuery,
    type TaskPriority,
    type TaskStatus,
    type TaskType,
} from "@kick-demo/shared";
import { fetchTasks } from "../api/platform";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { TaskRow } from "../components/TaskRow";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceTaskGroups } from "../lib/use-workspace-task-groups";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;

interface TaskFilters {
    status: TaskStatus | "";
    priority: TaskPriority | "";
    type: TaskType | "";
    groupId: string;
    entityId: string;
    isUnassigned: boolean;
    dueDateStart: string;
    dueDateEnd: string;
}

const NO_FILTERS: TaskFilters = {
    status: "",
    priority: "",
    type: "",
    groupId: "",
    entityId: "",
    isUnassigned: false,
    dueDateStart: "",
    dueDateEnd: "",
};

function isTaskStatus(value: string): value is TaskStatus {
    return TASK_STATUSES.some((status) => status === value);
}

function isTaskPriority(value: string): value is TaskPriority {
    return TASK_PRIORITIES.some((priority) => priority === value);
}

function isTaskType(value: string): value is TaskType {
    return TASK_TYPES.some((type) => type === value);
}

/**
 * The pickers choose one value each, which the API takes as a single-element
 * multi-choice filter. Empty pickers are left off the query entirely.
 */
function toTasksQuery(
    filters: TaskFilters,
    search: string,
): Omit<PlatformTasksListQuery, "limit" | "offset"> {
    return {
        relations: ["assignee", "completedBy"],
        ...(filters.status !== "" && { statuses: [filters.status] }),
        ...(filters.priority !== "" && { priorities: [filters.priority] }),
        ...(filters.type !== "" && { types: [filters.type] }),
        ...(filters.groupId !== "" && { groupIds: [filters.groupId] }),
        ...(filters.entityId !== "" && { entityIds: [filters.entityId] }),
        ...(filters.isUnassigned && { isUnassigned: "true" }),
        ...(filters.dueDateStart !== "" && {
            dueDateStart: filters.dueDateStart,
        }),
        ...(filters.dueDateEnd !== "" && { dueDateEnd: filters.dueDateEnd }),
        ...(search !== "" && { search }),
    };
}

export function WorkspaceTasksPage() {
    const { workspaceId } = useWorkspaceContext();
    const entities = useWorkspaceEntities(workspaceId);
    const taskGroups = useWorkspaceTaskGroups(workspaceId);
    const [offset, setOffset] = useState(0);
    const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS);
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim());

    const query = toTasksQuery(filters, search);
    const tasksQuery = useQuery({
        queryKey: ["tasks", workspaceId, query, offset],
        queryFn: () =>
            fetchTasks({ workspaceId, ...query, limit: PAGE_SIZE, offset }),
    });

    const updateFilters = (changes: Partial<TaskFilters>) => {
        setFilters((current) => ({ ...current, ...changes }));
        setOffset(0);
    };

    const hasFilters =
        searchInput !== "" ||
        filters.status !== "" ||
        filters.priority !== "" ||
        filters.type !== "" ||
        filters.groupId !== "" ||
        filters.entityId !== "" ||
        filters.isUnassigned ||
        filters.dueDateStart !== "" ||
        filters.dueDateEnd !== "";

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Tasks</h3>
                    {tasksQuery.data && (
                        <p className="page-meta">
                            {tasksQuery.data.pagination.total} total, newest
                            first
                        </p>
                    )}
                </div>
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Search</span>
                    <input
                        type="search"
                        placeholder="Title contains…"
                        value={searchInput}
                        onChange={(event) => {
                            setSearchInput(event.target.value);
                            setOffset(0);
                        }}
                    />
                </label>
                <label className="field-inline">
                    <span className="field-label">Status</span>
                    <select
                        value={filters.status}
                        onChange={(event) => {
                            const value = event.target.value;
                            updateFilters({
                                status: isTaskStatus(value) ? value : "",
                            });
                        }}
                    >
                        <option value="">Any status</option>
                        {TASK_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {TASK_STATUS_LABELS[status]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Priority</span>
                    <select
                        value={filters.priority}
                        onChange={(event) => {
                            const value = event.target.value;
                            updateFilters({
                                priority: isTaskPriority(value) ? value : "",
                            });
                        }}
                    >
                        <option value="">Any priority</option>
                        {TASK_PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>
                                {TASK_PRIORITY_LABELS[priority]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Type</span>
                    <select
                        value={filters.type}
                        onChange={(event) => {
                            const value = event.target.value;
                            updateFilters({
                                type: isTaskType(value) ? value : "",
                            });
                        }}
                    >
                        <option value="">Any type</option>
                        {TASK_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {TASK_TYPE_LABELS[type]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Task group</span>
                    <select
                        value={filters.groupId}
                        onChange={(event) =>
                            updateFilters({ groupId: event.target.value })
                        }
                    >
                        <option value="">Any group</option>
                        {taskGroups.taskGroups.map((taskGroup) => (
                            <option key={taskGroup.id} value={taskGroup.id}>
                                {taskGroup.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={filters.entityId}
                        onChange={(event) =>
                            updateFilters({ entityId: event.target.value })
                        }
                    >
                        <option value="">Any entity</option>
                        {entities.entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name ?? entity.id}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Due from</span>
                    <input
                        type="date"
                        value={filters.dueDateStart}
                        onChange={(event) =>
                            updateFilters({ dueDateStart: event.target.value })
                        }
                    />
                </label>
                <label className="field-inline">
                    <span className="field-label">Due to</span>
                    <input
                        type="date"
                        value={filters.dueDateEnd}
                        onChange={(event) =>
                            updateFilters({ dueDateEnd: event.target.value })
                        }
                    />
                </label>
                <label className="field-checkbox">
                    <input
                        type="checkbox"
                        checked={filters.isUnassigned}
                        onChange={(event) =>
                            updateFilters({
                                isUnassigned: event.target.checked,
                            })
                        }
                    />
                    Unassigned only
                </label>
                {hasFilters && (
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                            setFilters(NO_FILTERS);
                            setSearchInput("");
                            setOffset(0);
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {tasksQuery.isPending && <LoadingMessage label="tasks" />}
            {tasksQuery.error !== null && (
                <ErrorMessageBox error={tasksQuery.error} />
            )}
            {taskGroups.error !== null && (
                <ErrorMessageBox error={taskGroups.error} />
            )}

            {tasksQuery.data && tasksQuery.data.data.length === 0 && (
                <EmptyMessage>
                    {hasFilters
                        ? "No tasks match these filters."
                        : "No tasks in this workspace yet."}
                </EmptyMessage>
            )}

            {tasksQuery.data && tasksQuery.data.data.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Type</th>
                                <th>Due</th>
                                <th>Group</th>
                                <th>Entities</th>
                                <th>Assignee</th>
                                <th>Completed</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasksQuery.data.data.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    entityName={entities.entityName}
                                    taskGroupName={taskGroups.taskGroupName}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tasksQuery.data && (
                <Pagination
                    pagination={tasksQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
