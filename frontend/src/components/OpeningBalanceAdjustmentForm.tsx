import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type {
    PlatformAccount,
    PlatformOpeningBalanceAdjustment,
} from "@kick-demo/shared";
import { setOpeningBalanceAdjustment } from "../api/platform";
import { formatDate } from "../lib/format";
import {
    parseNonzeroAmount,
    useInvalidateOpeningBalances,
} from "../lib/opening-balances";
import {
    ClearingAccountField,
    DEFAULT_CLEARING_ACCOUNT,
} from "./ClearingAccountField";
import { ErrorMessageBox } from "./StatusMessage";

/**
 * Creates or replaces an account's adjustment: one amount booked on the
 * bookkeeping start date, typically to true up a balance that was off when the
 * books moved to Kick. No date is sent — the only one Kick accepts is the
 * bookkeeping start date, which is also the default, and a linked bank
 * account may move it off the entity's.
 */
export function OpeningBalanceAdjustmentForm({
    entityId,
    account,
    accounts,
    bookkeepingStartDate,
    current,
    onDone,
}: {
    entityId: string;
    account: PlatformAccount;
    accounts: PlatformAccount[];
    bookkeepingStartDate: string;
    current: PlatformOpeningBalanceAdjustment | null;
    onDone: () => void;
}) {
    const invalidate = useInvalidateOpeningBalances(entityId);
    const [amount, setAmount] = useState(
        current !== null ? `${current.balance}` : "",
    );
    const [clearingAccountId, setClearingAccountId] = useState(
        current?.clearingAccountId ?? DEFAULT_CLEARING_ACCOUNT,
    );
    const [description, setDescription] = useState(current?.description ?? "");

    const balance = parseNonzeroAmount(amount);

    const mutation = useMutation({
        mutationFn: (submitted: number) => {
            const trimmedDescription = description.trim();
            return setOpeningBalanceAdjustment({
                entityId,
                accountId: account.id,
                body: {
                    balance: submitted,
                    ...(clearingAccountId !== DEFAULT_CLEARING_ACCOUNT && {
                        clearingAccountId,
                    }),
                    description:
                        trimmedDescription !== "" ? trimmedDescription : null,
                },
            });
        },
        onSuccess: async () => {
            await invalidate();
            onDone();
        },
    });

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                if (balance !== null) {
                    mutation.mutate(balance);
                }
            }}
        >
            <h3 className="form-title">
                {current !== null ? "Update" : "Set"} adjustment —{" "}
                {account.name}
            </h3>
            <p className="page-meta">
                Booked on the bookkeeping start date (
                {formatDate(`${bookkeepingStartDate}T00:00:00Z`)}, or a linked
                bank account's own start date) and independent of the main
                opening balance — an account can have one without the other.
            </p>
            <label className="field">
                <span className="field-label">Amount</span>
                <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="-42.10"
                    required
                    autoFocus
                />
                <span className="field-hint">
                    Natural sign: a positive amount increases the account, a
                    negative one decreases it.
                </span>
            </label>
            <ClearingAccountField
                accounts={accounts}
                accountId={account.id}
                value={clearingAccountId}
                onChange={setClearingAccountId}
                defaultLabel="Default — current adjustment's, then opening balance's, then retained earnings"
                hint="The offsetting side of the adjustment is booked here."
            />
            <label className="field">
                <span className="field-label">Description (optional)</span>
                <input
                    type="text"
                    value={description}
                    maxLength={500}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Reconciliation true-up"
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
                    disabled={mutation.isPending || balance === null}
                >
                    {mutation.isPending ? "Saving…" : "Save adjustment"}
                </button>
            </div>
        </form>
    );
}
