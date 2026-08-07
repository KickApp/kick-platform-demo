import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    usePlaidLink,
    type PlaidLinkOptionsWithLinkToken,
} from "react-plaid-link";
import {
    createPlaidLinkConnection,
    createPlaidLinkToken,
    fetchPlaidLinkConfig,
} from "../api/plaid-link";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { EmptyMessage, ErrorMessageBox, LoadingMessage } from "./StatusMessage";

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

    const selectedEntityId =
        entityId !== "" ? entityId : (entities[0]?.id ?? "");

    // Plaid hands the public token to a callback it captured when Link opened,
    // so the entity has to be readable from a ref rather than a closed-over
    // render value.
    const selectedEntityIdRef = useRef(selectedEntityId);
    useEffect(() => {
        selectedEntityIdRef.current = selectedEntityId;
    }, [selectedEntityId]);

    const configQuery = useQuery({
        queryKey: ["plaidLinkConfig"],
        queryFn: fetchPlaidLinkConfig,
    });

    // Link tokens expire quickly, so this one is not kept across mounts.
    const linkTokenQuery = useQuery({
        queryKey: ["plaidLinkToken"],
        queryFn: createPlaidLinkToken,
        enabled: configQuery.data?.configured === true,
        gcTime: 0,
    });

    const connectMutation = useMutation({
        mutationFn: createPlaidLinkConnection,
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["plaidConnections", workspaceId],
            });
            onDone();
        },
    });

    const linkOptions: PlaidLinkOptionsWithLinkToken = {
        token: linkTokenQuery.data?.linkToken ?? null,
        onSuccess: (publicToken, metadata) => {
            if (publicToken === null) {
                return;
            }
            const [only] = metadata.accounts;
            connectMutation.mutate({
                entityId: selectedEntityIdRef.current,
                publicToken,
                accountId:
                    metadata.accounts.length === 1 && only !== undefined
                        ? only.id
                        : undefined,
            });
        },
    };
    const { open, ready } = usePlaidLink(linkOptions);

    if (configQuery.isPending) {
        return <LoadingMessage label="Plaid configuration" />;
    }

    if (configQuery.data?.configured !== true) {
        return (
            <EmptyMessage>
                Plaid Link is not configured on the demo backend. Set{" "}
                <code>PLAID_CLIENT_ID</code> and <code>PLAID_SECRET</code> and
                restart it to connect an account from here.
            </EmptyMessage>
        );
    }

    if (entitiesError === null && entities.length === 0) {
        return (
            <EmptyMessage>
                Create an entity first — a Plaid connection is always assigned
                to one.
            </EmptyMessage>
        );
    }

    const isBusy = connectMutation.isPending || linkTokenQuery.isPending;

    return (
        <div className="card form-card">
            <h3 className="form-title">New Plaid connection</h3>
            {entitiesError !== null && (
                <ErrorMessageBox error={entitiesError} />
            )}
            <label className="field">
                <span className="field-label">Entity</span>
                <select
                    value={selectedEntityId}
                    onChange={(event) => setEntityId(event.target.value)}
                    disabled={isBusy}
                >
                    {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                            {entity.name ?? entity.id}
                        </option>
                    ))}
                </select>
                <span className="field-hint">
                    The account you link is created already assigned to this
                    entity.
                </span>
            </label>
            <p className="field-hint">
                Plaid Link runs under this demo's own Plaid credentials
                {configQuery.data.environment !== null && (
                    <> ({configQuery.data.environment})</>
                )}
                . The backend exchanges the resulting public token for a{" "}
                <code>kick</code> processor token and sends only that to the
                Platform API — Kick never sees your Plaid access token.
            </p>
            {linkTokenQuery.error !== null && (
                <ErrorMessageBox error={linkTokenQuery.error} />
            )}
            {connectMutation.error !== null && (
                <ErrorMessageBox error={connectMutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={onDone}
                    disabled={connectMutation.isPending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="button button-primary"
                    onClick={() => open()}
                    disabled={!ready || isBusy || selectedEntityId === ""}
                >
                    {connectMutation.isPending
                        ? "Creating connection…"
                        : "Connect with Plaid"}
                </button>
            </div>
        </div>
    );
}
