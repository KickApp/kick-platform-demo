import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TASK_GROUP_SCOPES,
    TASK_GROUP_SCOPE_LABELS,
    type TaskGroupScope,
} from "@kick-demo/shared";
import { fetchTaskGroups } from "../api/platform";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDate } from "../lib/format";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;

function isTaskGroupScope(value: string): value is TaskGroupScope {
    return TASK_GROUP_SCOPES.some((scope) => scope === value);
}

export function WorkspaceTaskGroupsPage() {
    const { workspaceId } = useWorkspaceContext();
    const [offset, setOffset] = useState(0);
    const [scope, setScope] = useState<TaskGroupScope | "">("");
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim());

    const taskGroupsQuery = useQuery({
        queryKey: ["task-groups", workspaceId, scope, search, offset],
        queryFn: () =>
            fetchTaskGroups({
                workspaceId,
                ...(scope !== "" && { scopes: [scope] }),
                ...(search !== "" && { search }),
                limit: PAGE_SIZE,
                offset,
            }),
    });

    const hasFilters = scope !== "" || searchInput !== "";

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Task groups</h3>
                    {taskGroupsQuery.data && (
                        <p className="page-meta">
                            {taskGroupsQuery.data.pagination.total} available to
                            this workspace&apos;s tasks, sorted by name
                        </p>
                    )}
                </div>
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Search</span>
                    <input
                        type="search"
                        placeholder="Name contains…"
                        value={searchInput}
                        onChange={(event) => {
                            setSearchInput(event.target.value);
                            setOffset(0);
                        }}
                    />
                </label>
                <label className="field-inline">
                    <span className="field-label">Scope</span>
                    <select
                        value={scope}
                        onChange={(event) => {
                            const value = event.target.value;
                            setScope(isTaskGroupScope(value) ? value : "");
                            setOffset(0);
                        }}
                    >
                        <option value="">Any scope</option>
                        {TASK_GROUP_SCOPES.map((each) => (
                            <option key={each} value={each}>
                                {TASK_GROUP_SCOPE_LABELS[each]}
                            </option>
                        ))}
                    </select>
                </label>
                {hasFilters && (
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                            setScope("");
                            setSearchInput("");
                            setOffset(0);
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {taskGroupsQuery.isPending && (
                <LoadingMessage label="task groups" />
            )}
            {taskGroupsQuery.error !== null && (
                <ErrorMessageBox error={taskGroupsQuery.error} />
            )}

            {taskGroupsQuery.data && taskGroupsQuery.data.data.length === 0 && (
                <EmptyMessage>
                    {hasFilters
                        ? "No task groups match these filters."
                        : "No task groups available to this workspace."}
                </EmptyMessage>
            )}

            {taskGroupsQuery.data && taskGroupsQuery.data.data.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Scope</th>
                                <th>Managed by</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taskGroupsQuery.data.data.map((taskGroup) => (
                                <tr key={taskGroup.id}>
                                    <td>
                                        {taskGroup.name}
                                        <span className="cell-meta mono">
                                            {taskGroup.id}
                                        </span>
                                    </td>
                                    <td>
                                        {
                                            TASK_GROUP_SCOPE_LABELS[
                                                taskGroup.scope
                                            ]
                                        }
                                    </td>
                                    <td>
                                        <span className="badge">
                                            {taskGroup.isSystem
                                                ? "Kick"
                                                : "Users"}
                                        </span>
                                    </td>
                                    <td>{formatDate(taskGroup.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {taskGroupsQuery.data && (
                <Pagination
                    pagination={taskGroupsQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
