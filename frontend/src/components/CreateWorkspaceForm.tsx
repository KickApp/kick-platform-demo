import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWorkspace } from "../api/platform";
import { previousYearStartIsoDate } from "../lib/format";
import { ErrorMessageBox } from "./StatusMessage";

export function CreateWorkspaceForm({ onDone }: { onDone: () => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [bookkeepingStartDate, setBookkeepingStartDate] = useState(
        previousYearStartIsoDate(),
    );

    const mutation = useMutation({
        mutationFn: createWorkspace,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            onDone();
        },
    });

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({ name: name.trim(), bookkeepingStartDate });
            }}
        >
            <h3 className="form-title">New workspace</h3>
            <label className="field">
                <span className="field-label">Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Acme Inc."
                    maxLength={200}
                    required
                    autoFocus
                />
            </label>
            <label className="field">
                <span className="field-label">Bookkeeping start date</span>
                <input
                    type="date"
                    value={bookkeepingStartDate}
                    onChange={(event) =>
                        setBookkeepingStartDate(event.target.value)
                    }
                    required
                />
            </label>
            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={onDone}
                    disabled={mutation.isPending}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={mutation.isPending || name.trim() === ""}
                >
                    {mutation.isPending ? "Creating…" : "Create workspace"}
                </button>
            </div>
        </form>
    );
}
