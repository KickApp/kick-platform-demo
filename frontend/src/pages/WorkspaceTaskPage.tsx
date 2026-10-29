import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import {
    TASK_PRIORITY_LABELS,
    TASK_STATUS_LABELS,
    TASK_TYPE_LABELS,
    type PlatformUserIdentity,
} from "@kick-demo/shared";
import { fetchTask } from "../api/platform";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { TaskMessagesThread } from "../components/TaskMessagesThread";
import { TaskTransactions } from "../components/TaskTransactions";
import { formatDateTime } from "../lib/format";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceTaskGroups } from "../lib/use-workspace-task-groups";
import { useWorkspaceContext } from "../lib/workspace-context";

function userLabel(user: PlatformUserIdentity | null | undefined): string {
    if (!user) {
        return "—";
    }
    return user.name ?? user.email ?? user.id;
}

function SummaryItem({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="summary-item">
            <span className="summary-label">{label}</span>
            <span className="summary-value summary-value-text">{children}</span>
        </div>
    );
}

/**
 * One task through the Platform API's `get`, with every relation expanded,
 * followed by the transactions it covers and its message thread.
 */
export function WorkspaceTaskPage() {
    const { workspaceId } = useWorkspaceContext();
    const { taskId } = useParams();
    const entities = useWorkspaceEntities(workspaceId);
    const taskGroups = useWorkspaceTaskGroups(workspaceId);

    const taskQuery = useQuery({
        queryKey: ["task", workspaceId, taskId],
        queryFn: () =>
            fetchTask({
                workspaceId,
                taskId: taskId ?? "",
                relations: ["entities", "assignee", "createdBy", "completedBy"],
            }),
        enabled: taskId !== undefined,
    });

    if (taskId === undefined) {
        return <EmptyMessage>Task not specified.</EmptyMessage>;
    }

    const task = taskQuery.data;

    return (
        <section>
            <Link to=".." relative="path" className="back-link">
                ← All tasks
            </Link>

            {taskQuery.isPending && <LoadingMessage label="task" />}
            {taskQuery.error !== null && (
                <ErrorMessageBox error={taskQuery.error} />
            )}

            {task && (
                <>
                    <div className="page-header">
                        <div>
                            <h3 className="section-title">{task.title}</h3>
                            <p className="page-meta mono">{task.id}</p>
                        </div>
                    </div>
                    {task.description !== null && task.description !== "" && (
                        <p className="task-description">{task.description}</p>
                    )}

                    <div className="card summary-card">
                        <SummaryItem label="Status">
                            {TASK_STATUS_LABELS[task.status]}
                        </SummaryItem>
                        <SummaryItem label="Priority">
                            {task.priority !== null
                                ? TASK_PRIORITY_LABELS[task.priority]
                                : "—"}
                        </SummaryItem>
                        <SummaryItem label="Type">
                            {TASK_TYPE_LABELS[task.type]}
                        </SummaryItem>
                        <SummaryItem label="Due">
                            {task.dueDate ?? "—"}
                        </SummaryItem>
                        <SummaryItem label="Group">
                            {task.groupId !== null
                                ? (taskGroups.taskGroupName(task.groupId) ??
                                  task.groupId)
                                : "—"}
                        </SummaryItem>
                        <SummaryItem label="Entities">
                            {task.entities && task.entities.length > 0
                                ? task.entities
                                      .map((entity) => entity.name ?? entity.id)
                                      .join(", ")
                                : "—"}
                        </SummaryItem>
                        <SummaryItem label="Assignee">
                            {task.assigneeId === null
                                ? "Unassigned"
                                : userLabel(task.assignee)}
                        </SummaryItem>
                        <SummaryItem label="Created">
                            {formatDateTime(task.createdAt)}
                            {task.createdBy && (
                                <span className="cell-meta">
                                    by {userLabel(task.createdBy)}
                                </span>
                            )}
                        </SummaryItem>
                        <SummaryItem label="Last completed">
                            {task.completedAt !== null
                                ? formatDateTime(task.completedAt)
                                : "—"}
                            {task.completedBy && (
                                <span className="cell-meta">
                                    by {userLabel(task.completedBy)}
                                </span>
                            )}
                        </SummaryItem>
                    </div>

                    {task.metadata.transactionIds !== null && (
                        <TaskTransactions
                            workspaceId={workspaceId}
                            transactionIds={task.metadata.transactionIds}
                            entityName={entities.entityName}
                        />
                    )}

                    <TaskMessagesThread
                        workspaceId={workspaceId}
                        taskId={task.id}
                    />
                </>
            )}
        </section>
    );
}
