import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformAccount } from "@kick-demo/shared";
import { mergeAccounts } from "../api/platform";
import {
    formatAccountLabel,
    groupAccountsByClass,
} from "../lib/use-entity-accounts";
import { ErrorMessageBox } from "./StatusMessage";

const NONE_SELECTED = "";

function AccountOptions({ accounts }: { accounts: PlatformAccount[] }) {
    return (
        <>
            <option value={NONE_SELECTED}>Select an account…</option>
            {groupAccountsByClass(accounts).map((group) => (
                <optgroup key={group.accountClass} label={group.accountClass}>
                    {group.accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {formatAccountLabel(account)}
                        </option>
                    ))}
                </optgroup>
            ))}
        </>
    );
}

/**
 * Merges one account into another: journal entry lines, transactions and every
 * other reference move to the target, then the source is permanently deleted.
 * Which pairs Kick accepts is not visible on the wire, so every pair is
 * offered and the API's blockers are shown when it declines — same philosophy
 * as the per-row account actions.
 */
export function MergeAccountsForm({
    entityId,
    accounts,
    onDone,
}: {
    entityId: string;
    accounts: PlatformAccount[];
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [sourceAccountId, setSourceAccountId] = useState(NONE_SELECTED);
    const [targetAccountId, setTargetAccountId] = useState(NONE_SELECTED);

    const mutation = useMutation({
        mutationFn: () =>
            mergeAccounts({
                entityId,
                body: { sourceAccountId, targetAccountId },
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["chart-of-accounts", entityId],
            });
            onDone();
        },
    });

    const sourceAccount = accounts.find(
        (account) => account.id === sourceAccountId,
    );
    const targetAccount = accounts.find(
        (account) => account.id === targetAccountId,
    );

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                if (
                    sourceAccount === undefined ||
                    targetAccount === undefined
                ) {
                    return;
                }
                const confirmed = window.confirm(
                    `Merge "${sourceAccount.name}" into "${targetAccount.name}"? Everything booked to the source moves to the target, then the source account is permanently deleted.`,
                );
                if (confirmed) {
                    mutation.mutate();
                }
            }}
        >
            <h3 className="form-title">Merge accounts</h3>
            <label className="field">
                <span className="field-label">Source</span>
                <select
                    value={sourceAccountId}
                    onChange={(event) => setSourceAccountId(event.target.value)}
                    required
                    autoFocus
                >
                    <AccountOptions accounts={accounts} />
                </select>
                <span className="field-hint">
                    The account whose data moves to the target. It is
                    permanently deleted once the merge completes.
                </span>
            </label>
            <label className="field">
                <span className="field-label">Target</span>
                <select
                    value={targetAccountId}
                    onChange={(event) => setTargetAccountId(event.target.value)}
                    required
                >
                    <AccountOptions accounts={accounts} />
                </select>
                <span className="field-hint">
                    The account that survives and absorbs the source's journal
                    entry lines and transactions. Kick declines pairs it cannot
                    merge (e.g. different classes) and says why.
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
                    className="button button-danger"
                    disabled={
                        mutation.isPending ||
                        sourceAccountId === NONE_SELECTED ||
                        targetAccountId === NONE_SELECTED
                    }
                >
                    {mutation.isPending ? "Merging…" : "Merge accounts"}
                </button>
            </div>
        </form>
    );
}
