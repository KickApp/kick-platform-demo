import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformTransaction } from "@kick-demo/shared";
import { updateTransaction } from "../api/platform";

const MAX_OVERRIDE_LENGTH = 1000;

/**
 * Shows the description Kick displays for a transaction and lets its override
 * be set or cleared in place. When an override is set, the bank description it
 * replaces is shown underneath. The wire shape doesn't say which transactions
 * are lines of a split, so the edit is offered on every row: Kick answers 400
 * for those (their labels are edited in Kick) and 409 in a locked period, and
 * its message is shown under the cell.
 */
export function TransactionDescriptionCell({
    transaction,
    workspaceId,
}: {
    transaction: PlatformTransaction;
    workspaceId: string;
}) {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (overrideDescription: string | null) =>
            updateTransaction({
                workspaceId,
                transactionId: transaction.id,
                body: { overrideDescription },
            }),
        onSuccess: async () => {
            setDraft(null);
            await queryClient.invalidateQueries({
                queryKey: ["transactions", workspaceId],
            });
        },
    });

    const save = (value: string | null) => {
        const overrideDescription = value?.trim() || null;
        if (overrideDescription === transaction.overrideDescription) {
            setDraft(null);
            return;
        }
        mutation.mutate(overrideDescription);
    };

    if (mutation.isPending) {
        return <span className="cell-pending">Saving…</span>;
    }

    if (draft !== null) {
        return (
            <form
                className="cell-editor cell-editable"
                onSubmit={(event) => {
                    event.preventDefault();
                    save(draft);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        setDraft(null);
                    }
                }}
            >
                <input
                    autoFocus
                    type="text"
                    value={draft}
                    maxLength={MAX_OVERRIDE_LENGTH}
                    placeholder={transaction.bankDescription}
                    onChange={(event) => setDraft(event.target.value)}
                />
                <div className="cell-actions">
                    <button type="submit" className="button button-primary">
                        Save
                    </button>
                    {transaction.overrideDescription !== null && (
                        <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => save(null)}
                        >
                            Reset to bank description
                        </button>
                    )}
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setDraft(null)}
                    >
                        Cancel
                    </button>
                </div>
                {mutation.error !== null && (
                    <span className="cell-error">{mutation.error.message}</span>
                )}
            </form>
        );
    }

    return (
        <div className="cell-editable">
            <span>
                {transaction.description}
                {transaction.overrideDescription !== null && (
                    <span className="cell-meta">
                        Bank: {transaction.bankDescription}
                    </span>
                )}
            </span>
            <button
                type="button"
                className="cell-button cell-meta"
                onClick={() => {
                    mutation.reset();
                    setDraft(transaction.overrideDescription ?? "");
                }}
            >
                {transaction.overrideDescription !== null
                    ? "Edit override"
                    : "Override"}
            </button>
            {mutation.error !== null && (
                <span className="cell-error">{mutation.error.message}</span>
            )}
        </div>
    );
}
