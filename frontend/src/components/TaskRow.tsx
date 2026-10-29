import {
    TASK_PRIORITY_LABELS,
    TASK_STATUS_LABELS,
    TASK_TYPE_LABELS,
    type PlatformTask,
    type PlatformUserIdentity,
    type TaskStatus,
} from "@kick-demo/shared";
import { Link } from "react-router";
import { formatDate, formatDateTime } from "../lib/format";

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
    todo: "badge",
    in_progress: "badge",
    blocked: "badge badge-danger",
    done: "badge badge-success",
    cancelled: "badge",
};

function userLabel(user: PlatformUserIdentity): string {
    return user.name ?? user.email ?? user.id;
}

interface TaskRowProps {
    task: PlatformTask;
    entityName: (entityId: string) => string | null;
    taskGroupName: (taskGroupId: string) => string | null;
}

/**
 * The listing is requested with the `assignee` and `completedBy` relations,
 * so user names come with the row; entity and group names come from the
 * workspace lookups.
 */
export function TaskRow({ task, entityName, taskGroupName }: TaskRowProps) {
    return (
        <tr>
            <td>
                <Link className="row-link" to={task.id}>
                    {task.title}
                </Link>
                {task.description !== null && task.description !== "" && (
                    <span className="cell-meta">{task.description}</span>
                )}
                {task.metadata.transactionIds !== null &&
                    task.metadata.transactionIds.length > 0 && (
                        <span className="cell-meta">
                            {task.metadata.transactionIds.length === 1
                                ? "1 transaction"
                                : `${task.metadata.transactionIds.length} transactions`}
                        </span>
                    )}
            </td>
            <td>
                <span className={STATUS_BADGE_CLASSES[task.status]}>
                    {TASK_STATUS_LABELS[task.status]}
                </span>
            </td>
            <td>
                {task.priority !== null
                    ? TASK_PRIORITY_LABELS[task.priority]
                    : "—"}
            </td>
            <td>{TASK_TYPE_LABELS[task.type]}</td>
            <td>{task.dueDate ?? "—"}</td>
            <td>
                {task.groupId !== null
                    ? (taskGroupName(task.groupId) ?? (
                          <span className="mono">{task.groupId}</span>
                      ))
                    : "—"}
            </td>
            <td>
                {task.entityIds.length === 0
                    ? "—"
                    : task.entityIds.map((entityId) => (
                          <span key={entityId} className="cell-meta">
                              {entityName(entityId) ?? (
                                  <span className="mono">{entityId}</span>
                              )}
                          </span>
                      ))}
            </td>
            <td>
                {task.assignee ? (
                    userLabel(task.assignee)
                ) : task.assigneeId !== null ? (
                    <span className="mono">{task.assigneeId}</span>
                ) : (
                    <span className="badge">Unassigned</span>
                )}
            </td>
            <td>
                {task.completedAt !== null ? (
                    <>
                        {formatDateTime(task.completedAt)}
                        {task.completedBy && (
                            <span className="cell-meta">
                                by {userLabel(task.completedBy)}
                            </span>
                        )}
                    </>
                ) : (
                    "—"
                )}
            </td>
            <td>{formatDate(task.createdAt)}</td>
        </tr>
    );
}
