import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformTransaction } from "@kick-demo/shared";
import { updateTransaction } from "../api/platform";
import { CounterpartyPicker } from "./CounterpartyPicker";
import { TransactionCounterpartyLabel } from "./TransactionCounterpartyLabel";

/**
 * Shows the counterparty assigned to a transaction and lets it be changed or
 * removed in place. The picker searches the default listing, which leaves
 * disabled counterparties out, so it never offers one Kick refuses to assign.
 * A transaction matched to a bill or invoice answers 400 and one in a locked
 * period 409; Kick's message is shown under the cell.
 */
export function TransactionCounterpartyCell({
    transaction,
    workspaceId,
}: {
    transaction: PlatformTransaction;
    workspaceId: string;
}) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    const mutation = useMutation({
        mutationFn: (counterpartyId: string | null) =>
            updateTransaction({
                workspaceId,
                transactionId: transaction.id,
                body: { counterpartyId },
            }),
        onSuccess: async () => {
            setIsEditing(false);
            await queryClient.invalidateQueries({
                queryKey: ["transactions", workspaceId],
            });
        },
    });

    if (mutation.isPending) {
        return <span className="cell-pending">Saving…</span>;
    }

    if (isEditing) {
        return (
            <div
                className="cell-editor cell-editable"
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        setIsEditing(false);
                    }
                }}
            >
                <CounterpartyPicker
                    workspaceId={workspaceId}
                    selected={transaction.counterparty ?? null}
                    onSelect={(counterparty) => {
                        if (
                            counterparty !== null &&
                            counterparty.id !== transaction.counterpartyId
                        ) {
                            mutation.mutate(counterparty.id);
                        }
                    }}
                />
                <div className="cell-actions">
                    {transaction.counterpartyId !== null && (
                        <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => mutation.mutate(null)}
                        >
                            Remove
                        </button>
                    )}
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setIsEditing(false)}
                    >
                        Cancel
                    </button>
                </div>
                {mutation.error !== null && (
                    <span className="cell-error">{mutation.error.message}</span>
                )}
            </div>
        );
    }

    return (
        <div className="cell-editable">
            <TransactionCounterpartyLabel
                transaction={transaction}
                workspaceId={workspaceId}
            />
            <button
                type="button"
                className="cell-button cell-meta"
                onClick={() => {
                    mutation.reset();
                    setIsEditing(true);
                }}
            >
                {transaction.counterpartyId !== null ? "Change" : "Assign"}
            </button>
            {mutation.error !== null && (
                <span className="cell-error">{mutation.error.message}</span>
            )}
        </div>
    );
}
