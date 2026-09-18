import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    usePlaidLink,
    type PlaidLinkOnSuccessMetadata,
    type PlaidLinkOptionsWithLinkToken,
} from "react-plaid-link";
import {
    platformPlaidAccountTypeSchema,
    type PlaidLinkAccount,
    type PlatformEntity,
} from "@kick-demo/shared";
import {
    createPlaidLinkConnection,
    createPlaidLinkToken,
    fetchPlaidLinkConfig,
} from "../api/plaid-link";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { EmptyMessage, ErrorMessageBox, LoadingMessage } from "./StatusMessage";

/**
 * Link types these as plain strings but reports empty (or, historically,
 * null) values for accounts that carry no mask or subtype.
 */
function toNullable(value: string | null): string | null {
    return value !== null && value !== "" ? value : null;
}

/**
 * The Platform API creates the Kick account from the details declared at
 * creation time, so the picked account's id, type, subtype, name and mask are
 * all forwarded as Link metadata reported them. Undefined when Link did not
 * report exactly one recognizable account — the backend then resolves the one
 * eligible account itself.
 */
function toLinkAccount(
    metadata: PlaidLinkOnSuccessMetadata,
): PlaidLinkAccount | undefined {
    const [only] = metadata.accounts;
    if (metadata.accounts.length !== 1 || only === undefined) {
        return undefined;
    }
    const type = platformPlaidAccountTypeSchema.safeParse(only.type);
    if (!type.success) {
        return undefined;
    }
    return {
        id: only.id,
        type: type.data,
        subtype: toNullable(only.subtype),
        name: toNullable(only.name),
        mask: toNullable(only.mask),
    };
}

export function CreatePlaidConnectionForm({
    workspaceId,
    onDone,
}: {
    workspaceId: string;
    onDone: () => void;
}) {
    const { entities, error: entitiesError } =
        useWorkspaceEntities(workspaceId);

    const configQuery = useQuery({
        queryKey: ["plaidLinkConfig"],
        queryFn: fetchPlaidLinkConfig,
    });

    if (configQuery.isPending) {
        return <LoadingMessage label="Plaid configuration" />;
    }
    if (configQuery.error !== null) {
        return <ErrorMessageBox error={configQuery.error} />;
    }
    if (!configQuery.data.configured) {
        return (
            <EmptyMessage>
                Plaid Link is not configured on the demo backend. Set{" "}
                <code>PLAID_CLIENT_ID</code> and <code>PLAID_SECRET</code> and
                restart it to connect an account from here.
            </EmptyMessage>
        );
    }

    if (entitiesError !== null) {
        return <ErrorMessageBox error={entitiesError} />;
    }
    if (entities.length === 0) {
        return (
            <EmptyMessage>
                Create an entity first — a Plaid connection is always assigned
                to one.
            </EmptyMessage>
        );
    }

    return (
        <PlaidLinkForm
            workspaceId={workspaceId}
            entities={entities}
            environment={configQuery.data.environment}
            onDone={onDone}
        />
    );
}

/**
 * Split out so it mounts only once Plaid is known to be configured and there
 * is an entity to assign: `usePlaidLink` injects Plaid's script as soon as it
 * runs, and there is nothing to load it for otherwise.
 */
function PlaidLinkForm({
    workspaceId,
    entities,
    environment,
    onDone,
}: {
    workspaceId: string;
    entities: PlatformEntity[];
    environment: string | null;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
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

    // Link tokens are short-lived, so this one is not kept across mounts.
    const linkTokenQuery = useQuery({
        queryKey: ["plaidLinkToken"],
        queryFn: createPlaidLinkToken,
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
            connectMutation.mutate({
                entityId: selectedEntityIdRef.current,
                publicToken,
                // Absent when the Plaid dashboard has no single-account
                // select; the backend then resolves the account itself.
                account: toLinkAccount(metadata),
                // Absent for flows where Link reports no institution; the
                // backend then reads it off the Item itself.
                institutionId: metadata.institution?.institution_id,
            });
        },
    };
    const { open, ready } = usePlaidLink(linkOptions);

    const isBusy = connectMutation.isPending || linkTokenQuery.isPending;

    return (
        <div className="card form-card">
            <h3 className="form-title">New Plaid connection</h3>
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
                {environment !== null && <> ({environment})</>}. The backend
                exchanges the resulting public token for a <code>kick</code>{" "}
                processor token and sends only that to the Platform API — Kick
                never sees the Plaid access token.
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
