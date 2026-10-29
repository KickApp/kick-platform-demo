import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    PLATFORM_TASK_MESSAGE_MAX_LENGTH,
    TASK_MESSAGE_VISIBILITIES,
    TASK_MESSAGE_VISIBILITY_HINTS,
    TASK_MESSAGE_VISIBILITY_LABELS,
    type TaskMessageVisibility,
} from "@kick-demo/shared";
import { createTaskMessage } from "../api/platform";
import { ErrorMessageBox } from "./StatusMessage";

export function TaskMessageForm({
    workspaceId,
    taskId,
    onPosted,
}: {
    workspaceId: string;
    taskId: string;
    onPosted: () => void;
}) {
    const queryClient = useQueryClient();
    const [content, setContent] = useState("");
    const [visibility, setVisibility] =
        useState<TaskMessageVisibility>("shared");

    const mutation = useMutation({
        mutationFn: createTaskMessage,
        onSuccess: async () => {
            setContent("");
            onPosted();
            await queryClient.invalidateQueries({
                queryKey: ["task-messages", workspaceId, taskId],
            });
        },
    });

    return (
        <form
            className="card form-card form-card-wide"
            onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({
                    workspaceId,
                    taskId,
                    body: { content: content.trim(), visibility },
                });
            }}
        >
            <h3 className="form-title">Post a message</h3>
            <label className="field">
                <span className="field-label">Message</span>
                <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={4}
                    maxLength={PLATFORM_TASK_MESSAGE_MAX_LENGTH}
                    placeholder="Plain text; line breaks are kept."
                    required
                />
                <span className="field-hint">
                    Posted to the main timeline without an author; Kick shows it
                    under a Platform API label.
                </span>
            </label>
            <label className="field">
                <span className="field-label">Visibility</span>
                <select
                    value={visibility}
                    onChange={(event) => {
                        const selected = TASK_MESSAGE_VISIBILITIES.find(
                            (each) => each === event.target.value,
                        );
                        if (selected) {
                            setVisibility(selected);
                        }
                    }}
                >
                    {TASK_MESSAGE_VISIBILITIES.map((each) => (
                        <option key={each} value={each}>
                            {TASK_MESSAGE_VISIBILITY_LABELS[each]}
                        </option>
                    ))}
                </select>
                <span className="field-hint">
                    {TASK_MESSAGE_VISIBILITY_HINTS[visibility]}
                </span>
            </label>
            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={mutation.isPending || content.trim() === ""}
                >
                    {mutation.isPending ? "Posting…" : "Post message"}
                </button>
            </div>
        </form>
    );
}
