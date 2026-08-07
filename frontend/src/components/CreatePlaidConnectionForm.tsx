import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PROCESSOR_TOKEN_PATTERN } from "@kick-demo/shared";
import { createPlaidConnection } from "../api/platform";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { EmptyMessage, ErrorMessageBox } from "./StatusMessage";

export function CreatePlaidConnectionForm({
    workspaceId,
    onDone,
}: {
    workspaceId: string;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const { entities, error: entitiesError } =
        useWorkspaceEntities(workspaceId);
    const [entityId, setEntityId] = useState("");
    const [processorToken, setProcessorToken] = useState("");

    const mutation = useMutation({
        mutationFn: createPlaidConnection,
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["plaidConnections", workspaceId],
            });
            onDone();
        },
    });

    const selectedEntityId =
        entityId !== "" ? entityId : (entities[0]?.id ?? "");

    if (entitiesError === null && entities.length === 0) {
        return (
            <EmptyMessage>
                Create an entity first — a Plaid connection is always assigned
                to one.
            </EmptyMessage>
        );
    }

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({
                    entityId: selectedEntityId,
                    processorToken: processorToken.trim(),
                });
            }}
        >
            <h3 className="form-title">New Plaid connection</h3>
            {entitiesError !== null && (
                <ErrorMessageBox error={entitiesError} />
            )}
            <label className="field">
                <span className="field-label">Entity</span>
                <select
                    value={selectedEntityId}
                    onChange={(event) => setEntityId(event.target.value)}
                >
                    {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                            {entity.name ?? entity.id}
                        </option>
                    ))}
                </select>
            </label>
            <label className="field">
                <span className="field-label">Processor token</span>
                <input
                    type="text"
                    value={processorToken}
                    onChange={(event) => setProcessorToken(event.target.value)}
                    placeholder="processor-sandbox-0a1b2c3d-…"
                    pattern={PROCESSOR_TOKEN_PATTERN.source}
                    maxLength={200}
                    required
                    autoFocus
                />
                <span className="field-hint">
                    Kick never runs Plaid Link on this surface: you run it under
                    your own Plaid credentials and pass the resulting
                    <code> processor_token</code> here. It must point at exactly
                    one USD credit, depository or loan account.
                </span>
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
                    disabled={
                        mutation.isPending ||
                        selectedEntityId === "" ||
                        processorToken.trim() === ""
                    }
                >
                    {mutation.isPending ? "Connecting…" : "Create connection"}
                </button>
            </div>
        </form>
    );
}
