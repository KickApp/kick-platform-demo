import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformAccount, PlatformTransaction } from "@kick-demo/shared";
import { updateTransaction } from "../api/platform";
import {
    formatAccountLabel,
    groupAccountsByClass,
} from "../lib/use-entity-accounts";

const UNCATEGORIZED_VALUE = "";

/**
 * Shows the chart of accounts account a transaction is categorized to on the
 * cash basis, and lets it be changed in place. Archived accounts are hidden
 * unless one is the current assignment, which still has to be selectable so the
 * picker can show what the transaction actually points at.
 */
export function TransactionAccountCell({
    transaction,
    workspaceId,
    accounts,
    isLoadingAccounts,
}: {
    transaction: PlatformTransaction;
    workspaceId: string;
    accounts: PlatformAccount[];
    isLoadingAccounts: boolean;
}) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    const mutation = useMutation({
        mutationFn: (accountId: string | null) =>
            updateTransaction({
                workspaceId,
                transactionId: transaction.id,
                body: { accountId },
            }),
        onSuccess: async () => {
            setIsEditing(false);
            await queryClient.invalidateQueries({
                queryKey: ["transactions", workspaceId],
            });
        },
    });

    const assignedAccount =
        transaction.accountId !== null
            ? (accounts.find(
                  (account) => account.id === transaction.accountId,
              ) ?? null)
            : null;

    const selectableAccounts = accounts.filter(
        (account) =>
            !account.isDisabled || account.id === transaction.accountId,
    );

    if (mutation.isPending) {
        return <span className="cell-pending">Saving…</span>;
    }

    if (isEditing) {
        return (
            <div className="cell-editor">
                <select
                    autoFocus
                    value={transaction.accountId ?? UNCATEGORIZED_VALUE}
                    onChange={(event) =>
                        mutation.mutate(
                            event.target.value === UNCATEGORIZED_VALUE
                                ? null
                                : event.target.value,
                        )
                    }
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setIsEditing(false);
                        }
                    }}
                    onBlur={() => setIsEditing(false)}
                >
                    <option value={UNCATEGORIZED_VALUE}>Uncategorized</option>
                    {groupAccountsByClass(selectableAccounts).map((group) => (
                        <optgroup
                            key={group.accountClass}
                            label={group.accountClass}
                        >
                            {group.accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {formatAccountLabel(account)}
                                    {account.isDisabled ? " (archived)" : ""}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>
        );
    }

    return (
        <div className="cell-editable">
            <button
                type="button"
                className="cell-button"
                disabled={isLoadingAccounts}
                onClick={() => setIsEditing(true)}
            >
                {assignedAccount !== null ? (
                    formatAccountLabel(assignedAccount)
                ) : transaction.accountId !== null ? (
                    <span className="mono">{transaction.accountId}</span>
                ) : (
                    <span className="cell-placeholder">Uncategorized</span>
                )}
            </button>
            {mutation.error !== null && (
                <span className="cell-error">{mutation.error.message}</span>
            )}
        </div>
    );
}
