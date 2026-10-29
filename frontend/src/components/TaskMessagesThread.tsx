import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TASK_MESSAGE_VISIBILITY_LABELS,
    type PlatformTaskMessage,
} from "@kick-demo/shared";
import { fetchTaskMessages } from "../api/platform";
import { formatDateTime } from "../lib/format";
import { Pagination } from "./Pagination";
import { EmptyMessage, ErrorMessageBox, LoadingMessage } from "./StatusMessage";
import { TaskMessageForm } from "./TaskMessageForm";

const PAGE_SIZE = 50;

function lastPageOffset(total: number): number {
    return Math.max(0, Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE);
}

function authorLabel(message: PlatformTaskMessage): string {
    if (message.author) {
        return message.author.name ?? message.author.email ?? message.author.id;
    }
    // Kick leaves the author off both system messages and Platform API posts.
    return message.authorId === null
        ? "System or Platform API"
        : message.authorId;
}

/**
 * The listing is oldest first with replies interleaved by time, so replies are
 * regrouped under their parent when it is on the same page. A reply whose
 * parent sits on an earlier page is shown at the top level and says so.
 */
function MessageTree({
    message,
    repliesByParent,
    isOrphanReply,
}: {
    message: PlatformTaskMessage;
    repliesByParent: Map<string, PlatformTaskMessage[]>;
    isOrphanReply: boolean;
}) {
    const replies = repliesByParent.get(message.id) ?? [];
    return (
        <>
            <article className="card message">
                <div className="message-header">
                    <span className="message-author">
                        {authorLabel(message)}
                    </span>
                    <span className="message-time">
                        {formatDateTime(message.createdAt)}
                    </span>
                    {message.visibility === "internal" && (
                        <span className="badge">
                            {TASK_MESSAGE_VISIBILITY_LABELS.internal}
                        </span>
                    )}
                    {isOrphanReply && (
                        <span className="badge">
                            Reply to an earlier message
                        </span>
                    )}
                </div>
                {message.isDeleted || message.content === null ? (
                    <p className="message-deleted">Message deleted</p>
                ) : (
                    <p className="message-body">{message.content}</p>
                )}
            </article>
            {replies.length > 0 && (
                <div className="message-list message-reply">
                    {replies.map((reply) => (
                        <MessageTree
                            key={reply.id}
                            message={reply}
                            repliesByParent={repliesByParent}
                            isOrphanReply={false}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

export function TaskMessagesThread({
    workspaceId,
    taskId,
}: {
    workspaceId: string;
    taskId: string;
}) {
    const [offset, setOffset] = useState(0);

    const messagesQuery = useQuery({
        queryKey: ["task-messages", workspaceId, taskId, offset],
        queryFn: () =>
            fetchTaskMessages({
                workspaceId,
                taskId,
                relations: ["author"],
                limit: PAGE_SIZE,
                offset,
            }),
    });

    const messages = messagesQuery.data?.data ?? [];
    const idsOnPage = new Set(messages.map((message) => message.id));
    const repliesByParent = new Map<string, PlatformTaskMessage[]>();
    const topLevel: PlatformTaskMessage[] = [];
    for (const message of messages) {
        const parentId = message.parentMessageId;
        if (parentId !== null && idsOnPage.has(parentId)) {
            repliesByParent.set(parentId, [
                ...(repliesByParent.get(parentId) ?? []),
                message,
            ]);
        } else {
            topLevel.push(message);
        }
    }

    return (
        <section className="task-section">
            <div className="page-header">
                <div>
                    <h3 className="section-title">Messages</h3>
                    {messagesQuery.data && (
                        <p className="page-meta">
                            {messagesQuery.data.pagination.total} in the
                            task&apos;s thread, oldest first
                        </p>
                    )}
                </div>
            </div>

            {messagesQuery.isPending && <LoadingMessage label="messages" />}
            {messagesQuery.error !== null && (
                <ErrorMessageBox error={messagesQuery.error} />
            )}
            {messagesQuery.data && messages.length === 0 && (
                <EmptyMessage>No messages on this task yet.</EmptyMessage>
            )}

            {topLevel.length > 0 && (
                <div className="message-list">
                    {topLevel.map((message) => (
                        <MessageTree
                            key={message.id}
                            message={message}
                            repliesByParent={repliesByParent}
                            isOrphanReply={message.parentMessageId !== null}
                        />
                    ))}
                </div>
            )}

            {messagesQuery.data && (
                <Pagination
                    pagination={messagesQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}

            <TaskMessageForm
                workspaceId={workspaceId}
                taskId={taskId}
                onPosted={() => {
                    const total = messagesQuery.data?.pagination.total ?? 0;
                    setOffset(lastPageOffset(total + 1));
                }}
            />
        </section>
    );
}
