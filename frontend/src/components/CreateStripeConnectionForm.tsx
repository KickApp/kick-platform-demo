import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    STRIPE_ACCOUNT_ID_PATTERN,
    type PlatformStripeConnectionResponse,
} from "@kick-demo/shared";
import { createStripeConnection } from "../api/platform";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { EmptyMessage, ErrorMessageBox } from "./StatusMessage";

/**
 * The demo has no Stripe sign-in or onboarding flow and holds no Stripe
 * credentials: the account id is typed in by hand and sent to Kick as is.
 */
export function CreateStripeConnectionForm({
    workspaceId,
    onCreated,
    onCancel,
}: {
    workspaceId: string;
    onCreated: (response: PlatformStripeConnectionResponse) => void;
    onCancel: () => void;
}) {
    const queryClient = useQueryClient();
    const { entities, error: entitiesError } =
        useWorkspaceEntities(workspaceId);
    const [entityId, setEntityId] = useState("");
    const [stripeAccountId, setStripeAccountId] = useState("");

    const createMutation = useMutation({
        mutationFn: createStripeConnection,
        onSuccess: async (response) => {
            await queryClient.invalidateQueries({
                queryKey: ["financialAccounts", workspaceId],
            });
            onCreated(response);
        },
    });

    if (entitiesError !== null) {
        return <ErrorMessageBox error={entitiesError} />;
    }
    if (entities.length === 0) {
        return (
            <EmptyMessage>
                Create an entity first — a Stripe connection is always assigned
                to one.
            </EmptyMessage>
        );
    }

    const selectedEntityId =
        entityId !== "" ? entityId : (entities[0]?.id ?? "");
    const trimmedAccountId = stripeAccountId.trim();
    const isAccountIdValid = STRIPE_ACCOUNT_ID_PATTERN.test(trimmedAccountId);

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate({
                    entityId: selectedEntityId,
                    stripeAccountId: trimmedAccountId,
                });
            }}
        >
            <h3 className="form-title">Connect Stripe account</h3>
            <label className="field">
                <span className="field-label">Entity</span>
                <select
                    value={selectedEntityId}
                    onChange={(event) => setEntityId(event.target.value)}
                    disabled={createMutation.isPending}
                >
                    {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                            {entity.name ?? entity.id}
                        </option>
                    ))}
                </select>
                <span className="field-hint">
                    The Stripe account is created already assigned to this
                    entity.
                </span>
            </label>
            <label className="field">
                <span className="field-label">Stripe account ID</span>
                <input
                    type="text"
                    className="mono"
                    placeholder="acct_..."
                    value={stripeAccountId}
                    onChange={(event) => setStripeAccountId(event.target.value)}
                    pattern={STRIPE_ACCOUNT_ID_PATTERN.source}
                    maxLength={64}
                    required
                    disabled={createMutation.isPending}
                />
                <span className="field-hint">
                    Enter by hand the id of an account connected to your own
                    Stripe platform. This demo has no Stripe sign-in flow.
                </span>
            </label>
            <p className="field-hint">
                Kick reads the account with the Stripe API key stored in the
                organization's API settings and refuses the connection until one
                is stored.
            </p>
            {createMutation.error !== null && (
                <ErrorMessageBox error={createMutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={onCancel}
                    disabled={createMutation.isPending}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={
                        createMutation.isPending ||
                        !isAccountIdValid ||
                        selectedEntityId === ""
                    }
                >
                    {createMutation.isPending
                        ? "Connecting…"
                        : "Connect Stripe account"}
                </button>
            </div>
        </form>
    );
}
