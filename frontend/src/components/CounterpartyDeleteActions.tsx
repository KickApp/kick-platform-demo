import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type {
    CounterpartyConflictReason,
    PlatformCounterparty,
} from "@kick-demo/shared";
import { deleteCounterparty } from "../api/platform";
import { CounterpartyConflictError } from "../api/errors";

type DeleteFlags = { force: boolean; disableInsteadOfDelete: boolean };

type Retry = {
    flags: DeleteFlags;
    label: string;
    confirmation: string;
};

/**
 * The conflict reason says which flag, if any, gets a blocked delete through.
 * Flags accumulate, so a forced delete that then hits a locked period can
 * still fall back to disabling.
 */
function toRetry(
    reason: CounterpartyConflictReason,
    flags: DeleteFlags,
    name: string,
): Retry | null {
    switch (reason) {
        case "transactions_found":
            return {
                flags: { ...flags, force: true },
                label: "Delete anyway",
                confirmation: `Delete "${name}" anyway? Its transactions are left without a counterparty.`,
            };
        case "locked_transactions_found":
        case "bill_or_invoice_links_found":
            return {
                flags: { ...flags, disableInsteadOfDelete: true },
                label: "Disable instead",
                confirmation: `"${name}" can't be deleted. Disable it instead, so it can no longer be assigned to transactions?`,
            };
        case "linked_data_found":
        case "duplicate_name":
            return null;
    }
}

/**
 * Deletes a workspace counterparty, or removes a global one from the
 * workspace. Nothing on the wire says what blocks a delete, so the plain
 * delete is always offered and Kick's 409 reason picks the follow-up.
 */
export function CounterpartyDeleteActions({
    workspaceId,
    counterparty,
}: {
    workspaceId: string;
    counterparty: PlatformCounterparty;
}) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const deleteLabel = counterparty.isGlobal
        ? "Remove from workspace"
        : "Delete";

    const mutation = useMutation({
        mutationFn: (flags: DeleteFlags) =>
            deleteCounterparty({
                workspaceId,
                counterpartyId: counterparty.id,
                ...flags,
            }),
        onSuccess: async (_, flags) => {
            await queryClient.invalidateQueries({
                queryKey: ["counterparties", workspaceId],
            });
            if (flags.disableInsteadOfDelete) {
                await queryClient.invalidateQueries({
                    queryKey: ["counterparty", workspaceId, counterparty.id],
                });
                return;
            }
            queryClient.removeQueries({
                queryKey: ["counterparty", workspaceId, counterparty.id],
            });
            await navigate("..", { relative: "path" });
        },
    });

    const retry =
        mutation.error instanceof CounterpartyConflictError &&
        mutation.variables !== undefined
            ? toRetry(
                  mutation.error.reason,
                  mutation.variables,
                  counterparty.name,
              )
            : null;

    return (
        <div className="action-stack">
            {retry !== null && !mutation.isPending ? (
                <button
                    type="button"
                    className="button button-danger"
                    onClick={() => {
                        if (window.confirm(retry.confirmation)) {
                            mutation.mutate(retry.flags);
                        }
                    }}
                >
                    {retry.label}
                </button>
            ) : (
                <button
                    type="button"
                    className="button button-danger"
                    disabled={mutation.isPending}
                    onClick={() => {
                        mutation.reset();
                        const message = counterparty.isGlobal
                            ? `Remove "${counterparty.name}" from this workspace? The global Kick directory entry itself stays.`
                            : `Delete "${counterparty.name}"? This can't be undone.`;
                        if (window.confirm(message)) {
                            mutation.mutate({
                                force: false,
                                disableInsteadOfDelete: false,
                            });
                        }
                    }}
                >
                    {mutation.isPending ? "Deleting…" : deleteLabel}
                </button>
            )}
            {mutation.error !== null && (
                <span className="cell-error">{mutation.error.message}</span>
            )}
            {mutation.isSuccess &&
                mutation.variables.disableInsteadOfDelete && (
                    <span className="cell-hint">
                        Disabled instead of deleted.
                    </span>
                )}
        </div>
    );
}
